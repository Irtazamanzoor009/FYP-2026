const Alert = require('../models/Alert');
const AgentLog = require('../models/AgentLog');
const FailureSnapshot = require('../models/FailureSnapshot');
const SprintCache = require('../models/SprintCache');
const RiskCache = require('../models/RiskCache');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const { log, error } = require('../utils/logger');

// ─────────────────────────────────────────
// HELPER: Log agent activity to DB + socket
// ─────────────────────────────────────────
const logAgentActivity = async (userId, message, type = 'CHECK') => {
    try {
        const agentLog = await AgentLog.create({
            userId,
            message,
            type,
            timestamp: new Date()
        });

        // Push to frontend via WebSocket if connected
        try {
            const { getIO } = require('../config/socket');
            const io = getIO();
            io.to(userId.toString()).emit('agent-activity', {
                _id: agentLog._id,
                message,
                type,
                time: new Date().toTimeString().slice(0, 5),
                timestamp: agentLog.timestamp
            });
        } catch (socketErr) {
            // Socket not initialized yet — ignore
        }

        return agentLog;
    } catch (err) {
        error('❌ Failed to log agent activity:', err.message);
    }
};

// ─────────────────────────────────────────
// HELPER: Save alert (skip if duplicate)
// ─────────────────────────────────────────
const saveAlertIfNew = async (userId, projectKey, alertData) => {
    try {
        // Check if snoozed alert exists
        const existing = await Alert.findOne({
            userId,
            projectKey,
            alertKey: alertData.alertKey
        });

        if (existing) {
            // If snoozed and snooze period expired
            // reactivate it
            if (existing.status === 'SNOOZED' &&
                existing.snoozeUntil &&
                new Date() > new Date(existing.snoozeUntil)) {

                await Alert.findByIdAndUpdate(existing._id, {
                    status: 'ACTIVE',
                    snoozeUntil: null,
                    message: alertData.message,
                    title: alertData.title
                });
                return { created: false, reactivated: true };
            }

            // Already active — skip
            return { created: false, reactivated: false };
        }

        // Create new alert
        await Alert.create({
            userId,
            projectKey,
            ...alertData
        });

        // Push to frontend via WebSocket
        try {
            const { getIO } = require('../config/socket');
            const io = getIO();
            io.to(userId.toString()).emit('new-alert', {
                severity: alertData.severity,
                title: alertData.title,
                message: alertData.message
            });
        } catch (socketErr) {
            // Socket not initialized yet — ignore
        }

        return { created: true, reactivated: false };

    } catch (err) {
        // Duplicate key error — alert already exists
        if (err.code === 11000) {
            return { created: false, reactivated: false };
        }
        error('❌ Failed to save alert:', err.message);
        return { created: false, reactivated: false };
    }
};

