const SprintCache = require('../models/SprintCache');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const jiraService = require('./jiraService');
const { GoogleGenAI } = require('@google/genai');
const { log, error } = require('../utils/logger');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────
// HELPER: Safe Gemini call with fallback
// ─────────────────────────────────────────
const callGemini = async (prompt, fallback) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: prompt
        });

        const text = response.text;
        if (!text || text.trim() === '') {
            log('⚠️ Gemini returned empty response. Using fallback.');
            return fallback;
        }

        return text.trim();
    } catch (err) {
        error('❌ Gemini call failed:', err.message);
        return fallback;
    }
};

// ─────────────────────────────────────────
// HELPER: Parse JSON from Gemini response
// ─────────────────────────────────────────
const parseGeminiJSON = (text, fallback) => {
    try {
        // Remove markdown code blocks if present
        const cleaned = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(cleaned);
    } catch (err) {
        error('❌ Failed to parse Gemini JSON:', err.message);
        return fallback;
    }
};

// ─────────────────────────────────────────
// STEP 1: Calculate team workload
// ─────────────────────────────────────────
const calculateTeamWorkload = (issues) => {
    const CAPACITY_HOURS = 40;
    const HOURS_PER_POINT = 4;
    const memberMap = {};

    // Group issues by assignee
    issues.forEach(issue => {
        if (!issue.assignee) return;

        const key = issue.assignee.accountId;
        if (!memberMap[key]) {
            memberMap[key] = {
                accountId: issue.assignee.accountId,
                name: issue.assignee.name,
                email: issue.assignee.email || '',
                totalPoints: 0,
                taskCount: 0,
                tasks: []
            };
        }

        // Only count incomplete tasks for workload
        if (issue.status !== 'Done') {
            memberMap[key].totalPoints += issue.storyPoints || 0;
            memberMap[key].taskCount += 1;
            memberMap[key].tasks.push({
                key: issue.key,
                summary: issue.summary,
                storyPoints: issue.storyPoints,
                status: issue.status,
                priority: issue.priority
            });
        }
    });

    // Calculate workload percentage for each member
    return Object.values(memberMap).map(member => {
        const hoursRequired = member.totalPoints * HOURS_PER_POINT;
        const rawPercentage = (hoursRequired / CAPACITY_HOURS) * 100;

        // displayPercentage: capped at 100 for progress bar width
        // rawPercentage: actual value for number label (e.g. 260%)
        const displayPercentage = Math.min(Math.round(rawPercentage), 100);
        const actualPercentage = Math.round(rawPercentage);

        let status = 'Optimal';
        if (rawPercentage > 100) status = 'Overloaded';
        else if (rawPercentage > 80) status = 'Warning';
        else if (rawPercentage < 30) status = 'Underloaded';

        return {
            ...member,
            workloadPercentage: displayPercentage,  // bar width (max 100)
            actualPercentage,                        // label number (can be 260%)
            rawPercentage: actualPercentage,         // kept for calculations
            status
        };
    });
};

