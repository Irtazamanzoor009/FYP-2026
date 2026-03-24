const RiskCache = require('../models/RiskCache');
const SprintCache = require('../models/SprintCache');
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
        error('❌ Gemini call failed:', err.message);
        return fallback;
    }
};

// ─────────────────────────────────────────
// HELPER: Parse Gemini JSON safely
// ─────────────────────────────────────────
const parseGeminiJSON = (text, fallback) => {
    try {
        const cleaned = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(cleaned);
    } catch (err) {
        error('❌ Gemini JSON parse failed:', err.message);
        return fallback;
    }
};

// ─────────────────────────────────────────
// HELPER: Get user cache and config
// ─────────────────────────────────────────
const getUserData = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });
    if (!config || !config.isConnected) {
        throw {
            statusCode: 400,
            message: 'Jira workspace not connected.'
        };
    }

    const sprintCache = await SprintCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    if (!sprintCache) {
        throw {
            statusCode: 404,
            message: 'No sprint data found. Please refresh data first.'
        };
    }

    return { sprintCache, config };
};

// ─────────────────────────────────────────
// STEP 1: Calculate sprint success probability
// ─────────────────────────────────────────
const calculateSprintSuccessProbability = (sprintCache) => {
    const {
        activeSprint,
        teamWorkload,
        averageVelocity
    } = sprintCache;

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

    const remaining = activeSprint.totalStoryPoints -
        activeSprint.completedStoryPoints;

    // Factor 1: Velocity feasibility (0-40)
    const currentDailyVelocity = daysElapsed > 0
        ? activeSprint.completedStoryPoints / daysElapsed
        : 0;
    const requiredDailyVelocity = daysLeft > 0
        ? remaining / daysLeft
        : 999;
    const velocityRatio = requiredDailyVelocity > 0
        ? currentDailyVelocity / requiredDailyVelocity
        : 1;
    const velocityScore = Math.min(velocityRatio * 40, 40);

    // Factor 2: Team capacity (0-30)
    const overloadedCount = teamWorkload.filter(
        m => m.status === 'Overloaded'
    ).length;
    const totalMembers = teamWorkload.length;
    const healthyRatio = totalMembers > 0
        ? (totalMembers - overloadedCount) / totalMembers
        : 1;
    const teamScore = healthyRatio * 30;

    // Factor 3: Risk indicators (0-30)
    const issues = activeSprint.issues;
    const blockedCount = issues.filter(i => i.isBlocked).length;
    const overdueCount = issues.filter(i => i.isOverdue).length;
    const totalIssues = issues.length;
    const riskRatio = totalIssues > 0
        ? 1 - ((blockedCount + overdueCount) / totalIssues)
        : 1;
    const riskScore = riskRatio * 30;

    const probability = Math.min(
        Math.max(
            Math.round(velocityScore + teamScore + riskScore), 0
        ), 100
    );

    return {
        probability,
        factors: {
            velocityScore: Math.round(velocityScore),
            teamScore: Math.round(teamScore),
            riskScore: Math.round(riskScore),
            currentDailyVelocity: Math.round(
                currentDailyVelocity * 10
            ) / 10,
            requiredDailyVelocity: Math.round(
                requiredDailyVelocity * 10
            ) / 10,
            daysLeft,
            remainingPoints: remaining
        }
    };
};

