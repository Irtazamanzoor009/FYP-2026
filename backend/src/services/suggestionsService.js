const Suggestion = require('../models/Suggestion');
const DecisionLog = require('../models/DecisionLog');
const SprintCache = require('../models/SprintCache');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const jiraService = require('./jiraService');
const { GoogleGenAI } = require('@google/genai');
const { log, error } = require('../utils/logger');
const { detectTaskType, canMemberDoTask } = require('../utils/roleSkills');

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
// HELPER: Get cache for user
// ─────────────────────────────────────────
const getUserCache = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw {
            statusCode: 400,
            message: 'Jira workspace not connected.'
        };
    }

    const cache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    if (!cache) {
        throw {
            statusCode: 404,
            message: 'No sprint data found. Please refresh your data first.'
        };
    }

    return { cache, config };
};

// ─────────────────────────────────────────
// STEP 1: Detect suggestion triggers
// ─────────────────────────────────────────
const detectTriggers = async (cache, userId) => {
    const triggers = [];
    const { activeSprint, teamWorkload } = cache;
    const issues = activeSprint.issues;

    // Get team roles from WorkspaceConfig for role-based assignment
    const config = await WorkspaceConfig.findOne({ userId });
    const teamRoles = config?.teamMembers || [];

    // ── Trigger 1: Overloaded team members ──
    const overloadedMembers = teamWorkload.filter(
        m => m.status === 'Overloaded'
    );

    overloadedMembers.forEach(member => {
        // Find the highest priority incomplete task to reassign
        const taskToReassign = member.tasks
            .sort((a, b) => {
                const order = {
                    'Highest': 5, 'High': 4,
                    'Medium': 3, 'Low': 2, 'Lowest': 1
                };
                return (order[b.priority] || 0) -
                    (order[a.priority] || 0);
            })[0];

        if (!taskToReassign) return;

        // Detect task type from summary keywords
        const taskType = detectTaskType(taskToReassign);

        // Find underloaded member who is role-compatible
        const underloaded = teamWorkload.filter(m => {
            // Must be below 70% workload
            if (m.workloadPercentage >= 70) return false;
            // Cannot reassign to same person
            if (m.accountId === member.accountId) return false;

            // Check role compatibility
            const memberRoleConfig = teamRoles.find(
                r => r.accountId === m.accountId
            );
            const memberSkills = memberRoleConfig?.skills || [];

            // If no roles configured → assume anyone can do anything
            // If roles configured → check compatibility
            return canMemberDoTask(memberSkills, taskType);
        });

        if (underloaded.length > 0) {
            // Pick the most underloaded compatible member
            const bestMatch = underloaded.sort(
                (a, b) => a.workloadPercentage - b.workloadPercentage
            )[0];

            triggers.push({
                type: 'TASK_REASSIGN',
                priority: member.rawPercentage > 120
                    ? 'URGENT'
                    : 'SOON',
                data: {
                    fromMember: {
                        accountId: member.accountId,
                        name: member.name,
                        workload: member.rawPercentage,
                        totalPoints: member.totalPoints
                    },
                    toMember: {
                        accountId: bestMatch.accountId,
                        name: bestMatch.name,
                        workload: bestMatch.workloadPercentage
                    },
                    task: taskToReassign,
                    taskType,
                    blockedTasksCount: issues.filter(
                        i => i.isBlocked
                    ).length,
                    roleCompatible: true
                }
            });
        }
    });

    // ── Trigger 2: Velocity drop — suggest deadline buffer ──
    const today = new Date();
    const sprintEnd = new Date(activeSprint.endDate);
    const sprintStart = new Date(activeSprint.startDate);
    const totalDays = Math.ceil(
        (sprintEnd - sprintStart) / (1000 * 60 * 60 * 24)
    );
    const daysLeft = Math.max(
        Math.ceil((sprintEnd - today) / (1000 * 60 * 60 * 24)), 0
    );
    const daysElapsed = totalDays - daysLeft;

    if (daysElapsed > 0 && daysLeft > 0) {
        const currentVelocity = daysElapsed > 0
            ? activeSprint.completedStoryPoints / daysElapsed
            : 0;
        const requiredVelocity = daysLeft > 0
            ? (activeSprint.totalStoryPoints -
                activeSprint.completedStoryPoints) / daysLeft
            : 999;

        const velocityGap = requiredVelocity > 0
            ? (requiredVelocity - currentVelocity) / requiredVelocity
            : 0;

        if (velocityGap > 0.3) {
            triggers.push({
                type: 'DEADLINE_BUFFER',
                priority: velocityGap > 0.6 ? 'URGENT' : 'SOON',
                data: {
                    sprintName: activeSprint.name,
                    currentVelocity: Math.round(
                        currentVelocity * 10
                    ) / 10,
                    requiredVelocity: Math.round(
                        requiredVelocity * 10
                    ) / 10,
                    velocityGapPercent: Math.round(
                        velocityGap * 100
                    ),
                    daysLeft,
                    remainingPoints: activeSprint.totalStoryPoints -
                        activeSprint.completedStoryPoints,
                    averageVelocity: cache.averageVelocity
                }
            });
        }
    }

    // ── Trigger 3: Blocked tasks — dependency alert ──
    const blockedTasks = issues.filter(i => i.isBlocked);
    if (blockedTasks.length > 0) {
        const criticalBlocked = blockedTasks.sort((a, b) => {
            const order = {
                'Highest': 5, 'High': 4,
                'Medium': 3, 'Low': 2, 'Lowest': 1
            };
            return (order[b.priority] || 0) -
                (order[a.priority] || 0);
        })[0];

        triggers.push({
            type: 'DEPENDENCY_ALERT',
            priority: criticalBlocked.priority === 'Highest' ||
                criticalBlocked.priority === 'High'
                ? 'URGENT'
                : 'SOON',
            data: {
                blockedTask: {
                    key: criticalBlocked.key,
                    summary: criticalBlocked.summary,
                    priority: criticalBlocked.priority,
                    assignee: criticalBlocked.assignee?.name,
                    blockedBy: criticalBlocked.blockedBy
                },
                totalBlockedCount: blockedTasks.length,
                allBlockedTasks: blockedTasks.map(t => ({
                    key: t.key,
                    summary: t.summary,
                    priority: t.priority
                }))
            }
        });
    }

    // ── Trigger 4: Overdue high priority tasks ──
    const overdueHighPriority = issues.filter(
        i => i.isOverdue &&
            (i.priority === 'Highest' || i.priority === 'High') &&
            i.status !== 'Done'
    );

    if (overdueHighPriority.length > 0) {
        const mostOverdue = overdueHighPriority[0];
        const daysOverdue = mostOverdue.dueDate
            ? Math.ceil(
                (today - new Date(mostOverdue.dueDate)) /
                (1000 * 60 * 60 * 24)
            )
            : 0;

        triggers.push({
            type: 'PRIORITY_ESCALATION',
            priority: daysOverdue > 3 ? 'URGENT' : 'SOON',
            data: {
                task: {
                    key: mostOverdue.key,
                    summary: mostOverdue.summary,
                    priority: mostOverdue.priority,
                    assignee: mostOverdue.assignee?.name,
                    dueDate: mostOverdue.dueDate,
                    daysOverdue
                },
                totalOverdueCount: overdueHighPriority.length
            }
        });
    }

    log(`✅ Detected ${triggers.length} suggestion triggers`);
    return triggers;
};