// ─────────────────────────────────────────
// STEP 2: Calculate sprint health score
// ─────────────────────────────────────────
const calculateHealthScore = (sprintData, teamWorkload, averageVelocity) => {
    const {
        totalStoryPoints,
        completedStoryPoints,
        startDate,
        endDate,
        issues
    } = sprintData;

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalDays = Math.max(
        Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1
    );
    const daysElapsed = Math.max(
        Math.ceil((today - start) / (1000 * 60 * 60 * 24)), 1
    );

    const expectedProgress = Math.min(daysElapsed / totalDays, 1);
    const actualProgress = totalStoryPoints > 0
        ? completedStoryPoints / totalStoryPoints
        : 0;

    // ── Factor 1: Progress Score (0-40 points) ──
    // Grace period = first 20% of sprint days
    // Example: 15 day sprint → grace period = day 1 to day 3
    // During grace period team gets full progress score
    // because zero completion on early days is completely normal
    const graceThreshold = 0.20;
    let progressScore;

    if (expectedProgress <= graceThreshold) {
        // Still in grace period — full marks
        progressScore = 40;
    } else if (actualProgress >= expectedProgress) {
        // On track or ahead of schedule
        progressScore = 40;
    } else {
        // Behind schedule — penalize proportionally
        const progressRatio = expectedProgress > 0
            ? actualProgress / expectedProgress
            : 1;
        progressScore = Math.min(progressRatio * 40, 40);
    }

    // ── Factor 2: Team Health Score (0-30 points) ──
    const overloadedCount = teamWorkload.filter(
        m => m.status === 'Overloaded'
    ).length;
    const warningCount = teamWorkload.filter(
        m => m.status === 'Warning'
    ).length;
    const teamScore = Math.max(
        30 - (overloadedCount * 12) - (warningCount * 5), 0
    );

    // ── Factor 3: Risk Score (0-30 points) ──
    const blockedTasks = issues.filter(i => i.isBlocked).length;
    const overdueTasks = issues.filter(i => i.isOverdue).length;
    const riskScore = Math.max(
        30 - (blockedTasks * 8) - (overdueTasks * 6), 0
    );

    const totalScore = Math.round(
        progressScore + teamScore + riskScore
    );
    const finalScore = Math.min(Math.max(totalScore, 0), 100);

    // Adjusted thresholds — more realistic for sprint lifecycle
    let status = 'Healthy';
    if (finalScore < 40) status = 'Critical';
    else if (finalScore < 65) status = 'At Risk';

    return {
        score: finalScore,
        status,
        breakdown: {
            progressScore: Math.round(progressScore),
            teamScore: Math.round(teamScore),
            riskScore: Math.round(riskScore)
        },
        meta: {
            daysElapsed,
            totalDays,
            daysRemaining: Math.max(totalDays - daysElapsed, 0),
            expectedProgress: Math.round(expectedProgress * 100),
            actualProgress: Math.round(actualProgress * 100),
            inGracePeriod: expectedProgress <= graceThreshold
        }
    };
};

// ─────────────────────────────────────────
// STEP 3: Calculate burndown data
// ─────────────────────────────────────────
const calculateBurndown = (sprintData) => {
    const { totalStoryPoints, startDate, endDate } = sprintData;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    const totalDays = Math.ceil(
        (end - start) / (1000 * 60 * 60 * 24)
    );

    const burndownData = [];
    const pointsPerDay = totalStoryPoints / totalDays;

    for (let day = 0; day <= totalDays; day++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + day);

        // Ideal line: straight decline from total to 0
        const idealRemaining = Math.max(
            totalStoryPoints - (pointsPerDay * day), 0
        );

        // Only calculate actual for past days
        const isPast = currentDate <= today;

        burndownData.push({
            day: day,
            date: currentDate.toISOString().split('T')[0],
            label: `Day ${day + 1}`,
            ideal: Math.round(idealRemaining),
            // Actual will be calculated from completed points
            // For now based on completedStoryPoints at current day
            actual: isPast
                ? Math.max(
                    totalStoryPoints - sprintData.completedStoryPoints,
                    0
                )
                : null
        });
    }

    return burndownData;
};