// ─────────────────────────────────────────
// STEP 2: Calculate risk scores (rule-based)
// ─────────────────────────────────────────
const calculateRiskScores = (sprintCache) => {
    const { activeSprint, teamWorkload, averageVelocity } = sprintCache;
    const issues = activeSprint.issues;
    const risks = [];

    const today = new Date();
    const end = new Date(activeSprint.endDate);
    const start = new Date(activeSprint.startDate);
    const totalDays = Math.max(
        Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1
    );
    const daysElapsed = Math.max(
        Math.ceil((today - start) / (1000 * 60 * 60 * 24)), 1
    );
    const daysLeft = Math.max(totalDays - daysElapsed, 0);

    // Risk 1: OVERLOAD — team members above 80%
    const overloadedMembers = teamWorkload.filter(
        m => m.rawPercentage > 80
    );
    if (overloadedMembers.length > 0) {
        const worstMember = overloadedMembers.sort(
            (a, b) => b.rawPercentage - a.rawPercentage
        )[0];

        let score = 0;
        if (worstMember.rawPercentage > 130) score = 92;
        else if (worstMember.rawPercentage > 100) score = 78;
        else if (worstMember.rawPercentage > 80) score = 55;

        risks.push({
            type: 'OVERLOAD',
            level: score >= 80 ? 'CRITICAL'
                : score >= 60 ? 'HIGH'
                    : 'MEDIUM',
            score,
            affectedMembers: overloadedMembers.map(m => ({
                name: m.name,
                workload: m.rawPercentage
            })),
            affectedIssues: [],
            rawData: {
                worstMember,
                overloadedCount: overloadedMembers.length,
                totalMembers: teamWorkload.length
            }
        });
    }

    // Risk 2: BOTTLENECK — blocked tasks
    const blockedTasks = issues.filter(i => i.isBlocked);
    if (blockedTasks.length > 0) {
        const criticalBlocked = blockedTasks.filter(
            i => i.priority === 'Highest' || i.priority === 'High'
        );

        let score = 0;
        if (criticalBlocked.length >= 3) score = 94;
        else if (criticalBlocked.length === 2) score = 78;
        else if (criticalBlocked.length === 1) score = 60;
        else score = 40;

        risks.push({
            type: 'BOTTLENECK',
            level: score >= 80 ? 'CRITICAL'
                : score >= 60 ? 'HIGH'
                    : 'MEDIUM',
            score,
            affectedIssues: blockedTasks.map(t => ({
                key: t.key,
                summary: t.summary,
                priority: t.priority,
                blockedBy: t.blockedBy
            })),
            affectedMembers: [],
            rawData: {
                blockedCount: blockedTasks.length,
                criticalBlockedCount: criticalBlocked.length
            }
        });
    }

    // Risk 3: DEADLINE — velocity vs requirement
    const remaining = activeSprint.totalStoryPoints -
        activeSprint.completedStoryPoints;
    const currentVelocity = daysElapsed > 0
        ? activeSprint.completedStoryPoints / daysElapsed
        : 0;
    const requiredVelocity = daysLeft > 0
        ? remaining / daysLeft
        : 999;

    if (requiredVelocity > currentVelocity) {
        const gap = requiredVelocity > 0
            ? (requiredVelocity - currentVelocity) / requiredVelocity
            : 0;

        let score = 0;
        if (gap > 0.8) score = 88;
        else if (gap > 0.6) score = 70;
        else if (gap > 0.4) score = 52;
        else if (gap > 0.2) score = 35;

        if (score > 0) {
            risks.push({
                type: 'DEADLINE',
                level: score >= 80 ? 'CRITICAL'
                    : score >= 60 ? 'HIGH'
                        : 'MEDIUM',
                score,
                affectedIssues: [],
                affectedMembers: [],
                rawData: {
                    currentVelocity: Math.round(currentVelocity * 10) / 10,
                    requiredVelocity: Math.round(requiredVelocity * 10) / 10,
                    gapPercent: Math.round(gap * 100),
                    daysLeft,
                    remainingPoints: remaining,
                    averageVelocity
                }
            });
        }
    }

    // Risk 4: VELOCITY — current vs historical average
    if (averageVelocity > 0 && daysElapsed >= 3) {
        const projectedVelocity = currentVelocity * totalDays;
        const velocityDropPercent = averageVelocity > 0
            ? (averageVelocity - projectedVelocity) / averageVelocity
            : 0;

        if (velocityDropPercent > 0.2) {
            let score = 0;
            if (velocityDropPercent > 0.5) score = 75;
            else if (velocityDropPercent > 0.3) score = 58;
            else score = 40;

            risks.push({
                type: 'VELOCITY',
                level: score >= 60 ? 'HIGH' : 'MEDIUM',
                score,
                affectedIssues: [],
                affectedMembers: [],
                rawData: {
                    currentVelocity: Math.round(
                        currentVelocity * 10
                    ) / 10,
                    projectedVelocity: Math.round(projectedVelocity),
                    averageVelocity,
                    dropPercent: Math.round(velocityDropPercent * 100)
                }
            });
        }
    }

    // Sort by score descending
    return risks.sort((a, b) => b.score - a.score);
};