// ─────────────────────────────────────────
// STEP 2: Generate suggestion using Gemini
// ─────────────────────────────────────────
const generateSuggestion = async (trigger, sprintName) => {
    const prompt = `
You are an AI project management assistant analyzing sprint: "${sprintName}".
A problem has been detected that requires a suggestion for the project manager.

Problem Type: ${trigger.type}
Problem Data: ${JSON.stringify(trigger.data, null, 2)}

Generate a JSON object with these EXACT fields:
- title: Short suggestion title, max 8 words, mention specific names or issue keys
- aiReasoning: 2-3 sentences explaining exactly why this suggestion is needed. Use specific names, numbers, and percentages from the data.
- impactPreview: One sentence showing before and after impact with specific numbers. Example: "Reduces Irtaza's load from 95% to 60% and saves ~2 days of delay."
- jiraIssueKey: The Jira issue key this is about (e.g. "WR-29"), or null if not applicable

Rules:
- Be very specific with names and numbers from the data
- aiReasoning must reference actual data values
- impactPreview must show measurable improvement
- Return ONLY valid JSON, no markdown, no extra text

Example for TASK_REASSIGN:
{
  "title": "Reassign WR-29 from Irtaza to Jawad Ali",
  "aiReasoning": "Irtaza Manzoor is at 130% workload capacity with 3 high-priority tasks. WR-29 is blocking 3 other frontend tasks and causing sprint delays. Jawad Ali is at 60% capacity and available to take on additional work.",
  "impactPreview": "Reduces Irtaza's load from 130% to 90% and unblocks 3 dependent tasks immediately.",
  "jiraIssueKey": "WR-29"
}
`;

    const fallback = {
        title: trigger.type === 'TASK_REASSIGN'
            ? `Reassign task from ${trigger.data.fromMember?.name}`
            : trigger.type === 'DEADLINE_BUFFER'
                ? `Add buffer to ${trigger.data.sprintName}`
                : trigger.type === 'DEPENDENCY_ALERT'
                    ? `Resolve blocked task ${trigger.data.blockedTask?.key}`
                    : `Escalate priority task ${trigger.data.task?.key}`,
        aiReasoning: `A ${trigger.type.toLowerCase().replace('_', ' ')} issue was detected in the current sprint requiring immediate attention.`,
        impactPreview: 'Resolving this issue will improve sprint success probability.',
        jiraIssueKey: trigger.data.task?.key ||
            trigger.data.blockedTask?.key || null
    };

    const geminiText = await callGemini(prompt, null);
    if (!geminiText) return fallback;

    const parsed = parseGeminiJSON(geminiText, fallback);

    return {
        title: parsed.title || fallback.title,
        aiReasoning: parsed.aiReasoning || fallback.aiReasoning,
        impactPreview: parsed.impactPreview || fallback.impactPreview,
        jiraIssueKey: parsed.jiraIssueKey || fallback.jiraIssueKey
    };
};