// ─────────────────────────────────────────
// STEP 4: Detect top priority problems
// ─────────────────────────────────────────
const detectTopProblems = (sprintData, teamWorkload) => {
    const problems = [];

    // Check 1: Overloaded team members
    const overloaded = teamWorkload
        .filter(m => m.status === 'Overloaded' || m.status === 'Warning')
        .sort((a, b) => b.rawPercentage - a.rawPercentage);

    if (overloaded.length > 0) {
        const member = overloaded[0];
        problems.push({
            type: 'OVERLOAD',
            severity: member.rawPercentage,
            data: {
                memberName: member.name,
                workload: member.rawPercentage,
                taskCount: member.taskCount,
                totalPoints: member.totalPoints
            }
        });
    }

    // Check 2: Overdue tasks
    const overdueTasks = sprintData.issues
        .filter(i => i.isOverdue)
        .sort((a, b) => {
            const priorityOrder = {
                'Highest': 5, 'High': 4,
                'Medium': 3, 'Low': 2, 'Lowest': 1
            };
            return (priorityOrder[b.priority] || 0) -
                (priorityOrder[a.priority] || 0);
        });

    if (overdueTasks.length > 0) {
        const task = overdueTasks[0];
        const daysOverdue = task.dueDate
            ? Math.ceil(
                (new Date() - new Date(task.dueDate)) /
                (1000 * 60 * 60 * 24)
            )
            : 0;

        problems.push({
            type: 'DELAY',
            severity: daysOverdue * 10,
            data: {
                issueKey: task.key,
                summary: task.summary,
                daysOverdue,
                assignee: task.assignee?.name,
                priority: task.priority
            }
        });
    }

    // Check 3: Blocked tasks
    const blockedTasks = sprintData.issues.filter(i => i.isBlocked);
    if (blockedTasks.length > 0) {
        problems.push({
            type: 'BLOCKED',
            severity: blockedTasks.length * 15,
            data: {
                count: blockedTasks.length,
                tasks: blockedTasks.map(t => ({
                    key: t.key,
                    summary: t.summary,
                    blockedBy: t.blockedBy
                }))
            }
        });
    }

    // Sort by severity and return top 3
    return problems
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3);
};

// ─────────────────────────────────────────
// STEP 5: Generate action text using Gemini
// ─────────────────────────────────────────
const generateActionTexts = async (problems, sprintName) => {
    if (problems.length === 0) {
        return [{
            type: 'INFO',
            task: 'Sprint is on track',
            desc: 'No critical issues detected at this time.',
            priority: 'Low'
        }];
    }

    const prompt = `
You are a project management AI assistant for sprint: "${sprintName}".
Analyze these detected problems and generate short action alerts.

Problems detected:
${JSON.stringify(problems, null, 2)}

Generate a JSON array with exactly ${problems.length} items.
Each item must have these exact fields:
- type: the problem type (OVERLOAD, DELAY, BLOCKED, or INFO)
- task: short title max 8 words (mention specific name or issue key)
- desc: one action sentence max 15 words (be specific)
- priority: "High", "Medium", or "Low"

Rules:
- OVERLOAD: mention the person name and percentage
- DELAY: mention the issue key and days overdue
- BLOCKED: mention count of blocked tasks
- Be specific with numbers from the data
- No markdown, no extra text
- Return valid JSON array only

Example format:
[
  {
    "type": "OVERLOAD",
    "task": "Irtaza Manzoor is overloaded (95%)",
    "desc": "Reassign 2 tasks from WR-29 to Jawad Ali immediately.",
    "priority": "High"
  }
]
`;

    const fallback = problems.map(p => ({
        type: p.type,
        task: p.type === 'OVERLOAD'
            ? `${p.data.memberName} is overloaded (${p.data.workload}%)`
            : p.type === 'DELAY'
                ? `${p.data.issueKey} is ${p.data.daysOverdue} days overdue`
                : `${p.data.count} tasks are blocked`,
        desc: p.type === 'OVERLOAD'
            ? `Reassign tasks to reduce ${p.data.memberName}'s workload.`
            : p.type === 'DELAY'
                ? `Review blockers on ${p.data.issueKey} immediately.`
                : `Resolve blocked task dependencies now.`,
        priority: p.severity > 50 ? 'High' : 'Medium'
    }));

    const geminiText = await callGemini(prompt, null);

    if (!geminiText) return fallback;

    const parsed = parseGeminiJSON(geminiText, fallback);

    // Validate response structure
    if (!Array.isArray(parsed)) return fallback;

    return parsed.map((item, i) => ({
        type: item.type || problems[i]?.type || 'INFO',
        task: item.task || fallback[i]?.task || 'Issue detected',
        desc: item.desc || fallback[i]?.desc || 'Review sprint status.',
        priority: item.priority || 'Medium'
    }));
};

