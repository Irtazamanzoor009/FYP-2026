const DecisionLog = require('../models/DecisionLog');
const Suggestion = require('../models/Suggestion');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const SprintCache = require('../models/SprintCache');
const jiraService = require('./jiraService');
const { log, error } = require('../utils/logger');
const mongoose = require('mongoose');

// ─────────────────────────────────────────
// GET: All decision logs with filter + search
// ─────────────────────────────────────────
const getDecisionLogs = async (userId, filters) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw {
            statusCode: 400,
            message: 'Workspace not found.'
        };
    }

    const query = {
        userId,
        projectKey: config.selectedProjectKey
    };

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
        query.status = filters.status;
    }

    // Search filter
    if (filters.search && filters.search.trim() !== '') {
        const searchRegex = {
            $regex: filters.search.trim(),
            $options: 'i'
        };
        query.$or = [
            { actionDetail: searchRegex },
            { actionType: searchRegex },
            { executedBy: searchRegex },
            { jiraIssueKey: searchRegex }
        ];
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
        DecisionLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        DecisionLog.countDocuments(query)
    ]);

    // Add canUndoNow field based on deadline
    const now = new Date();
    const enrichedLogs = logs.map(log => ({
        ...log,
        canUndoNow: log.canUndo &&
            !log.undone &&
            log.undoDeadline &&
            new Date(log.undoDeadline) > now
    }));

    const userObjectId = new mongoose.Types.ObjectId(
        userId.toString()
    );

    // Count by status for filter badges
    const statusCounts = await DecisionLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                projectKey: config.selectedProjectKey
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const counts = {
        ALL: totalCount,
        APPROVED: 0,
        REJECTED: 0,
        AUTO_EXECUTED: 0
    };

    statusCounts.forEach(s => {
        if (counts.hasOwnProperty(s._id)) {
            counts[s._id] = s.count;
        }
    });

    return {
        logs: enrichedLogs,
        pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNextPage: page * limit < totalCount,
            hasPrevPage: page > 1
        },
        statusCounts: counts
    };
};

// ─────────────────────────────────────────
// GET: Single decision log by ID
// ─────────────────────────────────────────
const getDecisionLogById = async (userId, logId) => {
    const log = await DecisionLog.findOne({
        _id: logId,
        userId
    }).lean();

    if (!log) {
        throw {
            statusCode: 404,
            message: 'Decision log not found.'
        };
    }

    const now = new Date();
    return {
        ...log,
        canUndoNow: log.canUndo &&
            !log.undone &&
            log.undoDeadline &&
            new Date(log.undoDeadline) > now
    };
};

// ─────────────────────────────────────────
// POST: Undo an approved action
// ─────────────────────────────────────────
const undoDecision = async (userId, logId) => {
    const decisionLog = await DecisionLog.findOne({
        _id: logId,
        userId
    });

    if (!decisionLog) {
        throw {
            statusCode: 404,
            message: 'Decision log not found.'
        };
    }

    // Check canUndo flag
    if (!decisionLog.canUndo) {
        throw {
            statusCode: 400,
            message: 'This action cannot be undone.'
        };
    }

    // Check already undone
    if (decisionLog.undone) {
        throw {
            statusCode: 400,
            message: 'This action has already been undone.'
        };
    }

    // Check undo deadline
    const now = new Date();
    if (!decisionLog.undoDeadline ||
        now > new Date(decisionLog.undoDeadline)) {
        throw {
            statusCode: 400,
            message: 'Undo window has expired. Actions can only be undone within 30 minutes of approval.'
        };
    }

    let jiraUndoSuccess = false;
    let jiraUndoMessage = '';

    // Execute undo based on action type
    try {
        if (decisionLog.actionType === 'TASK_REASSIGNMENT' &&
            decisionLog.originalData?.originalAssignee?.accountId &&
            decisionLog.jiraIssueKey) {

            // Restore original assignee
            await jiraService.updateIssueAssignee(
                userId,
                decisionLog.jiraIssueKey,
                decisionLog.originalData.originalAssignee.accountId
            );

            jiraUndoSuccess = true;
            jiraUndoMessage = `Task ${decisionLog.jiraIssueKey} reassigned back to ${decisionLog.originalData.originalAssignee.name} in Jira.`;
            log(`✅ Undo successful: ${jiraUndoMessage}`);

        } else if (decisionLog.actionType === 'DEADLINE_EXTENSION' &&
            decisionLog.originalData?.originalDueDate &&
            decisionLog.jiraIssueKey) {

            // Restore original due date
            const originalDate = new Date(
                decisionLog.originalData.originalDueDate
            ).toISOString().split('T')[0];

            await jiraService.updateIssueDueDate(
                userId,
                decisionLog.jiraIssueKey,
                originalDate
            );

            jiraUndoSuccess = true;
            jiraUndoMessage = `Due date for ${decisionLog.jiraIssueKey} restored to ${originalDate} in Jira.`;
            log(`✅ Undo successful: ${jiraUndoMessage}`);

        } else {
            jiraUndoSuccess = true;
            jiraUndoMessage = 'Action marked as undone. No Jira changes were needed.';
        }

    } catch (jiraErr) {
        error('❌ Jira undo failed:', jiraErr.message);
        jiraUndoSuccess = false;
        jiraUndoMessage = `Jira undo failed: ${jiraErr.message}`;
    }

    // Mark as undone in MongoDB
    await DecisionLog.findByIdAndUpdate(logId, {
        undone: true,
        canUndo: false
    });

    // Also update related suggestion back to PENDING
    // so PM can reconsider
    if (decisionLog.suggestionId) {
        await Suggestion.findByIdAndUpdate(
            decisionLog.suggestionId,
            {
                status: 'PENDING',
                approvedBy: null,
                approvedAt: null
            }
        );
        log(`✅ Suggestion restored to PENDING: ${decisionLog.suggestionId}`);
    }

    return {
        logId,
        undone: true,
        jiraUndoSuccess,
        jiraUndoMessage
    };
};