// ─────────────────────────────────────────
// CORE: Run monitoring checks for a user
// ─────────────────────────────────────────
const runMonitoringChecks = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) return;

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    if (!sprintCache) return;

    const { activeSprint, teamWorkload } = sprintCache;
    const issues = activeSprint.issues;
    const projectKey = config.selectedProjectKey;

    let checksRun = 0;
    let alertsCreated = 0;

    // ── Check 1: Deadline breach prediction ──
    checksRun++;
    const riskCache = await RiskCache.findOne({
        userId,
        projectKey
    });

    if (riskCache &&
        riskCache.sprintSuccessProbability < 30) {
        const result = await saveAlertIfNew(
            userId,
            projectKey,
            {
                severity: 'CRITICAL',
                type: 'DEADLINE_BREACH',
                title: 'Deadline Breach Predicted',
                message: `Sprint "${activeSprint.name}" has only ${riskCache.sprintSuccessProbability}% chance of success. Immediate action required.`,
                alertKey: `deadline_breach_${activeSprint.id}`,
                relatedIssueKey: null,
                relatedMember: null
            }
        );
        if (result.created || result.reactivated) alertsCreated++;
    }

    await logAgentActivity(
        userId,
        'AI checked sprint failure probability — deadline risk assessed.',
        'CHECK'
    );

    // ── Check 2: Workload overload ──
    checksRun++;
    const overloadedMembers = teamWorkload.filter(
        m => m.rawPercentage > 90
    );

    for (const member of overloadedMembers) {
        const result = await saveAlertIfNew(
            userId,
            projectKey,
            {
                severity: 'WARNING',
                type: 'WORKLOAD_OVERLOAD',
                title: 'Workload Threshold Exceeded',
                message: `${member.name} has reached ${member.rawPercentage || member.workloadPercentage}% capacity. Rule-based engine flags potential burnout.`,
                alertKey: `workload_${activeSprint.id}_${member.accountId}`,
                relatedIssueKey: null,
                relatedMember: member.name
            }
        );
        if (result.created || result.reactivated) alertsCreated++;
    }

    await logAgentActivity(
        userId,
        `Monitoring team workload — ${overloadedMembers.length} member(s) above threshold.`,
        'CHECK'
    );

    // ── Check 3: Blocked high priority tasks ──
    checksRun++;
    const criticalBlocked = issues.filter(
        i => i.isBlocked &&
        (i.priority === 'Highest' || i.priority === 'High')
    );

    if (criticalBlocked.length > 0) {
        const task = criticalBlocked[0];
        const result = await saveAlertIfNew(
            userId,
            projectKey,
            {
                severity: 'CRITICAL',
                type: 'BLOCKED_TASK',
                title: 'Critical Task Blocked',
                message: `${task.key} "${task.summary}" is blocked by an unresolved dependency. ${criticalBlocked.length} critical task(s) affected.`,
                alertKey: `blocked_${activeSprint.id}_${task.key}`,
                relatedIssueKey: task.key,
                relatedMember: task.assignee?.name || null
            }
        );
        if (result.created || result.reactivated) alertsCreated++;
    }

    await logAgentActivity(
        userId,
        `Scanning for blocked task dependencies — ${criticalBlocked.length} critical blocker(s) found.`,
        'CHECK'
    );

    // ── Check 4: Velocity drop ──
    checksRun++;
    if (sprintCache.averageVelocity > 0) {
        const today = new Date();
        const start = new Date(activeSprint.startDate);
        const daysElapsed = Math.max(
            Math.ceil(
                (today - start) / (1000 * 60 * 60 * 24)
            ), 1
        );
        const currentVelocity =
            activeSprint.completedStoryPoints / daysElapsed;
        const velocityDropPercent =
            (sprintCache.averageVelocity -
             (currentVelocity * 14)) /
            sprintCache.averageVelocity;

        if (velocityDropPercent > 0.4) {
            const result = await saveAlertIfNew(
                userId,
                projectKey,
                {
                    severity: 'WARNING',
                    type: 'VELOCITY_DROP',
                    title: 'Sprint Velocity Below Target',
                    message: `Current velocity is ${Math.round(velocityDropPercent * 100)}% below historical average of ${sprintCache.averageVelocity} points/sprint.`,
                    alertKey: `velocity_drop_${activeSprint.id}`,
                    relatedIssueKey: null,
                    relatedMember: null
                }
            );
            if (result.created || result.reactivated) alertsCreated++;
        }
    }

    await logAgentActivity(
        userId,
        `Agentic Engine validated PMBOK Rule #4 (Critical Path) — velocity check complete.`,
        'VALIDATION'
    );

    // ── Check 5: Sprint failure risk ──
    checksRun++;
    if (riskCache &&
        riskCache.sprintSuccessProbability === 0) {
        const result = await saveAlertIfNew(
            userId,
            projectKey,
            {
                severity: 'CRITICAL',
                type: 'SPRINT_FAILURE_RISK',
                title: 'Sprint Failure Imminent',
                message: `Sprint "${activeSprint.name}" has 0% success probability. Consider sprint termination or scope reduction.`,
                alertKey: `sprint_failure_${activeSprint.id}`,
                relatedIssueKey: null,
                relatedMember: null
            }
        );
        if (result.created || result.reactivated) alertsCreated++;
    }

    await logAgentActivity(
        userId,
        `Sprint health analysis complete — ${alertsCreated} new alert(s) generated.`,
        alertsCreated > 0 ? 'ALERT' : 'CHECK'
    );

    log(`✅ Monitoring checks complete for ${userId}. Checks: ${checksRun}, New alerts: ${alertsCreated}`);

    return { checksRun, alertsCreated };
};

