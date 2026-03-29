const WorkspaceConfig = require('../models/WorkspaceConfig');
const SprintCache = require('../models/SprintCache');
const jiraService = require('./jiraService');
const { log, error } = require('../utils/logger');
const SprintPlan = require('../models/SprintPlan');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ─────────────────────────────────────────
// HELPER: Call ML service with timeout
// ─────────────────────────────────────────
const callML = async (endpoint, body) => {
    try {
        const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error(`ML returned ${response.status}`);
        return await response.json();
    } catch (err) {
        error(`❌ ML call to ${endpoint} failed:`, err.message);
        return null;
    }
};

// ─────────────────────────────────────────
// HELPER: Detect task type from title
// (mirrors roleSkills.js)
// ─────────────────────────────────────────
const detectTaskType = (title) => {
    const t = (title || '').toLowerCase();
    const backend = ['api', 'backend', 'database', 'migration', 'server',
        'endpoint', 'auth', 'security', 'cache', 'service', 'engine',
        'calculator', 'sync', 'schema'];
    const frontend = ['ui', 'frontend', 'design', 'responsive', 'layout',
        'component', 'page', 'dashboard', 'interface', 'css', 'html',
        'react', 'widget', 'form', 'modal'];
    const testing = ['test', 'testing', 'qa', 'quality', 'e2e', 'spec'];

    if (testing.some(k => t.includes(k))) return 'testing';
    if (backend.some(k => t.includes(k))) return 'backend';
    if (frontend.some(k => t.includes(k))) return 'frontend';
    return 'general';
};

// ─────────────────────────────────────────
// HELPER: Find best assignee for task
// ─────────────────────────────────────────
const findBestAssignee = (
    taskType,
    teamMembers,
    currentAssignments
) => {
    const { canMemberDoTask } = require('../utils/roleSkills');

    // Count current points per member
    const memberPoints = {};
    teamMembers.forEach(m => {
        memberPoints[m.accountId] = 0;
    });

    currentAssignments.forEach(task => {
        if (task.assigneeId && memberPoints[task.assigneeId] !== undefined) {
            memberPoints[task.assigneeId] += task.storyPoints || 0;
        }
    });

    const CAPACITY_HOURS = 40;
    const HOURS_PER_POINT = 4;

    // Find eligible and available members
    const eligible = teamMembers.filter(member => {
        const skills = member.skills || [];
        return canMemberDoTask(skills, taskType);
    });

    if (eligible.length === 0) return teamMembers[0] || null;

    // Pick most available eligible member
    const sorted = eligible.sort((a, b) => {
        const aWorkload = (memberPoints[a.accountId] * HOURS_PER_POINT / CAPACITY_HOURS);
        const bWorkload = (memberPoints[b.accountId] * HOURS_PER_POINT / CAPACITY_HOURS);
        return aWorkload - bWorkload;
    });

    const best = sorted[0];
    const workloadPercent = Math.round(
        (memberPoints[best.accountId] * HOURS_PER_POINT / CAPACITY_HOURS) * 100
    );

    // Calculate skill match
    const taskSkillMap = {
        backend: ['backend', 'api', 'database', 'fullstack'],
        frontend: ['frontend', 'ui', 'fullstack'],
        testing: ['testing', 'qa'],
        general: ['general']
    };
    const requiredSkills = taskSkillMap[taskType] || ['general'];
    const memberSkills = best.skills || [];
    const matchCount = requiredSkills.filter(s => memberSkills.includes(s)).length;
    const skillMatch = Math.round((matchCount / requiredSkills.length) * 100);

    return {
        accountId: best.accountId,
        name: best.name,
        role: best.role,
        currentWorkloadPercent: workloadPercent,
        skillMatch,
        alternatives: sorted.slice(1, 3).map(m => ({
            accountId: m.accountId,
            name: m.name,
            role: m.role,
            workload: Math.round(
                (memberPoints[m.accountId] * HOURS_PER_POINT / CAPACITY_HOURS) * 100
            )
        }))
    };
};

