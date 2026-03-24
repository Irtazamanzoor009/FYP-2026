const cron = require('node-cron');
const { log, error } = require('../src/utils/logger');

// ─────────────────────────────────────────
// Import services
// ─────────────────────────────────────────
const {
    runMonitoringChecks,
    takeDailySnapshot,
    logAgentActivity
} = require('../src/services/monitoringService');

const { syncSprintCache } = require('../src/services/overviewService');
const { syncRiskCache } = require('../src/services/riskService');
const WorkspaceConfig = require('../src/models/WorkspaceConfig');

// ─────────────────────────────────────────
// HELPER: Run job for all connected users
// ─────────────────────────────────────────
const runForAllUsers = async (jobName, jobFn) => {
    try {
        const connectedWorkspaces = await WorkspaceConfig.find({
            isConnected: true
        });

        log(`⚙️  ${jobName}: Running for ${connectedWorkspaces.length} workspace(s)`);

        for (const workspace of connectedWorkspaces) {
            try {
                await jobFn(workspace.userId);
            } catch (err) {
                error(`❌ ${jobName} failed for user ${workspace.userId}:`, err.message);
                // Continue with next user even if one fails
            }
        }

        log(`✅ ${jobName}: Complete`);
    } catch (err) {
        error(`❌ ${jobName}: Fatal error:`, err.message);
    }
};

// ─────────────────────────────────────────
// JOB 1: Sync sprint cache every 5 minutes
// ─────────────────────────────────────────
const scheduleSprintSync = () => {
    cron.schedule('*/5 * * * *', async () => {
        log('⏰ Cron: Sprint cache sync starting...');

        await runForAllUsers(
            'SprintSync',
            async (userId) => {
                await syncSprintCache(userId);
                await logAgentActivity(
                    userId,
                    'AI checked sprint velocity — data synchronized from Jira.',
                    'SYNC'
                );
            }
        );
    });

    log('✅ Sprint sync cron scheduled (every 5 minutes)');
};

// ─────────────────────────────────────────
// JOB 2: Sync risk cache every 10 minutes
// ─────────────────────────────────────────
const scheduleRiskSync = () => {
    cron.schedule('*/10 * * * *', async () => {
        log('⏰ Cron: Risk cache sync starting...');

        await runForAllUsers(
            'RiskSync',
            async (userId) => {
                await syncRiskCache(userId);
                await logAgentActivity(
                    userId,
                    'Agentic Engine validated PMBOK Rule #4 (Critical Path) — risk analysis updated.',
                    'VALIDATION'
                );
            }
        );
    });

    log('✅ Risk sync cron scheduled (every 10 minutes)');
};

// ─────────────────────────────────────────
// JOB 3: Run monitoring checks every 5 min
// ─────────────────────────────────────────
const scheduleMonitoringChecks = () => {
    cron.schedule('*/5 * * * *', async () => {
        log('⏰ Cron: Monitoring checks starting...');

        await runForAllUsers(
            'MonitoringChecks',
            async (userId) => {
                await runMonitoringChecks(userId);
            }
        );
    });

    log('✅ Monitoring checks cron scheduled (every 5 minutes)');
};

// ─────────────────────────────────────────
// JOB 4: Daily snapshot at midnight
// ─────────────────────────────────────────
const scheduleDailySnapshot = () => {
    cron.schedule('0 0 * * *', async () => {
        log('⏰ Cron: Daily failure snapshot starting...');

        await runForAllUsers(
            'DailySnapshot',
            async (userId) => {
                await takeDailySnapshot(userId);
            }
        );
    });

    log('✅ Daily snapshot cron scheduled (midnight)');
};

// ─────────────────────────────────────────
// MAIN: Schedule all cron jobs
// ─────────────────────────────────────────
const scheduleCronJobs = () => {
    log('⚙️  Initializing cron jobs...');

    scheduleSprintSync();
    scheduleRiskSync();
    scheduleMonitoringChecks();
    scheduleDailySnapshot();

    log('✅ All cron jobs scheduled successfully');
};

module.exports = { scheduleCronJobs };