const SprintCache = require('../models/SprintCache');
const RiskCache = require('../models/RiskCache');
const Suggestion = require('../models/Suggestion');
const Alert = require('../models/Alert');
const DecisionLog = require('../models/DecisionLog');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const { GoogleGenAI } = require('@google/genai');
const { log, error } = require('../utils/logger');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────
// HELPER: Safe Gemini call
// ─────────────────────────────────────────
const callGemini = async (prompt, fallback) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: prompt
        });
        const text = response.text;
        if (!text || text.trim() === '') return fallback;
        return text.trim();
    } catch (err) {
        error('❌ Gemini chat failed:', err.message);
        return fallback;
    }
};

// ─────────────────────────────────────────
// HELPER: Build sprint context for Gemini
// ─────────────────────────────────────────
const buildSprintContext = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw {
            statusCode: 400,
            message: 'Jira workspace not connected.'
        };
    }

    const projectKey = config.selectedProjectKey;

    // Fetch all relevant data in parallel
    const [sprintCache, riskCache, suggestions, alerts, recentDecisions] =
        await Promise.all([
            SprintCache.findOne({ userId, projectKey }),
            RiskCache.findOne({ userId, projectKey }),
            Suggestion.find({
                userId,
                projectKey,
                status: 'PENDING'
            }).limit(5),
            Alert.find({
                userId,
                projectKey,
                status: 'ACTIVE'
            }).limit(5),
            DecisionLog.find({ userId, projectKey })
                .sort({ timestamp: -1 })
                .limit(3)
        ]);

    if (!sprintCache) {
        throw {
            statusCode: 404,
            message: 'No sprint data found. Please refresh your data first.'
        };
    }

    const { activeSprint, teamWorkload, averageVelocity } = sprintCache;

    // Calculate sprint metrics
    const today = new Date();
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const totalDays = Math.ceil(
        (end - start) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.max(
        Math.ceil((today - start) / (1000 * 60 * 60 * 24)), 1
    );
    const daysLeft = Math.max(totalDays - daysElapsed, 0);
    const completionPercent = activeSprint.totalStoryPoints > 0
        ? Math.round(
            (activeSprint.completedStoryPoints /
                activeSprint.totalStoryPoints) * 100
        )
        : 0;

    // Build blocked tasks list
    const blockedTasks = activeSprint.issues
        .filter(i => i.isBlocked)
        .map(i => ({
            key: i.key,
            summary: i.summary,
            assignee: i.assignee?.name,
            blockedBy: i.blockedBy?.map(b => b.key).join(', ')
        }));

    // Build overdue tasks list
    const overdueTasks = activeSprint.issues
        .filter(i => i.isOverdue && i.status !== 'Done')
        .map(i => ({
            key: i.key,
            summary: i.summary,
            assignee: i.assignee?.name,
            dueDate: i.dueDate
        }));

    // Build team summary
    const teamSummary = teamWorkload.map(m => {
        // Find role from WorkspaceConfig teamMembers
        const memberRole = config.teamMembers?.find(
            r => r.accountId === m.accountId
        );

        return {
            name: m.name,
            role: memberRole?.role || 'Unknown Role',
            skills: memberRole?.skills || [],
            workload: m.actualPercentage || m.rawPercentage || m.workloadPercentage,
            status: m.status,
            taskCount: m.taskCount,
            tasks: m.tasks?.map(t => t.key).join(', ')
        };
    });

    // Build context object
    const context = {
        sprint: {
            name: activeSprint.name,
            projectKey,
            startDate: activeSprint.startDate?.toString().split('T')[0],
            endDate: activeSprint.endDate?.toString().split('T')[0],
            daysElapsed,
            daysLeft,
            totalDays,
            totalStoryPoints: activeSprint.totalStoryPoints,
            completedStoryPoints: activeSprint.completedStoryPoints,
            inProgressStoryPoints: activeSprint.inProgressStoryPoints,
            todoStoryPoints: activeSprint.todoStoryPoints,
            completionPercent,
            averageVelocity
        },
        team: teamSummary,
        blockedTasks,
        overdueTasks,
        activeAlertsCount: alerts.length,
        activeAlerts: alerts.map(a => ({
            severity: a.severity,
            title: a.title,
            message: a.message
        })),
        pendingSuggestionsCount: suggestions.length,
        pendingSuggestions: suggestions.map(s => ({
            type: s.type,
            title: s.title,
            priority: s.priority
        })),
        recentDecisions: recentDecisions.map(d => ({
            action: d.actionType,
            status: d.status,
            executedBy: d.executedBy,
            detail: d.actionDetail
        })),
        riskAnalysis: riskCache ? {
            successProbability: riskCache.sprintSuccessProbability,
            topRisks: riskCache.risks?.slice(0, 3).map(r => ({
                type: r.type,
                level: r.level,
                why: r.why,
                action: r.action
            }))
        } : null
    };

    return context;
};