// ─────────────────────────────────────────
// HELPER: Detect circular dependencies
// ─────────────────────────────────────────
const detectCircularDependency = (tasks, newTaskId, dependsOnId) => {
    const buildGraph = () => {
        const graph = {};
        tasks.forEach(t => {
            graph[t.tempId] = t.dependsOn || [];
        });
        return graph;
    };

    const graph = buildGraph();
    graph[newTaskId] = [...(graph[newTaskId] || []), dependsOnId];

    // DFS to find cycle
    const visited = new Set();
    const stack = new Set();

    const hasCycle = (node) => {
        if (stack.has(node)) return true;
        if (visited.has(node)) return false;
        visited.add(node);
        stack.add(node);
        for (const neighbor of (graph[node] || [])) {
            if (hasCycle(neighbor)) return true;
        }
        stack.delete(node);
        return false;
    };

    return hasCycle(newTaskId);
};

// ─────────────────────────────────────────
// HELPER: Calculate due dates with dependencies
// ─────────────────────────────────────────
const calculateDueDates = (tasks, sprintStartDate, plannedDurationDays) => {
    const start = new Date(sprintStartDate);
    const tasksWithDates = [];
    const dateMap = {};

    // Topological sort (tasks with no dependencies first)
    const sorted = [...tasks].sort((a, b) => {
        const aDeps = a.dependsOn ? a.dependsOn.length : 0;
        const bDeps = b.dependsOn ? b.dependsOn.length : 0;
        return aDeps - bDeps;
    });

    sorted.forEach(task => {
        let startDay = 0;

        // If task has dependencies, start after all deps complete
        if (task.dependsOn && task.dependsOn.length > 0) {
            const maxDepEndDay = Math.max(
                ...task.dependsOn.map(depId => {
                    const dep = dateMap[depId];
                    return dep ? dep.endDay : 0;
                })
            );
            startDay = maxDepEndDay;
        }

        const endDay = startDay + Math.ceil(task.estimatedDays || 3);

        const dueDate = new Date(start);
        dueDate.setDate(start.getDate() + endDay);

        // Cap at sprint end
        const sprintEnd = new Date(start);
        sprintEnd.setDate(start.getDate() + plannedDurationDays);
        if (dueDate > sprintEnd) dueDate.setTime(sprintEnd.getTime());

        dateMap[task.tempId] = { endDay };
        tasksWithDates.push({
            ...task,
            suggestedStartDay: startDay,
            suggestedEndDay: endDay,
            suggestedDueDate: dueDate.toISOString().split('T')[0]
        });
    });

    return tasksWithDates;
};

// ─────────────────────────────────────────
// MAIN: Estimate a single task
// ─────────────────────────────────────────
const estimateTask = async (taskData) => {
    const {
        title,
        description = '',
        priority = 'Medium',
        storyPoints = 5
    } = taskData;

    const taskType = detectTaskType(title + ' ' + description);

    // Call ML service for duration prediction
    const mlResult = await callML('/estimate-duration', {
        title,
        task_type: taskType,
        priority,
        story_points: storyPoints
    });

    if (mlResult) {
        return {
            taskType,
            estimatedDays: mlResult.predicted_days,
            confidenceLow: mlResult.confidence_low,
            confidenceHigh: mlResult.confidence_high,
            suggestedStoryPoints: mlResult.suggested_story_points,
            interpretation: mlResult.interpretation,
            source: 'ml_model'
        };
    }

    // Fallback: rule-based estimation
    const baseDays = {
        backend: 4.5, frontend: 3.2, testing: 2.1, general: 2.8
    };
    const priorityMult = {
        Highest: 0.85, High: 0.92, Medium: 1.0, Low: 1.12, Lowest: 1.2
    };
    const pointsMult = { 1: 0.7, 2: 0.85, 3: 1.0, 5: 1.2, 8: 1.6, 13: 2.2 };

    const base = baseDays[taskType] || 2.8;
    const pMult = priorityMult[priority] || 1.0;
    const closest = Object.keys(pointsMult).reduce((prev, curr) =>
        Math.abs(curr - storyPoints) < Math.abs(prev - storyPoints) ? curr : prev
    );
    const ptMult = pointsMult[closest] || 1.0;
    const estimated = Math.round(base * pMult * ptMult * 10) / 10;

    return {
        taskType,
        estimatedDays: estimated,
        confidenceLow: Math.max(0.5, estimated - 1.2),
        confidenceHigh: estimated + 1.2,
        suggestedStoryPoints: storyPoints,
        interpretation: `Estimated ${estimated} days (rule-based fallback)`,
        source: 'rule_based'
    };
};