// ─────────────────────────────────────────
// CORE: Take daily failure probability snapshot
// ─────────────────────────────────────────
const takeDailySnapshot = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) return;

    const riskCache = await RiskCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    if (!riskCache || !sprintCache) return;

    const today = new Date().toISOString().split('T')[0];

    const today2 = new Date();
    const start = new Date(sprintCache.activeSprint.startDate);
    const daysElapsed = Math.max(
        Math.ceil((today2 - start) / (1000 * 60 * 60 * 24)), 1
    );
    const currentVelocity =
        sprintCache.activeSprint.completedStoryPoints / daysElapsed;
    const remaining =
        sprintCache.activeSprint.totalStoryPoints -
        sprintCache.activeSprint.completedStoryPoints;

    try {
        await FailureSnapshot.findOneAndUpdate(
            {
                userId,
                projectKey: config.selectedProjectKey,
                snapshotDate: today
            },
            {
                userId,
                projectKey: config.selectedProjectKey,
                sprintId: sprintCache.activeSprint.id,
                probability: riskCache.sprintSuccessProbability,
                snapshotDate: today,
                factors: {
                    teamVelocity: currentVelocity > 2
                        ? 'Stable'
                        : 'Decreasing',
                    remainingWork: `${remaining} pts`,
                    capacity: `${sprintCache.teamWorkload.length * 40}h`
                }
            },
            { upsert: true, new: true }
        );

        await logAgentActivity(
            userId,
            `Daily failure probability snapshot saved — ${riskCache.sprintSuccessProbability}%.`,
            'CHECK'
        );

        log(`✅ Snapshot saved for ${userId}: ${riskCache.sprintSuccessProbability}%`);
    } catch (err) {
        error('❌ Snapshot error:', err.message);
    }
};