// ─────────────────────────────────────────
// MAIN: Generate all suggestions
// ─────────────────────────────────────────
const generateSuggestions = async (userId) => {
    const { cache, config } = await getUserCache(userId);

    // Check for existing pending suggestions
    const existingPending = await Suggestion.find({
        userId,
        projectKey: config.selectedProjectKey,
        status: 'PENDING'
    });

    if (existingPending.length > 0) {
        log(`ℹ️ ${existingPending.length} pending suggestions already exist`);
        return {
            generated: 0,
            existing: existingPending.length,
            message: 'Existing pending suggestions found. Approve or ignore them first, or use force regenerate.'
        };
    }

    // Detect triggers from cache data
    const triggers = await detectTriggers(cache, userId);

    if (triggers.length === 0) {
        log('✅ No suggestion triggers detected. Sprint looks healthy.');
        return {
            generated: 0,
            existing: 0,
            message: 'No issues detected. Sprint is on track.'
        };
    }

    // Generate suggestion for each trigger
    const savedSuggestions = [];

    for (const trigger of triggers) {
        const geminiContent = await generateSuggestion(
            trigger,
            cache.activeSprint.name
        );

        const suggestion = await Suggestion.create({
            userId,
            projectKey: config.selectedProjectKey,
            sprintId: cache.activeSprint.id,
            sprintName: cache.activeSprint.name,
            type: trigger.type,
            priority: trigger.priority,
            title: geminiContent.title,
            aiReasoning: geminiContent.aiReasoning,
            impactPreview: geminiContent.impactPreview,
            triggerData: trigger.data,
            jiraIssueKey: geminiContent.jiraIssueKey,
            fromMember: trigger.data.fromMember || null,
            toMember: trigger.data.toMember || null,
            status: 'PENDING'
        });

        savedSuggestions.push(suggestion);
        log(`✅ Suggestion created: ${suggestion.title}`);
    }

    return {
        generated: savedSuggestions.length,
        existing: 0,
        suggestions: savedSuggestions,
        message: `${savedSuggestions.length} suggestions generated successfully.`
    };
};

// ─────────────────────────────────────────
// GET: All suggestions for user
// ─────────────────────────────────────────
const getSuggestions = async (userId, statusFilter) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw { statusCode: 400, message: 'Workspace not found.' };
    }

    const query = {
        userId,
        projectKey: config.selectedProjectKey
    };

    if (statusFilter && statusFilter !== 'ALL') {
        query.status = statusFilter;
    }

    const suggestions = await Suggestion.find(query)
        .sort({ createdAt: -1 });

    const pendingCount = suggestions.filter(
        s => s.status === 'PENDING'
    ).length;

    return {
        suggestions,
        totalCount: suggestions.length,
        pendingCount
    };
};