// ─────────────────────────────────────────
// STEP 3: Generate Gemini explanations for risks
// ─────────────────────────────────────────
const generateRiskExplanations = async (risks, sprintName) => {
    if (risks.length === 0) return [];

    const prompt = `
You are a project management AI analyzing sprint: "${sprintName}".
Generate explanations for these detected risks.

Risks detected:
${JSON.stringify(risks.map(r => ({
        type: r.type,
        level: r.level,
        score: r.score,
        data: r.rawData
    })), null, 2)}

Return a JSON array with one object per risk in the SAME ORDER.
Each object must have exactly these fields:
- type: same type as input
- why: ONE sentence explaining why this risk exists. Use specific names and numbers from the data.
- action: ONE actionable sentence starting with a verb. Be specific about what to do.

Rules:
- why must reference actual numbers from rawData
- action must be a concrete specific step
- No markdown, no extra text
- Return valid JSON array only

Example:
[
  {
    "type": "OVERLOAD",
    "why": "Lead developer Irtaza Manzoor has 3 high-priority tasks overlapping with 130% workload capacity.",
    "action": "Move Backend API task WR-30 to Jawad Ali who has 60% available capacity."
  }
]
`;

    const fallbackExplanations = risks.map(r => ({
        type: r.type,
        why: r.type === 'OVERLOAD'
            ? `${r.affectedMembers[0]?.name || 'A team member'} is at ${r.affectedMembers[0]?.workload || 'high'}% workload capacity.`
            : r.type === 'BOTTLENECK'
                ? `${r.rawData?.blockedCount || 'Multiple'} tasks are blocked by unresolved dependencies.`
                : r.type === 'DEADLINE'
                    ? `Current velocity of ${r.rawData?.currentVelocity || 0} is below the required ${r.rawData?.requiredVelocity || 0} points per day.`
                    : `Sprint velocity is ${r.rawData?.dropPercent || 0}% below historical average.`,
        action: r.type === 'OVERLOAD'
            ? 'Reassign high-priority tasks to team members with available capacity.'
            : r.type === 'BOTTLENECK'
                ? 'Resolve the blocking dependencies immediately to unblock critical tasks.'
                : r.type === 'DEADLINE'
                    ? 'Consider descoping low-priority tasks or extending the sprint deadline.'
                    : 'Review and replan remaining sprint scope to match team capacity.'
    }));

    const geminiText = await callGemini(prompt, null);
    if (!geminiText) return fallbackExplanations;

    const parsed = parseGeminiJSON(geminiText, fallbackExplanations);
    if (!Array.isArray(parsed)) return fallbackExplanations;

    // Merge explanations with risk data
    return risks.map((risk, i) => ({
        type: risk.type,
        level: risk.level,
        score: risk.score,
        affectedIssues: risk.affectedIssues || [],
        affectedMembers: risk.affectedMembers || [],
        rawData: risk.rawData,
        why: parsed[i]?.why || fallbackExplanations[i]?.why || '',
        action: parsed[i]?.action || fallbackExplanations[i]?.action || ''
    }));
};