// ─────────────────────────────────────────
// MAIN: Plan a full sprint
// ─────────────────────────────────────────
const planSprint = async (userId, planData) => {
    const {
        sprintName,
        sprintGoal = '',
        plannedDurationDays = 14,
        tasks
    } = planData;

    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw { statusCode: 400, message: 'Jira workspace not connected.' };
    }

    const teamMembers = config.teamMembers || [];
    if (teamMembers.length === 0) {
        throw {
            statusCode: 400,
            message: 'Team roles not configured. Please set up team roles first.'
        };
    }

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    const averageVelocity = sprintCache?.averageVelocity || 46;

    // Process each task
    const processedTasks = [];
    let totalEstimatedDays = 0;
    let totalPoints = 0;

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Get ML duration estimate
        const estimate = await estimateTask(task);

        // Assign best team member
        const assignee = findBestAssignee(
            estimate.taskType,
            teamMembers,
            processedTasks
        );

        const processedTask = {
            tempId: task.tempId || `task_${i}`,
            title: task.title,
            description: task.description || '',
            taskType: estimate.taskType,
            priority: task.priority || 'Medium',
            storyPoints: task.storyPoints || estimate.suggestedStoryPoints,
            estimatedDays: estimate.estimatedDays,
            confidenceLow: estimate.confidenceLow,
            confidenceHigh: estimate.confidenceHigh,
            assignee,
            assigneeId: assignee?.accountId,
            dependsOn: task.dependsOn || [],
            estimationSource: estimate.source
        };

        processedTasks.push(processedTask);
        totalEstimatedDays += estimate.estimatedDays;
        totalPoints += processedTask.storyPoints;
    }

    // Calculate due dates respecting dependencies
    // Use sprint end date + 1 day as the start for new sprint planning
    const currentSprintEnd = sprintCache?.activeSprint?.endDate
        ? new Date(sprintCache.activeSprint.endDate)
        : new Date();

    // Start new sprint the day after current sprint ends
    const newSprintStart = new Date(currentSprintEnd);
    newSprintStart.setDate(newSprintStart.getDate() + 1);
    const sprintStartDate = newSprintStart.toISOString();
    const tasksWithDates = calculateDueDates(
        processedTasks,
        sprintStartDate,
        plannedDurationDays
    );

    // Calculate sprint success prediction
    const velocityRatio = averageVelocity > 0
        ? Math.min(totalPoints / averageVelocity, 3.0)
        : 1.0;

    // Workload analysis
    const workloadByMember = {};
    tasksWithDates.forEach(task => {
        const id = task.assigneeId;
        if (id) {
            if (!workloadByMember[id]) {
                workloadByMember[id] = {
                    name: task.assignee?.name,
                    points: 0,
                    taskCount: 0
                };
            }
            workloadByMember[id].points += task.storyPoints;
            workloadByMember[id].taskCount += 1;
        }
    });

    const CAPACITY = 40;
    const HOURS_PER_PT = 4;
    const workloadSummary = Object.values(workloadByMember).map(m => ({
        name: m.name,
        points: m.points,
        taskCount: m.taskCount,
        workloadPercent: Math.round(
            (m.points * HOURS_PER_PT / CAPACITY) * 100
        ),
        status: (m.points * HOURS_PER_PT / CAPACITY) > 1.0
            ? 'Overloaded'
            : 'Optimal'
    }));

    const overloadedCount = workloadSummary.filter(
        m => m.status === 'Overloaded'
    ).length;

    // Rough success estimate
    const successEstimate = Math.min(
        Math.max(
            Math.round(
                (Math.min(averageVelocity / Math.max(totalPoints, 1), 1) * 50) +
                ((teamMembers.length - overloadedCount) /
                    Math.max(teamMembers.length, 1)) * 30 +
                20
            ),
            10
        ),
        90
    );

    const warnings = [];
    if (totalPoints > averageVelocity * 1.3) {
        warnings.push({
            type: 'OVERCOMMIT',
            message: `Sprint has ${totalPoints} points but team avg velocity is ${averageVelocity}. Consider removing ${totalPoints - averageVelocity} points.`
        });
    }
    if (overloadedCount > 0) {
        warnings.push({
            type: 'WORKLOAD',
            message: `${overloadedCount} team member(s) will be overloaded. Rebalance assignments.`
        });
    }

    return {
        sprintName,
        sprintGoal,
        plannedDurationDays,
        tasks: tasksWithDates,
        summary: {
            totalTasks: tasksWithDates.length,
            totalPoints,
            totalEstimatedDays: Math.round(totalEstimatedDays * 10) / 10,
            averageVelocity,
            estimatedSuccessProbability: successEstimate,
            workloadByMember: workloadSummary,
            warnings
        }
    };
};