// ─────────────────────────────────────────
// MAIN: Send message and get AI response
// ─────────────────────────────────────────
const sendMessage = async (userId, userMessage, conversationHistory = []) => {
    if (!userMessage || userMessage.trim() === '') {
        throw {
            statusCode: 400,
            message: 'Message cannot be empty.'
        };
    }

    const trimmedMessage = userMessage.trim();
    log(`💬 Chat message from user ${userId}: "${trimmedMessage}"`);

    // Build context from MongoDB
    const context = await buildSprintContext(userId);

    // Build conversation history string
    let historyString = '';
    if (conversationHistory.length > 0) {
        // Only use last 6 messages to keep context small
        const recentHistory = conversationHistory.slice(-6);
        historyString = recentHistory
            .map(h => `${h.role === 'user' ? 'PM' : 'AI'}: ${h.content}`)
            .join('\n');
    }

    const prompt = `
You are ProManage Bot — an AI co-pilot for project managers.
You help project managers understand their sprint health and make smart decisions.
You have access to real-time sprint data shown below.
Always be specific with names, numbers, and task keys from the data.
Keep responses concise — maximum 4-5 sentences or bullet points.
Be direct and actionable. Do not repeat the question back.

═══════════════════════════════════════
CURRENT SPRINT DATA
═══════════════════════════════════════

Sprint: ${context.sprint.name} (${context.sprint.projectKey})
Duration: ${context.sprint.startDate} to ${context.sprint.endDate}
Progress: Day ${context.sprint.daysElapsed} of ${context.sprint.totalDays} (${context.sprint.daysLeft} days left)
Points: ${context.sprint.completedStoryPoints} done / ${context.sprint.totalStoryPoints} total (${context.sprint.completionPercent}% complete)
In Progress: ${context.sprint.inProgressStoryPoints} pts | To Do: ${context.sprint.todoStoryPoints} pts
Historical Average Velocity: ${context.sprint.averageVelocity} points/sprint

TEAM WORKLOAD AND ROLES:
${context.team.map(m =>
    `${m.name} (${m.role}): ${m.workload}% workload (${m.status}) — ${m.taskCount} tasks [${m.tasks}]`
).join('\n')}

ROLE COMPATIBILITY RULES:
- Backend/API/Database tasks → only Backend Engineer, Full Stack Developer, Lead Developer
- Frontend/UI/Design tasks → only Frontend Developer, Full Stack Developer, Lead Developer
- Testing tasks → only QA Engineer
- General tasks → anyone

BLOCKED TASKS (${context.blockedTasks.length}):
${context.blockedTasks.length > 0
            ? context.blockedTasks.map(t =>
                `${t.key} "${t.summary}" (assigned: ${t.assignee}) — blocked by: ${t.blockedBy}`
            ).join('\n')
            : 'None'
        }

OVERDUE TASKS (${context.overdueTasks.length}):
${context.overdueTasks.length > 0
            ? context.overdueTasks.map(t =>
                `${t.key} "${t.summary}" (assigned: ${t.assignee}) — due: ${t.dueDate?.toString().split('T')[0]}`
            ).join('\n')
            : 'None'
        }

ACTIVE ALERTS (${context.activeAlertsCount}):
${context.activeAlerts.length > 0
            ? context.activeAlerts.map(a =>
                `[${a.severity}] ${a.title}: ${a.message}`
            ).join('\n')
            : 'None'
        }

PENDING AI SUGGESTIONS (${context.pendingSuggestionsCount}):
${context.pendingSuggestions.length > 0
            ? context.pendingSuggestions.map(s =>
                `[${s.priority}] ${s.type}: ${s.title}`
            ).join('\n')
            : 'None'
        }

RISK ANALYSIS:
${context.riskAnalysis
            ? `Success Probability: ${context.riskAnalysis.successProbability}%
Top Risks: ${context.riskAnalysis.topRisks?.map(r =>
                `${r.type} (${r.level}): ${r.why}`
            ).join(' | ')}`
            : 'Not available'
        }

RECENT DECISIONS:
${context.recentDecisions.length > 0
            ? context.recentDecisions.map(d =>
                `${d.action} — ${d.status} by ${d.executedBy}: ${d.detail}`
            ).join('\n')
            : 'None yet'
        }

═══════════════════════════════════════
${historyString ? `CONVERSATION HISTORY:\n${historyString}\n═══════════════════════════════════════` : ''}

PROJECT MANAGER ASKS: "${trimmedMessage}"

Answer as ProManage Bot using the sprint data above.
Be specific. Use task keys and names from the data.
If asked about something not in the data, say you don't have that information.
`;

    const fallback = `I'm having trouble connecting to the AI right now. Based on your sprint data: you have ${context.sprint.completedStoryPoints} of ${context.sprint.totalStoryPoints} points completed with ${context.sprint.daysLeft} days remaining. There are ${context.blockedTasks.length} blocked tasks and ${context.activeAlertsCount} active alerts requiring attention.`;

    const aiResponse = await callGemini(prompt, fallback);

    return {
        userMessage: trimmedMessage,
        aiResponse,
        context: {
            sprintName: context.sprint.name,
            daysLeft: context.sprint.daysLeft,
            completionPercent: context.sprint.completionPercent
        }
    };
};