// ─────────────────────────────────────────
// GET: Audit summary stats
// ─────────────────────────────────────────
const getAuditSummary = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw {
            statusCode: 400,
            message: 'Workspace not found.'
        };
    }

    const mongoose = require('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(
        userId.toString()
    );

    // Total counts by status
    const statusStats = await DecisionLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                projectKey: config.selectedProjectKey
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // Total counts by action type
    const actionStats = await DecisionLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                projectKey: config.selectedProjectKey
            }
        },
        {
            $group: {
                _id: '$actionType',
                count: { $sum: 1 }
            }
        }
    ]);

    // Human vs AI executor counts
    const executorStats = await DecisionLog.aggregate([
        {
            $match: {
                userId: userObjectId,
                projectKey: config.selectedProjectKey
            }
        },
        {
            $group: {
                _id: '$executorType',
                count: { $sum: 1 }
            }
        }
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    const recentCount = await DecisionLog.countDocuments({
        userId,
        projectKey: config.selectedProjectKey,
        timestamp: { $gte: sevenDaysAgo }
    });

    const summary = {
        total: 0,
        approved: 0,
        rejected: 0,
        autoExecuted: 0,
        recentActivity: recentCount,
        byActionType: {},
        humanDecisions: 0,
        aiDecisions: 0
    };

    statusStats.forEach(s => {
        if (s._id === 'APPROVED') summary.approved = s.count;
        if (s._id === 'REJECTED') summary.rejected = s.count;
        if (s._id === 'AUTO_EXECUTED') summary.autoExecuted = s.count;
        summary.total += s.count;
    });

    actionStats.forEach(a => {
        summary.byActionType[a._id] = a.count;
    });

    executorStats.forEach(e => {
        if (e._id === 'HUMAN') summary.humanDecisions = e.count;
        if (e._id === 'AI') summary.aiDecisions = e.count;
    });

    return summary;
};

// ─────────────────────────────────────────
// GET: Export audit log as formatted data
// ─────────────────────────────────────────
const exportAuditLog = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw {
            statusCode: 400,
            message: 'Workspace not found.'
        };
    }

    const logs = await DecisionLog.find({
        userId,
        projectKey: config.selectedProjectKey
    })
        .sort({ timestamp: -1 })
        .lean();

    // Format for export
    const formatted = logs.map(log => ({
        id: log._id,
        action: log.actionType,
        detail: log.actionDetail,
        status: log.status,
        executedBy: log.executedBy,
        executorType: log.executorType,
        jiraIssue: log.jiraIssueKey || 'N/A',
        aiReasoning: log.aiReasoning || 'N/A',
        timestamp: new Date(log.timestamp).toISOString(),
        wasUndone: log.undone ? 'Yes' : 'No'
    }));

    return {
        projectKey: config.selectedProjectKey,
        exportedAt: new Date().toISOString(),
        totalRecords: formatted.length,
        logs: formatted
    };
};

module.exports = {
    getDecisionLogs,
    getDecisionLogById,
    undoDecision,
    getAuditSummary,
    exportAuditLog
};