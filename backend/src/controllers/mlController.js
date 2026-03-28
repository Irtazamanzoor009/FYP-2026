const { predictSprintOutcome, checkMLHealth } = require('../services/mlService');
const SprintCache = require('../models/SprintCache');
const WorkspaceConfig = require('../models/WorkspaceConfig');

// POST /api/ml/predict
exports.predict = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const config = await WorkspaceConfig.findOne({ userId });
        if (!config || !config.isConnected) {
            throw { statusCode: 400, message: 'Jira not connected.' };
        }

        const sprintCache = await SprintCache.findOne({
            userId,
            projectKey: config.selectedProjectKey
        });

        if (!sprintCache) {
            throw {
                statusCode: 404,
                message: 'No sprint data. Refresh first.'
            };
        }

        const result = await predictSprintOutcome(sprintCache);

        res.status(200).json({
            success: true,
            message: 'Prediction generated',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/ml/health
exports.health = async (req, res, next) => {
    try {
        const health = await checkMLHealth();
        res.status(200).json({
            success: true,
            data: health
        });
    } catch (err) {
        next(err);
    }
};