// ─────────────────────────────────────────
// MAIN: Create sprint in Jira
// ─────────────────────────────────────────
const createSprintInJira = async (userId, planData) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw { statusCode: 400, message: 'Jira not connected.' };
    }

    const {
        sprintName,
        sprintGoal,
        plannedDurationDays,
        tasks
    } = planData;

    const { client } = await jiraService.getJiraClientForUser(userId);

    // ─────────────────────────────────────────
    // Step 1: Create sprint as FUTURE
    // Uses originBoardId (correct Jira API field)
    // ─────────────────────────────────────────
    log('Creating sprint in Jira as FUTURE state...');

    const sprintBody = {
        name: sprintName,
        originBoardId: config.selectedBoardId  // ← originBoardId not boardId
    };

    // Only add goal if non-empty
    if (sprintGoal && sprintGoal.trim()) {
        sprintBody.goal = sprintGoal.trim();
    }

    let newSprintId;
    try {
        const sprintRes = await client.post('/rest/agile/1.0/sprint', sprintBody);
        newSprintId = sprintRes.data.id;
        log(`Sprint created: ${sprintName} (ID: ${newSprintId})`);
    } catch (sprintErr) {
        // Log exact Jira error for debugging
        error('Jira sprint creation error:', JSON.stringify(sprintErr.response?.data));
        throw {
            statusCode: 400,
            message: `Failed to create sprint in Jira: ${JSON.stringify(sprintErr.response?.data?.errors || sprintErr.response?.data?.message || sprintErr.message)}`
        };
    }

    // ─────────────────────────────────────────
    // Step 2: Create all tasks as Jira issues
    // ─────────────────────────────────────────
    const createdIssues = [];
    const issueKeyMap = {};

    for (const task of tasks) {
        const issueFields = {
            project: { key: config.selectedProjectKey },
            summary: task.title,
            issuetype: { name: 'Story' },
            priority: { name: task.priority || 'Medium' },
            [config.storyPointsField]: task.storyPoints || 5
        };

        // Only add description if content exists
        if (task.description && task.description.trim()) {
            issueFields.description = {
                type: 'doc',
                version: 1,
                content: [{
                    type: 'paragraph',
                    content: [{
                        type: 'text',
                        text: task.description.trim()
                    }]
                }]
            };
        }

        // Only add duedate if it exists
        if (task.suggestedDueDate) {
            issueFields.duedate = task.suggestedDueDate;
        }

        // Only add assignee if accountId exists
        if (task.assigneeId) {
            issueFields.assignee = { accountId: task.assigneeId };
        }

        try {
            const issueRes = await client.post('/rest/api/3/issue', {
                fields: issueFields
            });
            const issueKey = issueRes.data.key;
            issueKeyMap[task.tempId] = issueKey;
            createdIssues.push({
                tempId: task.tempId,
                jiraKey: issueKey,
                title: task.title
            });
            log(`Issue created: ${issueKey} - ${task.title}`);
        } catch (issueErr) {
            error('Jira issue creation error:', JSON.stringify(issueErr.response?.data));
            // Continue creating other issues even if one fails
            log(`Warning: Could not create issue for task "${task.title}"`);
        }
    }

    if (createdIssues.length === 0) {
        throw {
            statusCode: 500,
            message: 'Sprint was created but no issues could be added.'
        };
    }

    // ─────────────────────────────────────────
    // Step 3: Add all issues to sprint
    // ─────────────────────────────────────────
    const issueKeys = createdIssues.map(i => i.jiraKey);
    try {
        await client.post(
            `/rest/agile/1.0/sprint/${newSprintId}/issue`,
            { issues: issueKeys }
        );
        log(`${issueKeys.length} issues added to sprint ${newSprintId}`);
    } catch (addErr) {
        error('Error adding issues to sprint:', JSON.stringify(addErr.response?.data));
    }

    // ─────────────────────────────────────────
    // Step 4: Create dependency links
    // ─────────────────────────────────────────
    let dependenciesCreated = 0;
    for (const task of tasks) {
        if (task.dependsOn && task.dependsOn.length > 0) {
            const blockingIssueKey = issueKeyMap[task.tempId];
            for (const depTempId of task.dependsOn) {
                const blockedIssueKey = issueKeyMap[depTempId];
                if (blockedIssueKey && blockingIssueKey) {
                    try {
                        await client.post('/rest/api/3/issueLink', {
                            type: { name: 'Blocks' },
                            inwardIssue: { key: blockedIssueKey },
                            outwardIssue: { key: blockingIssueKey }
                        });
                        dependenciesCreated++;
                    } catch (linkErr) {
                        error('Warning: Could not create link:', linkErr.message);
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────
    // Step 5: Save plan to MongoDB
    // ─────────────────────────────────────────
    try {
        const SprintPlan = require('../models/SprintPlan');
        const sprintCache = await SprintCache.findOne({
            userId,
            projectKey: config.selectedProjectKey
        });

        await SprintPlan.create({
            userId,
            projectKey: config.selectedProjectKey,
            sprintName,
            sprintGoal: sprintGoal || '',
            plannedDurationDays,
            jiraSprintId: newSprintId,
            status: 'PUSHED_TO_JIRA',
            tasks: tasks.map(task => ({
                tempId: task.tempId,
                jiraKey: issueKeyMap[task.tempId] || null,
                title: task.title,
                description: task.description || '',
                taskType: task.taskType || 'general',
                priority: task.priority || 'Medium',
                storyPoints: task.storyPoints || 5,
                predictedDays: task.estimatedDays || null,
                confidenceLow: task.confidenceLow || null,
                confidenceHigh: task.confidenceHigh || null,
                estimationSource: task.estimationSource || 'ml_model',
                suggestedAssigneeId: task.assigneeId || null,
                suggestedAssigneeName: task.assignee?.name || null,
                suggestedDueDate: task.suggestedDueDate || null,
                dependsOn: task.dependsOn || []
            })),
            totalPlannedPoints: tasks.reduce(
                (s, t) => s + (t.storyPoints || 0), 0
            ),
            totalEstimatedDays: tasks.reduce(
                (s, t) => s + (t.estimatedDays || 0), 0
            ),
            averageVelocityAtPlanning: sprintCache?.averageVelocity || 0,
            pushedToJiraAt: new Date()
        });
        log('Sprint plan saved to MongoDB for future ML retraining');
    } catch (saveErr) {
        error('Warning: Could not save sprint plan to MongoDB:', saveErr.message);
    }

    log(`Sprint push complete. ${dependenciesCreated} dependencies created.`);

    return {
        sprintId: newSprintId,
        sprintName,
        sprintState: 'FUTURE',
        issuesCreated: createdIssues.length,
        dependenciesCreated,
        issues: createdIssues,
        jiraUrl: `https://${config.jiraDomain}/jira/software/projects/${config.selectedProjectKey}/boards`
    };
};

module.exports = {
    estimateTask,
    planSprint,
    createSprintInJira,
    detectCircularDependency
};