// ─────────────────────────────────────────
// MAIN: Sync sprint data to cache
// ─────────────────────────────────────────
const syncSprintCache = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw { statusCode: 400, message: 'Jira workspace not connected.' };
    }

    log(`🔄 Syncing sprint cache for user: ${userId}`);

    // Always fetch active sprint fresh
    const activeSprintData = await jiraService.fetchActiveSprintIssues(userId);
    const { sprint, issues } = activeSprintData;

    // Check existing cache
    const existingCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    // Detect sprint change
    const sprintChanged = existingCache && existingCache.activeSprint?.id !== sprint.id;

    // Fetch closed sprints only when needed
    let closedSprints;
    if (!existingCache ||
        sprintChanged ||
        !existingCache.closedSprints ||
        existingCache.closedSprints.length === 0) {

        log('🔄 Fetching closed sprints from Jira...');
        closedSprints = await jiraService.fetchClosedSprints(userId);

        // If sprint changed handle old sprint data
        if (sprintChanged) {
            log(`🔄 Sprint changed from ${existingCache.activeSprint?.id} to ${sprint.id}`);
            await handleSprintTransition(
                userId,
                config.selectedProjectKey,
                existingCache.activeSprint?.id,
                sprint.id
            );
        }
    } else {
        // Reuse existing closed sprints from cache
        closedSprints = existingCache.closedSprints;
        log('⚡ Using cached closed sprints data');
    }

    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    let inProgressStoryPoints = 0;
    let todoStoryPoints = 0;

    issues.forEach(issue => {
        const pts = issue.storyPoints || 0;
        totalStoryPoints += pts;
        if (issue.status === 'Done') completedStoryPoints += pts;
        else if (issue.statusCategory === 'indeterminate') inProgressStoryPoints += pts;
        else todoStoryPoints += pts;
    });

    const velocities = closedSprints
        .map(s => s.velocity)
        .filter(v => v > 0);

    const averageVelocity = velocities.length > 0
        ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
        : 0;

    const teamWorkload = calculateTeamWorkload(issues);
    const problems = detectTopProblems(
        { totalStoryPoints, completedStoryPoints, startDate: sprint.startDate, endDate: sprint.endDate, issues },
        teamWorkload
    );
    const topActions = await generateActionTexts(problems, sprint.name);

    const cacheData = {
        userId,
        projectKey: config.selectedProjectKey,
        activeSprint: {
            ...sprint,
            totalStoryPoints,
            completedStoryPoints,
            inProgressStoryPoints,
            todoStoryPoints,
            issues
        },
        closedSprints,
        averageVelocity,
        teamWorkload,
        topActions,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    };

    const cache = await SprintCache.findOneAndUpdate(
        { userId, projectKey: config.selectedProjectKey },
        cacheData,
        { returnDocument: 'after', upsert: true }
    );

    await WorkspaceConfig.findOneAndUpdate(
        { userId },
        { lastSyncedAt: new Date() }
    );

    log(`✅ Sprint cache synced. Sprint: ${sprint.name}`);
    return cache;
};

// ─────────────────────────────────────────
// MAIN: Get overview data (served from cache)
// ─────────────────────────────────────────
const getOverviewData = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });

    if (!config || !config.isConnected) {
        throw { statusCode: 400, message: 'Jira workspace not connected.' };
    }

    // Check if cache exists and is fresh
    let cache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    const isFresh = cache &&
        cache.expiresAt > new Date();

    if (!isFresh) {
        log('🔄 Cache expired or missing. Fetching fresh data...');
        cache = await syncSprintCache(userId);
    } else {
        log('⚡ Serving overview from cache');
    }

    const { activeSprint, teamWorkload, closedSprints, averageVelocity } = cache;

    // Calculate health score
    const healthScore = calculateHealthScore(
        activeSprint,
        teamWorkload,
        averageVelocity
    );

    // Calculate burndown
    const burndown = calculateBurndown(activeSprint);

    const topActions = cache.topActions && cache.topActions.length > 0
        ? cache.topActions
        : [{
            type: 'INFO',
            task: 'Analyzing sprint data',
            desc: 'AI actions will appear after next sync.',
            priority: 'Low'
        }];

    return {
        sprintInfo: {
            id: activeSprint.id,
            name: activeSprint.name,
            startDate: activeSprint.startDate,
            endDate: activeSprint.endDate,
            totalStoryPoints: activeSprint.totalStoryPoints,
            completedStoryPoints: activeSprint.completedStoryPoints,
            inProgressStoryPoints: activeSprint.inProgressStoryPoints,
            todoStoryPoints: activeSprint.todoStoryPoints
        },
        healthScore,
        topActions,
        teamWorkload,
        burndown,
        averageVelocity,
        historicalVelocity: closedSprints.map(s => ({
            name: s.name,
            velocity: s.velocity
        })),
        cachedAt: cache.cachedAt,
        projectKey: config.selectedProjectKey
    };
};

