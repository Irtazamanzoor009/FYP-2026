// Single source of truth for sprint success probability

const calculateSprintProbability = (sprintCache) => {
    const {
        activeSprint,
        teamWorkload,
        averageVelocity
    } = sprintCache;

    const today = new Date();
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);

    const totalDays = Math.max(Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1);
    const daysElapsed = Math.max(Math.ceil((today - start) / (1000 * 60 * 60 * 24)), 1);
    const daysLeft = Math.max(totalDays - daysElapsed, 0);

    const remaining = activeSprint.totalStoryPoints -
        activeSprint.completedStoryPoints;
    const currentVelocity = daysElapsed > 0
        ? activeSprint.completedStoryPoints / daysElapsed
        : 0;
    const requiredVelocity = daysLeft > 0
        ? remaining / daysLeft
        : 999;

    // Factor 1: Velocity feasibility (0-40)
    const velocityRatio = requiredVelocity > 0
        ? currentVelocity / requiredVelocity
        : 1;
    const velocityScore = Math.min(velocityRatio * 40, 40);

    // Factor 2: Team capacity (0-30)
    const overloadedCount = teamWorkload.filter(
        m => m.status === 'Overloaded'
    ).length;
    const healthyRatio = teamWorkload.length > 0
        ? (teamWorkload.length - overloadedCount) / teamWorkload.length
        : 1;
    const teamScore = healthyRatio * 30;

    // Factor 3: Risk indicators (0-30)
    const issues = activeSprint.issues;
    const blockedCount = issues.filter(i => i.isBlocked).length;
    const overdueCount = issues.filter(i => i.isOverdue).length;
    const totalIssues = Math.max(issues.length, 1);
    const riskRatio = 1 - ((blockedCount + overdueCount) / totalIssues);
    const riskScore = Math.max(riskRatio * 30, 0);

    const probability = Math.min(
        Math.max(Math.round(velocityScore + teamScore + riskScore), 0), 100
    );

    return {
        probability,
        factors: {
            velocityScore: Math.round(velocityScore),
            teamScore: Math.round(teamScore),
            riskScore: Math.round(riskScore),
            currentVelocity: Math.round(currentVelocity * 10) / 10,
            requiredVelocity: Math.round(requiredVelocity * 10) / 10,
            daysLeft,
            remainingPoints: remaining,
            velocityRatio: Math.round(velocityRatio * 100) / 100
        }
    };
};

module.exports = { calculateSprintProbability };