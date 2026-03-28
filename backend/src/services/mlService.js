const { log, error } = require('../utils/logger');
const { calculateSprintProbability } = require('../utils/probabilityUtils');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ||
    'http://localhost:8001';

// ─────────────────────────────────────────
// Call FastAPI ML service
// ─────────────────────────────────────────
const predictSprintOutcome = async (sprintCache) => {
    const { activeSprint, teamWorkload, averageVelocity } = sprintCache;

    const today = new Date();
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const totalDays = Math.max(
        Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1
    );
    const daysElapsed = Math.max(
        Math.ceil((today - start) / (1000 * 60 * 60 * 24)), 1
    );
    const daysLeft = Math.max(totalDays - daysElapsed, 0);

    const issues = activeSprint.issues;
    const totalIssues = Math.max(issues.length, 1);
    const blockedCount = issues.filter(i => i.isBlocked).length;
    const overdueCount = issues.filter(
        i => i.isOverdue && i.status !== 'Done'
    ).length;
    const highPriorityIncomplete = issues.filter(
        i => i.status !== 'Done' &&
            (i.priority === 'Highest' || i.priority === 'High')
    ).length;
    const totalHighPriority = Math.max(
        issues.filter(
            i => i.priority === 'Highest' || i.priority === 'High'
        ).length, 1
    );

    const completedPoints = activeSprint.completedStoryPoints;
    const totalPoints = activeSprint.totalStoryPoints;

    const currentVelocity = daysElapsed > 0
        ? completedPoints / daysElapsed : 0;
    const remaining = totalPoints - completedPoints;
    const requiredVelocity = daysLeft > 0
        ? remaining / daysLeft : 999;
    const velocityRatio = requiredVelocity > 0
        ? Math.min(currentVelocity / requiredVelocity, 3.0) : 2.0;

    const overloadedCount = teamWorkload.filter(
        m => m.status === 'Overloaded'
    ).length;
    const overloadedRatio = teamWorkload.length > 0
        ? overloadedCount / teamWorkload.length : 0;

    const features = {
        velocity_ratio: Math.round(velocityRatio * 1000) / 1000,
        completion_pct: totalPoints > 0
            ? Math.round((completedPoints / totalPoints) * 1000) / 10 : 0,
        days_elapsed_ratio: Math.round(
            (daysElapsed / totalDays) * 1000
        ) / 1000,
        overloaded_members_ratio: Math.round(overloadedRatio * 1000) / 1000,
        blocked_tasks_ratio: Math.round(
            (blockedCount / totalIssues) * 1000
        ) / 1000,
        overdue_tasks_ratio: Math.round(
            (overdueCount / totalIssues) * 1000
        ) / 1000,
        scope_ratio: Math.round(
            (totalPoints / Math.max(averageVelocity, 1)) * 1000
        ) / 1000,
        high_priority_incomplete_ratio: Math.round(
            (highPriorityIncomplete / totalHighPriority) * 1000
        ) / 1000,
        sprint_name: activeSprint.name,
        days_left: daysLeft,
        blocked_count: blockedCount,
        overloaded_count: overloadedCount
    };

    try {
        const response = await fetch(
            `${ML_SERVICE_URL}/predict`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(features),
                signal: AbortSignal.timeout(5000) // 5 second timeout
            }
        );

        if (!response.ok) {
            throw new Error(`ML service returned ${response.status}`);
        }

        const result = await response.json();
        log(`✅ ML prediction: ${result.outcome} (${result.success_probability}%)`);

        return {
            ...result,
            source: 'ml_model',
            features
        };

    } catch (err) {
        error(`❌ ML service unavailable: ${err.message}`);

        // Fallback to rule-based calculation
        return getRuleBasedFallback(
            activeSprint,
            teamWorkload,
            daysLeft,
            totalDays,
            daysElapsed
        );
    }
};

// ─────────────────────────────────────────
// Rule-based fallback when ML unavailable
// ─────────────────────────────────────────
const getRuleBasedFallback = (
    activeSprint,
    teamWorkload,
    daysLeft,
    totalDays,
    daysElapsed
) => {
    // Build a minimal sprintCache object
    const mockCache = {
        activeSprint,
        teamWorkload,
        averageVelocity: 46
    };

    const { probability, factors } = calculateSprintProbability(mockCache);

    return {
        success_probability: probability,
        failure_probability: 100 - probability,
        confidence: 65,
        outcome: probability >= 70
            ? 'LIKELY TO SUCCEED'
            : probability >= 40
                ? 'AT RISK'
                : 'LIKELY TO FAIL',
        outcome_color: probability >= 70 ? 'green'
            : probability >= 40 ? 'yellow' : 'red',
        factors: [],
        recommendations: [{
            action: 'ML service unavailable. Using rule-based analysis.',
            impact: 'Connect ML service for detailed predictions',
            priority: 'LOW'
        }],
        source: 'rule_based',
        model_accuracy: null
    };
};

// ─────────────────────────────────────────
// Check if ML service is available
// ─────────────────────────────────────────
const checkMLHealth = async () => {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            signal: AbortSignal.timeout(3000)
        });
        const data = await response.json();
        return { available: true, ...data };
    } catch (err) {
        return { available: false };
    }
};

module.exports = { predictSprintOutcome, checkMLHealth };