// ─────────────────────────────────────────
// POST: Approve suggestion + sync to Jira
// ─────────────────────────────────────────
const approveSuggestion = async (userId, suggestionId) => {
    const suggestion = await Suggestion.findOne({
        _id: suggestionId,
        userId
    });

    if (!suggestion) {
        throw { statusCode: 404, message: 'Suggestion not found.' };
    }

    if (suggestion.status !== 'PENDING') {
        throw {
            statusCode: 400,
            message: `Suggestion is already ${suggestion.status}.`
        };
    }

    const user = await require('../models/User').findById(userId);
    let jiraSyncSuccess = false;
    let jiraSyncMessage = '';
    const originalData = {};

    // Execute action based on suggestion type
    try {
        if (suggestion.type === 'TASK_REASSIGN' &&
            suggestion.jiraIssueKey &&
            suggestion.toMember?.accountId) {

            // Store original assignee for undo
            const { cache } = await getUserCache(userId);
            const originalIssue = cache.activeSprint.issues.find(
                i => i.key === suggestion.jiraIssueKey
            );
            if (originalIssue) {
                originalData.originalAssignee = originalIssue.assignee;
            }

            // Update assignee in Jira
            await jiraService.updateIssueAssignee(
                userId,
                suggestion.jiraIssueKey,
                suggestion.toMember.accountId
            );

            jiraSyncSuccess = true;
            jiraSyncMessage = `Task ${suggestion.jiraIssueKey} reassigned to ${suggestion.toMember.name} in Jira.`;
            log(`✅ Jira updated: ${jiraSyncMessage}`);

        } else if (suggestion.type === 'DEADLINE_BUFFER' &&
            suggestion.jiraIssueKey) {

            // Add 2 days to current due date
            const currentDue = suggestion.currentDueDate
                ? new Date(suggestion.currentDueDate)
                : new Date();
            const newDue = new Date(currentDue);
            newDue.setDate(newDue.getDate() + 2);

            originalData.originalDueDate = currentDue;

            const newDueDateStr = newDue.toISOString().split('T')[0];
            await jiraService.updateIssueDueDate(
                userId,
                suggestion.jiraIssueKey,
                newDueDateStr
            );

            jiraSyncSuccess = true;
            jiraSyncMessage = `Due date extended to ${newDueDateStr} in Jira.`;
            log(`✅ Jira updated: ${jiraSyncMessage}`);

        } else {
            // For suggestion types that don't have direct Jira action
            // (DEPENDENCY_ALERT, PRIORITY_ESCALATION, MEETING_REQUIRED)
            jiraSyncSuccess = true;
            jiraSyncMessage = 'Suggestion approved. Manual Jira action may be required.';
        }
    } catch (jiraErr) {
        error('❌ Jira sync failed:', jiraErr.message);
        jiraSyncSuccess = false;
        jiraSyncMessage = `Jira sync failed: ${jiraErr.message}`;
    }

    // Update suggestion status
    await Suggestion.findByIdAndUpdate(suggestionId, {
        status: 'APPROVED',
        approvedBy: user.name,
        approvedAt: new Date()
    });

    // Create decision log for audit trail
    await DecisionLog.create({
        userId,
        projectKey: suggestion.projectKey,
        actionType: suggestion.type === 'TASK_REASSIGN'
            ? 'TASK_REASSIGNMENT'
            : suggestion.type === 'DEADLINE_BUFFER'
                ? 'DEADLINE_EXTENSION'
                : suggestion.type === 'PRIORITY_ESCALATION'
                    ? 'PRIORITY_ESCALATION'
                    : 'DEPENDENCY_RESOLVED',
        actionDetail: `${suggestion.title} — ${suggestion.jiraIssueKey || 'N/A'}`,
        status: 'APPROVED',
        executedBy: user.name,
        executorType: 'HUMAN',
        aiReasoning: suggestion.aiReasoning,
        jiraIssueKey: suggestion.jiraIssueKey,
        originalData,
        suggestionId: suggestion._id,
        canUndo: jiraSyncSuccess && (
            suggestion.type === 'TASK_REASSIGN' ||
            suggestion.type === 'DEADLINE_BUFFER'
        ),
        undoDeadline: new Date(Date.now() + 30 * 60 * 1000)
    });

    log(`✅ Suggestion approved and decision logged: ${suggestion.title}`);

    return {
        suggestion: await Suggestion.findById(suggestionId),
        jiraSyncSuccess,
        jiraSyncMessage
    };
};