// ─────────────────────────────────────────
// GET: Monitoring page data
// ─────────────────────────────────────────
const getMonitoringData = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw {
            statusCode: 400,
            message: 'Jira workspace not connected.'
        };
    }

    const projectKey = config.selectedProjectKey;

    // Get current failure probability + factors
    const riskCache = await RiskCache.findOne({
        userId,
        projectKey
    });

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey
    });

    // Get yesterday snapshot for trend
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const [todaySnapshot, yesterdaySnapshot] = await Promise.all([
        FailureSnapshot.findOne({
            userId,
            projectKey,
            snapshotDate: todayStr
        }),
        FailureSnapshot.findOne({
            userId,
            projectKey,
            snapshotDate: yesterdayStr
        })
    ]);

    const currentProbability =
        riskCache?.sprintSuccessProbability ?? 0;
    const yesterdayProbability =
        yesterdaySnapshot?.probability ?? currentProbability;
    const trend = currentProbability - yesterdayProbability;

    // Calculate factors from sprint cache
    let factors = [
        {
            name: 'Team Velocity',
            status: 'Unknown',
            icon: 'Activity'
        },
        {
            name: 'Remaining Work',
            status: 'Unknown',
            icon: 'Clock'
        },
        {
            name: 'Capacity',
            status: 'Unknown',
            icon: 'Eye'
        }
    ];

    if (sprintCache) {
        const today2 = new Date();
        const start = new Date(
            sprintCache.activeSprint.startDate
        );
        const daysElapsed = Math.max(
            Math.ceil(
                (today2 - start) / (1000 * 60 * 60 * 24)
            ), 1
        );
        const currentVelocity =
            sprintCache.activeSprint.completedStoryPoints /
            daysElapsed;
        const remaining =
            sprintCache.activeSprint.totalStoryPoints -
            sprintCache.activeSprint.completedStoryPoints;
        const totalCapacity =
            sprintCache.teamWorkload.length * 40;

        factors = [
            {
                name: 'Team Velocity',
                status: currentVelocity > 2
                    ? 'Stable'
                    : 'Decreasing',
                icon: 'Activity'
            },
            {
                name: 'Remaining Work',
                status: `High (${remaining} pts)`,
                icon: 'Clock'
            },
            {
                name: 'Capacity',
                status: `Stable (${totalCapacity}h)`,
                icon: 'Eye'
            }
        ];
    }

    // Get active alerts
    const alerts = await Alert.find({
        userId,
        projectKey,
        status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    // Get recent agent logs (last 20)
    const agentLogs = await AgentLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

    return {
        failureProbability: {
            current: currentProbability,
            trend: trend >= 0
                ? `+${trend}%`
                : `${trend}%`,
            direction: trend > 0
                ? 'up'
                : trend < 0
                ? 'down'
                : 'stable',
            vsYesterday: yesterdayProbability
        },
        factors,
        alerts,
        agentLogs: agentLogs.map(l => ({
            _id: l._id,
            message: `Agentic AI: ${l.message}`,
            type: l.type,
            time: new Date(l.timestamp)
                .toTimeString()
                .slice(0, 5),
            timestamp: l.timestamp
        })),
        lastCheckedAt: config.lastSyncedAt,
        projectKey
    };
};

// ─────────────────────────────────────────
// POST: Resolve an alert
// ─────────────────────────────────────────
const resolveAlert = async (userId, alertId) => {
    const alert = await Alert.findOne({
        _id: alertId,
        userId
    });

    if (!alert) {
        throw {
            statusCode: 404,
            message: 'Alert not found.'
        };
    }

    if (alert.status === 'RESOLVED') {
        throw {
            statusCode: 400,
            message: 'Alert is already resolved.'
        };
    }

    const user = await require('../models/User')
        .findById(userId);

    await Alert.findByIdAndUpdate(alertId, {
        status: 'RESOLVED',
        resolvedBy: user.name,
        resolvedAt: new Date()
    });

    await logAgentActivity(
        userId,
        `Alert "${alert.title}" marked as resolved by ${user.name}.`,
        'CHECK'
    );

    return await Alert.findById(alertId);
};

// ─────────────────────────────────────────
// POST: Snooze an alert
// ─────────────────────────────────────────
const snoozeAlert = async (userId, alertId, minutes = 60) => {
    const alert = await Alert.findOne({
        _id: alertId,
        userId
    });

    if (!alert) {
        throw {
            statusCode: 404,
            message: 'Alert not found.'
        };
    }

    const snoozeUntil = new Date(
        Date.now() + minutes * 60 * 1000
    );

    await Alert.findByIdAndUpdate(alertId, {
        status: 'SNOOZED',
        snoozeUntil
    });

    await logAgentActivity(
        userId,
        `Alert "${alert.title}" snoozed for ${minutes} minutes.`,
        'CHECK'
    );

    return await Alert.findById(alertId);
};

// ─────────────────────────────────────────
// POST: Clear all resolved alerts
// ─────────────────────────────────────────
const clearResolvedAlerts = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw {
            statusCode: 400,
            message: 'Workspace not found.'
        };
    }

    const result = await Alert.deleteMany({
        userId,
        projectKey: config.selectedProjectKey,
        status: 'RESOLVED'
    });

    await logAgentActivity(
        userId,
        `${result.deletedCount} resolved alert(s) cleared from system.`,
        'CHECK'
    );

    return {
        deletedCount: result.deletedCount
    };
};

// ─────────────────────────────────────────
// GET: Failure probability history
// (for trend chart)
// ─────────────────────────────────────────
const getFailureHistory = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) {
        throw {
            statusCode: 400,
            message: 'Workspace not found.'
        };
    }

    // Last 7 days of snapshots
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo
        .toISOString()
        .split('T')[0];

    const snapshots = await FailureSnapshot.find({
        userId,
        projectKey: config.selectedProjectKey,
        snapshotDate: { $gte: sevenDaysAgoStr }
    })
        .sort({ snapshotDate: 1 })
        .lean();

    return {
        snapshots: snapshots.map(s => ({
            date: s.snapshotDate,
            probability: s.probability,
            factors: s.factors
        })),
        projectKey: config.selectedProjectKey
    };
};

// ─────────────────────────────────────────
// POST: Manual trigger monitoring check
// ─────────────────────────────────────────
const triggerManualCheck = async (userId) => {
    await logAgentActivity(
        userId,
        'Manual monitoring check triggered by user.',
        'CHECK'
    );

    const result = await runMonitoringChecks(userId);

    await logAgentActivity(
        userId,
        `Manual check complete — ${result.alertsCreated} new alert(s) generated.`,
        result.alertsCreated > 0 ? 'ALERT' : 'CHECK'
    );

    return result;
};

module.exports = {
    runMonitoringChecks,
    takeDailySnapshot,
    getMonitoringData,
    resolveAlert,
    snoozeAlert,
    clearResolvedAlerts,
    getFailureHistory,
    triggerManualCheck,
    logAgentActivity
};