// ─────────────────────────────────────────
// GET: Suggested questions for PM
// ─────────────────────────────────────────
const getSuggestedQuestions = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw { statusCode: 400, message: 'Workspace not found.' };
    }

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    // Build dynamic suggestions based on actual sprint state
    const suggestions = [];

    if (sprintCache) {
        const blockedCount = sprintCache.activeSprint.issues
            .filter(i => i.isBlocked).length;
        const overdueCount = sprintCache.activeSprint.issues
            .filter(i => i.isOverdue).length;
        const overloadedMembers = sprintCache.teamWorkload
            .filter(m => m.status === 'Overloaded');

        if (blockedCount > 0) {
            suggestions.push(
                `Why are ${blockedCount} tasks blocked?`
            );
        }
        if (overdueCount > 0) {
            suggestions.push(
                `Which tasks are overdue and who is responsible?`
            );
        }
        if (overloadedMembers.length > 0) {
            suggestions.push(
                `Who should I reassign tasks to reduce ${overloadedMembers[0].name}'s workload?`
            );
        }
    }

    // Always include these general questions
    suggestions.push(
        'Will we complete the sprint on time?',
        'What is the biggest risk right now?',
        'What should I focus on today?',
        'How is the team performing compared to last sprint?',
        'Which tasks should be completed first?'
    );

    return suggestions.slice(0, 6);
};

module.exports = {
    sendMessage,
    getSuggestedQuestions
};