// ─────────────────────────────────────────
// POST: Ignore suggestion
// ─────────────────────────────────────────
const ignoreSuggestion = async (userId, suggestionId) => {
    const suggestion = await Suggestion.findOne({
        _id: suggestionId,
        userId
    });

    if (!suggestion) {
        throw { statusCode: 404, message: 'Suggestion not found.' };
    }

    if (suggestion.status !== 'PENDING') {
        throw {
            statusCode: 400,
            message: `Suggestion is already ${suggestion.status}.`
        };
    }

    const user = await require('../models/User').findById(userId);

    await Suggestion.findByIdAndUpdate(suggestionId, {
        status: 'IGNORED',
        ignoredBy: user.name,
        ignoredAt: new Date()
    });

    // Log to decision history
    await DecisionLog.create({
        userId,
        projectKey: suggestion.projectKey,
        actionType: 'SUGGESTION_IGNORED',
        actionDetail: suggestion.title,
        status: 'REJECTED',
        executedBy: user.name,
        executorType: 'HUMAN',
        aiReasoning: suggestion.aiReasoning,
        jiraIssueKey: suggestion.jiraIssueKey,
        suggestionId: suggestion._id,
        canUndo: false
    });

    log(`✅ Suggestion ignored: ${suggestion.title}`);
    return await Suggestion.findById(suggestionId);
};

// ─────────────────────────────────────────
// POST: Ask AI Why — explain suggestion
// ─────────────────────────────────────────
const explainSuggestion = async (userId, suggestionId) => {
    const suggestion = await Suggestion.findOne({
        _id: suggestionId,
        userId
    });

    if (!suggestion) {
        throw { statusCode: 404, message: 'Suggestion not found.' };
    }

    const prompt = `
You are an AI project management assistant.
A project manager wants to understand why you made this suggestion.

Suggestion Title: ${suggestion.title}
Suggestion Type: ${suggestion.type}
AI Reasoning: ${suggestion.aiReasoning}
Trigger Data: ${JSON.stringify(suggestion.triggerData, null, 2)}

Explain this suggestion in simple, clear language.
Write exactly 4 bullet points.
Each bullet point starts with a relevant emoji.
Each point should be one clear sentence.
Focus on: why the problem exists, what risk it creates,
why this specific action helps, and what happens if ignored.

Return ONLY the 4 bullet points as plain text.
No JSON. No headers. No extra text.

Example format:
🔴 The lead developer is at 130% capacity with overlapping deadlines.
⚠️ This creates a risk of task delays affecting 3 dependent features.
✅ Reassigning one task reduces their load to a manageable 90%.
❌ Ignoring this may cause a 2-3 day sprint delay by end of week.
`;

    const fallback = `🔴 A critical issue was detected in your sprint that requires attention.\n⚠️ This problem is affecting team performance and sprint velocity.\n✅ The suggested action will help resolve the issue efficiently.\n❌ Ignoring this may result in sprint failure or deadline breach.`;

    const explanation = await callGemini(prompt, fallback);

    return {
        suggestionId,
        title: suggestion.title,
        explanation: explanation || fallback
    };
};

// ─────────────────────────────────────────
// POST: Force regenerate suggestions
// ─────────────────────────────────────────
const forceRegenerateSuggestions = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw { statusCode: 400, message: 'Workspace not found.' };
    }

    // Delete all pending suggestions for this project
    const deleted = await Suggestion.deleteMany({
        userId,
        projectKey: config.selectedProjectKey,
        status: 'PENDING'
    });

    log(`🗑️ Deleted ${deleted.deletedCount} pending suggestions`);

    // Generate fresh suggestions
    return await generateSuggestions(userId);
};

module.exports = {
    generateSuggestions,
    getSuggestions,
    approveSuggestion,
    ignoreSuggestion,
    explainSuggestion,
    forceRegenerateSuggestions
};