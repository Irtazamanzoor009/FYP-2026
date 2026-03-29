const SprintCache = require('../models/SprintCache');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const { log, error } = require('../utils/logger');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

const callML = async (endpoint, body, method = 'POST') => {
    try {
        const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method !== 'GET' ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error(`ML returned ${response.status}`);
        return await response.json();
    } catch (err) {
        error(`❌ ML anomaly call failed:`, err.message);
        return null;
    }
};

// ─────────────────────────────────────────
// Build daily metrics from sprint cache
// ─────────────────────────────────────────
const buildCurrentMetrics = (sprintCache) => {
    const { activeSprint, teamWorkload } = sprintCache;
    const issues = activeSprint.issues;
    const total = Math.max(issues.length, 1);

    const today = new Date();
    const start = new Date(activeSprint.startDate);
    const daysElapsed = Math.max(
        Math.ceil((today - start) / (1000 * 60 * 60 * 24)), 1
    );

    const dailyVelocity = daysElapsed > 0
        ? activeSprint.completedStoryPoints / daysElapsed
        : 0;

    const inProgressCount = issues.filter(
        i => i.statusCategory === 'indeterminate'
    ).length;

    const blockedCount = issues.filter(i => i.isBlocked).length;
    const overdueCount = issues.filter(
        i => i.isOverdue && i.status !== 'Done'
    ).length;

    const overloadedCount = teamWorkload.filter(
        m => m.status === 'Overloaded'
    ).length;
    const workloadRatio = teamWorkload.length > 0
        ? (teamWorkload.reduce((sum, m) =>
            sum + (m.rawPercentage || m.workloadPercentage || 0), 0
          ) / teamWorkload.length) / 100
        : 0.8;

    return {
        daily_velocity: Math.round(dailyVelocity * 100) / 100,
        tasks_in_progress_ratio: Math.round((inProgressCount / total) * 1000) / 1000,
        blocked_ratio: Math.round((blockedCount / total) * 1000) / 1000,
        overdue_ratio: Math.round((overdueCount / total) * 1000) / 1000,
        workload_ratio: Math.round(workloadRatio * 1000) / 1000
    };
};

// ─────────────────────────────────────────
// Run anomaly detection for a user
// ─────────────────────────────────────────
const detectAnomalies = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) return null;

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });
    if (!sprintCache) return null;

    const metrics = buildCurrentMetrics(sprintCache);

    const result = await callML('/anomaly/predict', {
        user_id: userId.toString(),
        ...metrics
    });

    if (!result) {
        return {
            is_anomaly: false,
            anomaly_score: 0,
            model_type: 'unavailable',
            description: null
        };
    }

    log(`🔍 Anomaly check for ${userId}: score=${result.anomaly_score}, is_anomaly=${result.is_anomaly}`);
    return result;
};

// ─────────────────────────────────────────
// Retrain personal model after sprint ends
// ─────────────────────────────────────────
const retrainPersonalModel = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config) return;

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });
    if (!sprintCache) return;

    const closedSprints = sprintCache.closedSprints || [];
    if (closedSprints.length < 3) {
        log(`⚠️ User ${userId} has ${closedSprints.length} sprints. Need 3+ for personal model.`);
        return;
    }

    // Build daily metrics from closed sprints
    // (simulate daily observations from sprint summary)
    const sprintMetrics = [];

    for (const sprint of closedSprints) {
        const sprintDays = 14;
        const completionRate = sprint.totalPoints > 0
            ? sprint.completedPoints / sprint.totalPoints
            : 0;
        const dailyVelocity = sprint.velocity / sprintDays;

        // Generate synthetic daily observations for this sprint
        for (let day = 1; day <= sprintDays; day++) {
            const dayRatio = day / sprintDays;
            sprintMetrics.push({
                daily_velocity: dailyVelocity * (0.8 + Math.random() * 0.4),
                tasks_in_progress_ratio: 0.4 + (dayRatio * 0.3),
                blocked_ratio: 0.05 + (Math.random() * 0.1),
                overdue_ratio: Math.min(dayRatio * 0.1, 0.2),
                workload_ratio: 0.75 + (Math.random() * 0.3)
            });
        }
    }

    const result = await callML('/anomaly/train', {
        user_id: userId.toString(),
        sprint_metrics: sprintMetrics
    });

    if (result?.success) {
        log(`✅ Personal anomaly model retrained for ${userId} with ${result.n_samples} samples`);
    } else {
        log(`⚠️ Personal model retraining failed: ${result?.reason}`);
    }
};

// ─────────────────────────────────────────
// Get model info for a user
// ─────────────────────────────────────────
const getAnomalyModelInfo = async (userId) => {
    try {
        const response = await fetch(
            `${ML_SERVICE_URL}/anomaly/model-info/${userId}`,
            { signal: AbortSignal.timeout(3000) }
        );
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        return null;
    }
};

module.exports = {
    detectAnomalies,
    retrainPersonalModel,
    getAnomalyModelInfo,
    buildCurrentMetrics
};