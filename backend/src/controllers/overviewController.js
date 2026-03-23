const overviewService = require('../services/overviewService');

// GET /api/overview
// Returns all overview page data served from cache
exports.getOverview = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await overviewService.getOverviewData(userId);

        res.status(200).json({
            success: true,
            message: 'Overview data fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/overview/refresh
// Forces fresh data fetch from Jira ignoring cache
exports.refreshOverview = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await overviewService.refreshOverviewData(userId);

        res.status(200).json({
            success: true,
            message: 'Overview data refreshed from Jira',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/overview/team-workload
// Returns only team workload data
exports.getTeamWorkload = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await overviewService.getOverviewData(userId);

        res.status(200).json({
            success: true,
            message: 'Team workload fetched successfully',
            data: {
                teamWorkload: data.teamWorkload,
                cachedAt: data.cachedAt
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/overview/health-score
// Returns only health score
exports.getHealthScore = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await overviewService.getOverviewData(userId);

        res.status(200).json({
            success: true,
            message: 'Health score fetched successfully',
            data: {
                healthScore: data.healthScore,
                sprintInfo: data.sprintInfo,
                cachedAt: data.cachedAt
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/overview/burndown
// Returns only burndown chart data
exports.getBurndown = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await overviewService.getOverviewData(userId);

        res.status(200).json({
            success: true,
            message: 'Burndown data fetched successfully',
            data: {
                burndown: data.burndown,
                sprintInfo: data.sprintInfo,
                averageVelocity: data.averageVelocity,
                historicalVelocity: data.historicalVelocity,
                cachedAt: data.cachedAt
            }
        });
    } catch (err) {
        next(err);
    }
};