// ─────────────────────────────────────────
// STEP 4: Build predictive risk timeline
// ─────────────────────────────────────────
const buildRiskTimeline = (sprintCache) => {
    const { activeSprint, teamWorkload } = sprintCache;
    const issues = activeSprint.issues;

    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const totalDays = Math.ceil(
        (end - start) / (1000 * 60 * 60 * 24)
    );

    const timeline = [];

    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + day - 1);
        const dateStr = currentDate.toISOString().split('T')[0];

        const riskEvents = [];

        // Check: any tasks due on this day that
        // are still not done
        const tasksDueThisDay = issues.filter(issue => {
            if (!issue.dueDate) return false;
            const dueDate = new Date(issue.dueDate)
                .toISOString().split('T')[0];
            return dueDate === dateStr &&
                issue.status !== 'Done';
        });

        if (tasksDueThisDay.length >= 2) {
            riskEvents.push({
                riskType: 'DEADLINE',
                label: `${tasksDueThisDay.length} Tasks Due`,
                severity: tasksDueThisDay.some(
                    t => t.priority === 'Highest' ||
                        t.priority === 'High'
                ) ? 'CRITICAL' : 'HIGH'
            });
        } else if (tasksDueThisDay.length === 1) {
            const task = tasksDueThisDay[0];
            if (task.priority === 'Highest' ||
                task.priority === 'High') {
                riskEvents.push({
                    riskType: 'DEADLINE',
                    label: `${task.key} Due`,
                    severity: 'HIGH'
                });
            }
        }

        // Check: overloaded member peak days
        // (day 7-10 is typically burnout peak)
        if (day >= 7 && day <= 10) {
            const overloadedMembers = teamWorkload.filter(
                m => m.rawPercentage > 100
            );
            if (overloadedMembers.length > 0) {
                riskEvents.push({
                    riskType: 'OVERLOAD',
                    label: 'Dev Burnout Risk',
                    severity: overloadedMembers.length >= 2
                        ? 'CRITICAL'
                        : 'HIGH'
                });
            }
        }

        // Check: blocked tasks cluster
        // (creates congestion risk around sprint midpoint)
        const midpoint = Math.floor(totalDays / 2);
        if (day === midpoint) {
            const blockedCount = issues.filter(
                i => i.isBlocked
            ).length;
            if (blockedCount > 0) {
                riskEvents.push({
                    riskType: 'BOTTLENECK',
                    label: `${blockedCount} Tasks Blocked`,
                    severity: blockedCount >= 3
                        ? 'CRITICAL'
                        : 'HIGH'
                });
            }
        }

        // Check: final sprint days — QA congestion
        if (day >= totalDays - 2 && day <= totalDays) {
            const incompleteHighPriority = issues.filter(
                i => i.status !== 'Done' &&
                    (i.priority === 'Highest' ||
                        i.priority === 'High')
            );
            if (incompleteHighPriority.length > 3) {
                riskEvents.push({
                    riskType: 'VELOCITY',
                    label: 'QA Congestion Risk',
                    severity: 'HIGH'
                });
            }
        }

        timeline.push({
            day,
            date: dateStr,
            riskEvents,
            hasRisk: riskEvents.length > 0,
            highestSeverity: riskEvents.length > 0
                ? riskEvents.some(e => e.severity === 'CRITICAL')
                    ? 'CRITICAL'
                    : riskEvents.some(e => e.severity === 'HIGH')
                        ? 'HIGH'
                        : 'MEDIUM'
                : null
        });
    }

    return timeline;
};

