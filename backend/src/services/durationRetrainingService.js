const SprintPlan = require('../models/SprintPlan');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const jiraService = require('./jiraService');
const { log, error } = require('../utils/logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ─────────────────────────────────────────
// HELPER: Task type detection
// mirrors sprintPlannerService.js
// ─────────────────────────────────────────
const detectTaskType = (title = '') => {
    const t = title.toLowerCase();
    const backend = [
        'api', 'backend', 'database', 'migration', 'server',
        'endpoint', 'auth', 'security', 'cache', 'service',
        'engine', 'calculator', 'sync', 'schema'
    ];
    const frontend = [
        'ui', 'frontend', 'design', 'responsive', 'layout',
        'component', 'page', 'dashboard', 'interface', 'css',
        'html', 'react', 'widget', 'form', 'modal'
    ];
    const testing = [
        'test', 'testing', 'qa', 'quality', 'e2e', 'spec'
    ];

    if (testing.some(k => t.includes(k))) return 'testing';
    if (backend.some(k => t.includes(k))) return 'backend';
    if (frontend.some(k => t.includes(k))) return 'frontend';
    return 'general';
};

const TYPE_NUMERIC = {
    backend: 0, frontend: 1, testing: 2, devops: 3, general: 4
};
const PRIORITY_NUMERIC = {
    Highest: 5, High: 4, Medium: 3, Low: 2, Lowest: 1
};

// ─────────────────────────────────────────
// HELPER: Call FastAPI ML service
// ─────────────────────────────────────────
const callMLService = async (endpoint, body) => {
    try {
        const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ML service error: ${response.status} ${errText}`);
        }
        return await response.json();
    } catch (err) {
        error(`❌ ML service call failed (${endpoint}):`, err.message);
        return null;
    }
};

// ─────────────────────────────────────────
// PATH 1: Sprint was planned using our tool
// Fetch actual data and update SprintPlan
// ─────────────────────────────────────────
const collectFromPlannedSprint = async (sprintPlan, userId) => {
    log(`📊 Collecting actual data from planned sprint: ${sprintPlan.sprintName}`);

    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) return [];

    let client;
    try {
        const jiraClient = await jiraService.getJiraClientForUser(userId);
        client = jiraClient.client;
    } catch (err) {
        error('Cannot get Jira client for retraining:', err.message);
        return [];
    }

    const newSamples = [];
    const updatedTasks = [];

    for (const task of sprintPlan.tasks) {
        if (!task.jiraKey) {
            updatedTasks.push(task.toObject ? task.toObject() : task);
            continue;
        }

        try {
            const issueRes = await client.get(
                `/rest/api/3/issue/${task.jiraKey}` +
                `?fields=status,created,resolutiondate,${config.storyPointsField}`
            );

            const fields = issueRes.data.fields;
            const isDone = fields.status?.statusCategory?.key === 'done';
            const createdDate = new Date(fields.created);
            const resolvedDate = fields.resolutiondate
                ? new Date(fields.resolutiondate)
                : null;

            let actualDays = null;
            if (isDone && resolvedDate) {
                actualDays = Math.max(
                    Math.ceil(
                        (resolvedDate - createdDate) / (1000 * 60 * 60 * 24)
                    ),
                    0.5
                );
            }

            const taskObj = task.toObject ? task.toObject() : { ...task };
            updatedTasks.push({
                ...taskObj,
                actualDays,
                wasCompleted: isDone
            });

            // Only use completed tasks with real duration for training
            if (isDone && actualDays && actualDays > 0) {
                const taskType = task.taskType || detectTaskType(task.title);
                newSamples.push({
                    task_type_numeric: TYPE_NUMERIC[taskType] ?? 4,
                    priority_numeric: PRIORITY_NUMERIC[task.priority] ?? 3,
                    story_points: task.storyPoints || 5,
                    word_count: task.title
                        ? task.title.split(' ').length
                        : 5,
                    actual_days: actualDays
                });
            }
        } catch (issueErr) {
            error(
                `Warning: Could not fetch ${task.jiraKey}:`,
                issueErr.message
            );
            const taskObj = task.toObject ? task.toObject() : { ...task };
            updatedTasks.push(taskObj);
        }
    }

    // Update SprintPlan in MongoDB with actual outcomes
    const completedTasks = updatedTasks.filter(t => t.wasCompleted);
    const actualVelocity = completedTasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0), 0
    );
    const completionPct = Math.round(
        (completedTasks.length / Math.max(updatedTasks.length, 1)) * 100
    );

    let sprintOutcome = 'FAILED';
    if (actualVelocity >= sprintPlan.totalPlannedPoints * 0.9)
        sprintOutcome = 'SUCCESS';
    else if (actualVelocity >= sprintPlan.totalPlannedPoints * 0.7)
        sprintOutcome = 'PARTIAL';

    await SprintPlan.findByIdAndUpdate(sprintPlan._id, {
        tasks: updatedTasks,
        status: 'COMPLETED',
        actualVelocity,
        actualCompletionPct: completionPct,
        sprintOutcome,
        completedAt: new Date()
    });

    log(
        `✅ SprintPlan updated: ${completedTasks.length}/${updatedTasks.length}` +
        ` tasks completed, velocity: ${actualVelocity}`
    );

    return newSamples;
};

// ─────────────────────────────────────────
// PATH 2: Sprint was NOT planned by our tool
// Fetch directly from Jira issues
// ─────────────────────────────────────────
const collectFromJiraDirectly = async (userId, completedSprintId) => {
    log(`📊 Collecting data directly from Jira sprint: ${completedSprintId}`);

    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) return [];

    let client;
    try {
        const jiraClient = await jiraService.getJiraClientForUser(userId);
        client = jiraClient.client;
    } catch (err) {
        error('Cannot get Jira client:', err.message);
        return [];
    }

    try {
        // Fetch all issues from the completed sprint
        const issuesRes = await client.get(
            `/rest/agile/1.0/sprint/${completedSprintId}/issue` +
            `?maxResults=100&fields=summary,status,created,resolutiondate,` +
            `priority,${config.storyPointsField}`
        );

        const issues = issuesRes.data.issues || [];
        const newSamples = [];

        for (const issue of issues) {
            const fields = issue.fields;
            const isDone = fields.status?.statusCategory?.key === 'done';

            if (!isDone) continue;

            const createdDate = new Date(fields.created);
            const resolvedDate = fields.resolutiondate
                ? new Date(fields.resolutiondate)
                : null;

            if (!resolvedDate) continue;

            const actualDays = Math.max(
                Math.ceil(
                    (resolvedDate - createdDate) / (1000 * 60 * 60 * 24)
                ),
                0.5
            );

            if (actualDays <= 0 || actualDays > 30) continue;

            const title = fields.summary || '';
            const taskType = detectTaskType(title);
            const priority = fields.priority?.name || 'Medium';
            const storyPoints = fields[config.storyPointsField] || 5;

            newSamples.push({
                task_type_numeric: TYPE_NUMERIC[taskType] ?? 4,
                priority_numeric: PRIORITY_NUMERIC[priority] ?? 3,
                story_points: storyPoints,
                word_count: title.split(' ').length,
                actual_days: actualDays
            });
        }

        log(
            `✅ Collected ${newSamples.length} training samples` +
            ` from Jira sprint ${completedSprintId}`
        );
        return newSamples;

    } catch (err) {
        error('Error fetching Jira sprint issues:', err.message);
        return [];
    }
};

// ─────────────────────────────────────────
// MAIN: Called from handleSprintTransition
// Orchestrates the entire retraining pipeline
// ─────────────────────────────────────────
const captureAndRetrain = async (userId, completedSprintId) => {
    log(`🔄 Starting duration model retraining pipeline...`);
    log(`   User: ${userId}, Sprint: ${completedSprintId}`);

    try {
        let trainingData = [];

        // Check if this sprint was planned by our tool
        const sprintPlan = await SprintPlan.findOne({
            userId,
            jiraSprintId: completedSprintId,
            status: { $in: ['PUSHED_TO_JIRA', 'ACTIVE'] }
        });

        if (sprintPlan) {
            log(`✅ Found SprintPlan — using planned sprint data`);
            trainingData = await collectFromPlannedSprint(sprintPlan, userId);
        } else {
            log(`⚠️ No SprintPlan found — fetching from Jira directly`);
            trainingData = await collectFromJiraDirectly(
                userId, completedSprintId
            );
        }

        if (trainingData.length === 0) {
            log('⚠️ No training samples collected. Skipping retraining.');
            return;
        }

        log(`📊 Collected ${trainingData.length} real training samples`);

        // Determine if user has enough data for personal model
        const completedPlansCount = await SprintPlan.countDocuments({
            userId,
            status: 'COMPLETED'
        });

        // Also count Jira sprints as proxy if no SprintPlans exist
        const hasEnoughForPersonal =
            completedPlansCount >= 3 ||
            trainingData.length >= 2;

        const retrainBody = {
            new_samples: trainingData,
            user_id: userId.toString(),
            create_personal_model: hasEnoughForPersonal
        };

        log(
            `🧠 Sending to ML service — ` +
            `personal model: ${hasEnoughForPersonal}`
        );

        const result = await callMLService('/retrain-duration', retrainBody);

        if (result?.success) {
            log(
                `✅ Duration model retrained successfully!` +
                ` New MAE: ${result.new_mae} days` +
                ` (${result.model_type} model)`
            );
            log(
                `   Total training samples: ${result.total_training_samples}`
            );
        } else {
            error('⚠️ Retraining response was unsuccessful:', result);
        }

    } catch (err) {
        // Never crash the sprint transition
        error(
            '⚠️ Duration retraining failed (non-critical):',
            err.message
        );
    }
};

module.exports = {
    captureAndRetrain,
    collectFromPlannedSprint,
    collectFromJiraDirectly
};