// ─────────────────────────────────────────
// MANUAL REFRESH: Force fresh data from Jira
// ─────────────────────────────────────────
const refreshOverviewData = async (userId) => {
    log(`🔄 Manual refresh triggered by user: ${userId}`);
    const cache = await syncSprintCache(userId);

    const config = await WorkspaceConfig.findOne({ userId });
    const { activeSprint, teamWorkload, closedSprints, averageVelocity } = cache;

    const healthScore = calculateHealthScore(
        activeSprint,
        teamWorkload,
        averageVelocity
    );

    const burndown = calculateBurndown(activeSprint);
    const topActions = cache.topActions && cache.topActions.length > 0
        ? cache.topActions
        : [{
            type: 'INFO',
            task: 'Analyzing sprint data',
            desc: 'AI actions will appear after next sync.',
            priority: 'Low'
        }];

    return {
        sprintInfo: {
            id: activeSprint.id,
            name: activeSprint.name,
            startDate: activeSprint.startDate,
            endDate: activeSprint.endDate,
            totalStoryPoints: activeSprint.totalStoryPoints,
            completedStoryPoints: activeSprint.completedStoryPoints,
            inProgressStoryPoints: activeSprint.inProgressStoryPoints,
            todoStoryPoints: activeSprint.todoStoryPoints
        },
        healthScore,
        topActions,
        teamWorkload,
        burndown,
        averageVelocity,
        historicalVelocity: closedSprints.map(s => ({
            name: s.name,
            velocity: s.velocity
        })),
        cachedAt: cache.cachedAt,
        projectKey: config.selectedProjectKey,
        refreshed: true
    };
};

// ─────────────────────────────────────────
// Handle sprint transition — archive old data
// ─────────────────────────────────────────
const handleSprintTransition = async (
    userId,
    projectKey,
    oldSprintId,
    newSprintId
) => {
    log(`🔄 Handling sprint transition: ${oldSprintId} → ${newSprintId}`);

    const Suggestion = require('../models/Suggestion');
    const Alert = require('../models/Alert');
    const AgentLog = require('../models/AgentLog');

    // Archive old sprint suggestions
    // Mark all PENDING suggestions as IGNORED
    // They belong to old sprint — no longer relevant
    await Suggestion.updateMany(
        {
            userId,
            projectKey,
            sprintId: oldSprintId,
            status: 'PENDING'
        },
        {
            status: 'IGNORED',
            ignoredBy: 'System',
            ignoredAt: new Date(),
            ignoreReason: 'Sprint completed — auto-archived'
        }
    );

    // Resolve all active alerts from old sprint
    await Alert.updateMany(
        {
            userId,
            projectKey,
            status: 'ACTIVE',
            alertKey: { $regex: `_${oldSprintId}$` }
        },
        {
            status: 'RESOLVED',
            resolvedBy: 'System',
            resolvedAt: new Date()
        }
    );

    // Log the transition
    const { logAgentActivity } = require('./monitoringService');
    await logAgentActivity(
        userId,
        `Sprint transition detected. Sprint ${oldSprintId} archived. Starting fresh analysis for new sprint.`,
        'SYNC'
    );

    log(`✅ Sprint transition complete. Old data archived.`);
};

module.exports = {
    syncSprintCache,
    getOverviewData,
    refreshOverviewData,
    calculateTeamWorkload,
    calculateHealthScore,
    calculateBurndown,
    detectTopProblems
};