// ─────────────────────────────────────────
// STEP 5: What-If simulator
// ─────────────────────────────────────────
const simulateWhatIf = async (
    userId,
    scenario,
    sprintCache
) => {
    const { activeSprint, teamWorkload, averageVelocity } = sprintCache;

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
    const remaining = activeSprint.totalStoryPoints -
        activeSprint.completedStoryPoints;

    // Original probability
    const original = calculateSprintSuccessProbability(sprintCache);
    const originalProb = original.probability;

    let newProb = originalProb;
    let scenarioDescription = '';
    let recommendation = '';

    if (scenario === 'MEMBER_LEAVES') {
        // Simulate losing one team member
        // Remaining work distributed among fewer people
        const activeMembers = teamWorkload.length;
        if (activeMembers <= 1) {
            newProb = 5;
        } else {
            // Workload increases for remaining members
            const workloadIncrease = 1 / (activeMembers - 1);
            const newOverloadedCount = teamWorkload.filter(
                m => (m.workloadPercentage * (1 + workloadIncrease)) > 80
            ).length;
            const teamPenalty = newOverloadedCount * 10;

            // Velocity also drops
            const velocityDrop = 0.25;
            const newVelocity = (activeSprint.completedStoryPoints /
                daysElapsed) * (1 - velocityDrop);
            const projectedCompletion = activeSprint.completedStoryPoints +
                (newVelocity * daysLeft);
            const completionRatio = activeSprint.totalStoryPoints > 0
                ? projectedCompletion / activeSprint.totalStoryPoints
                : 0;

            newProb = Math.max(
                Math.round(
                    (completionRatio * 60) - teamPenalty
                ), 5
            );
        }
        scenarioDescription = 'Lead developer takes sick leave';
        recommendation = 'Cross-train team members immediately. Identify backup for critical tasks.';

    } else if (scenario === 'SCOPE_CREEP') {
        // Add 3 new features = approximately 15 more story points
        const additionalPoints = 15;
        const newTotal = activeSprint.totalStoryPoints + additionalPoints;
        const newRemaining = remaining + additionalPoints;
        const currentVelocity = daysElapsed > 0
            ? activeSprint.completedStoryPoints / daysElapsed
            : 0;
        const newRequired = daysLeft > 0
            ? newRemaining / daysLeft
            : 999;
        const newRatio = newRequired > 0
            ? currentVelocity / newRequired
            : 0;
        newProb = Math.max(
            Math.round(newRatio * 70 +
                ((teamWorkload.length -
                    teamWorkload.filter(
                        m => m.status === 'Overloaded'
                    ).length) /
                    Math.max(teamWorkload.length, 1)) * 30
            ), 5
        );
        scenarioDescription = 'Client adds 3 new features (15 points)';
        recommendation = 'Reject new scope or defer low-priority tasks. Sprint scope is already at risk.';

    } else if (scenario === 'DEADLINE_EARLIER') {
        // Deadline moves 3 days earlier
        const newDaysLeft = Math.max(daysLeft - 3, 0);
        if (newDaysLeft === 0) {
            newProb = 2;
        } else {
            const currentVelocity = daysElapsed > 0
                ? activeSprint.completedStoryPoints / daysElapsed
                : 0;
            const newRequired = remaining / newDaysLeft;
            const ratio = newRequired > 0
                ? currentVelocity / newRequired
                : 0;
            newProb = Math.max(
                Math.round(ratio * 60 +
                    ((teamWorkload.length -
                        teamWorkload.filter(
                            m => m.status === 'Overloaded'
                        ).length) /
                        Math.max(teamWorkload.length, 1)) * 20
                ), 2
            );
        }
        scenarioDescription = 'Deadline moved 3 days earlier';
        recommendation = 'Immediately descope 3-4 low-priority tasks to meet the new deadline.';

    } else if (scenario === 'NONE') {
        newProb = originalProb;
        scenarioDescription = 'No scenario active';
        recommendation = 'System stable. No external threats detected.';
    }

    // Generate Gemini recommendation
    if (scenario !== 'NONE') {
        const prompt = `
Sprint: "${activeSprint.name}"
Scenario simulated: ${scenarioDescription}
Original success probability: ${originalProb}%
New success probability after scenario: ${newProb}%
Sprint data: ${remaining} points remaining, ${daysLeft} days left.

Write ONE specific recommendation sentence (max 20 words)
for the project manager to handle this scenario.
No JSON. Just the sentence.
`;
        const geminiRec = await callGemini(prompt, recommendation);
        if (geminiRec && geminiRec.length < 200) {
            recommendation = geminiRec;
        }
    }

    return {
        scenario,
        scenarioDescription,
        originalProbability: originalProb,
        newProbability: Math.min(Math.max(newProb, 0), 100),
        change: newProb - originalProb,
        recommendation
    };
};

// ─────────────────────────────────────────
// MAIN: Sync risk cache
// ─────────────────────────────────────────
const syncRiskCache = async (userId) => {
    const { sprintCache, config } = await getUserData(userId);

    log(`🔄 Syncing risk cache for user: ${userId}`);

    // Calculate success probability
    const successProb = calculateSprintSuccessProbability(sprintCache);

    // Calculate risk scores
    const rawRisks = calculateRiskScores(sprintCache);

    // Generate Gemini explanations
    const risksWithExplanations = await generateRiskExplanations(
        rawRisks,
        sprintCache.activeSprint.name
    );

    // Build risk timeline
    const timeline = buildRiskTimeline(sprintCache);

    // Pre-calculate all what-if scenarios
    const scenarios = ['NONE', 'MEMBER_LEAVES', 'SCOPE_CREEP', 'DEADLINE_EARLIER'];
    const whatIfResults = [];

    for (const scenario of scenarios) {
        const result = await simulateWhatIf(
            userId,
            scenario,
            sprintCache
        );
        whatIfResults.push(result);
    }

    // Save to RiskCache
    const riskCache = await RiskCache.findOneAndUpdate(
        { userId, projectKey: config.selectedProjectKey },
        {
            userId,
            projectKey: config.selectedProjectKey,
            sprintId: sprintCache.activeSprint.id,
            sprintName: sprintCache.activeSprint.name,
            sprintSuccessProbability: successProb.probability,
            risks: risksWithExplanations.map(r => ({
                type: r.type,
                level: r.level,
                score: r.score,
                why: r.why,
                action: r.action,
                affectedIssues: r.affectedIssues || [],
                affectedMembers: r.affectedMembers || []
            })),
            timeline,
            whatIfResults,
            cachedAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        },
        { new: true, upsert: true }
    );

    log(`✅ Risk cache synced. Risks found: ${risksWithExplanations.length}`);
    log(`✅ Sprint success probability: ${successProb.probability}%`);

    return riskCache;
};

// ─────────────────────────────────────────
// MAIN: Get risk data (from cache or fresh)
// ─────────────────────────────────────────
const getRiskData = async (userId) => {
    const { sprintCache, config } = await getUserData(userId);

    let riskCache = await RiskCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    const isFresh = riskCache &&
        riskCache.expiresAt > new Date();

    if (!isFresh) {
        log('🔄 Risk cache expired. Recalculating...');
        riskCache = await syncRiskCache(userId);
    } else {
        log('⚡ Serving risk data from cache');
    }

    return {
        sprintName: riskCache.sprintName,
        sprintSuccessProbability: riskCache.sprintSuccessProbability,
        risks: riskCache.risks,
        timeline: riskCache.timeline,
        whatIfResults: riskCache.whatIfResults,
        cachedAt: riskCache.cachedAt,
        projectKey: config.selectedProjectKey
    };
};

// ─────────────────────────────────────────
// GET: What-If simulation on demand
// ─────────────────────────────────────────
const runWhatIfSimulation = async (userId, scenario) => {
    const validScenarios = [
        'NONE',
        'MEMBER_LEAVES',
        'SCOPE_CREEP',
        'DEADLINE_EARLIER'
    ];

    if (!validScenarios.includes(scenario)) {
        throw {
            statusCode: 400,
            message: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}`
        };
    }

    const { sprintCache } = await getUserData(userId);
    const result = await simulateWhatIf(userId, scenario, sprintCache);

    return result;
};

// ─────────────────────────────────────────
// POST: Generate mitigation plan
// ─────────────────────────────────────────
const generateMitigationPlan = async (userId) => {
    const { sprintCache, config } = await getUserData(userId);

    const riskCache = await RiskCache.findOne({
        userId,
        projectKey: config.selectedProjectKey
    });

    if (!riskCache || riskCache.risks.length === 0) {
        return {
            plan: 'No significant risks detected. Sprint appears to be on track.',
            risks: []
        };
    }

    const topRisks = riskCache.risks.slice(0, 3);

    const prompt = `
You are a project management expert.
Sprint: "${riskCache.sprintName}"
Sprint success probability: ${riskCache.sprintSuccessProbability}%

Top risks detected:
${JSON.stringify(topRisks.map(r => ({
        type: r.type,
        level: r.level,
        score: r.score,
        why: r.why,
        action: r.action
    })), null, 2)}

Generate a brief mitigation plan with exactly 3 steps.
Each step must:
- Start with a number (1., 2., 3.)
- Be one clear actionable sentence
- Reference specific risk types from above
- Be achievable within the sprint timeframe

Return ONLY the 3 numbered steps as plain text.
No JSON. No headers. No extra explanation.
`;

    const fallback = topRisks.map(
        (r, i) => `${i + 1}. ${r.action}`
    ).join('\n');

    const plan = await callGemini(prompt, fallback);

    return {
        sprintName: riskCache.sprintName,
        successProbability: riskCache.sprintSuccessProbability,
        plan: plan || fallback,
        topRisks: topRisks.map(r => ({
            type: r.type,
            level: r.level,
            action: r.action
        }))
    };
};

module.exports = {
    getRiskData,
    syncRiskCache,
    runWhatIfSimulation,
    generateMitigationPlan
};