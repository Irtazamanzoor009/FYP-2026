const express = require('express');
const router = express.Router();
const sprintPlannerController = require('../controllers/sprintPlannerController');
const auth = require('../middleware/auth');

router.use(auth);

// POST /api/sprint-planner/estimate
// Estimate duration for a single task
router.post('/estimate', sprintPlannerController.estimateTask);

// POST /api/sprint-planner/plan
// Generate full sprint plan with ML estimates + assignments
router.post('/plan', sprintPlannerController.planSprint);

// POST /api/sprint-planner/push-to-jira
// Create sprint and all tasks in Jira as FUTURE sprint
router.post('/push-to-jira', sprintPlannerController.pushToJira);

// POST /api/sprint-planner/check-dependency
// Check if adding a dependency creates a circular reference
router.post('/check-dependency', sprintPlannerController.checkDependency);

// GET /api/sprint-planner/anomaly-check
// Run anomaly detection on current sprint state
router.get('/anomaly-check', sprintPlannerController.checkAnomalies);

// GET /api/sprint-planner/anomaly-model-info
// Get info about which anomaly model is active for this user
router.get('/anomaly-model-info', sprintPlannerController.getAnomalyModelInfo);


// POST /api/sprint-planner/retrain-anomaly (TESTING ONLY)
router.post('/retrain-anomaly', async (req, res, next) => {
    try {
        const { retrainPersonalModel } = require('../services/anomalyService');
        await retrainPersonalModel(req.user._id);
        res.json({ success: true, message: 'Retraining triggered' });
    } catch (err) { next(err); }
});


// GET /api/sprint-planner/history
// Returns all sprint plans with predicted vs actual comparison
router.get('/history', async (req, res, next) => {
    try {
        const SprintPlan = require('../models/SprintPlan');
        const WorkspaceConfig = require('../models/WorkspaceConfig');

        const config = await WorkspaceConfig.findOne({
            userId: req.user._id
        });

        const plans = await SprintPlan.find({
            userId: req.user._id,
            ...(config?.selectedProjectKey && {
                projectKey: config.selectedProjectKey
            })
        }).sort({ createdAt: -1 }).limit(20);

        res.json({
            success: true,
            message: 'Sprint history fetched successfully',
            data: plans
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/sprint-planner/duration-model-info
// Returns info about which duration model is active for this user
router.get('/duration-model-info', async (req, res, next) => {
    try {
        const ML_SERVICE_URL =
            process.env.ML_SERVICE_URL || 'http://localhost:8001';
        const userId = req.user._id.toString();

        const response = await fetch(
            `${ML_SERVICE_URL}/duration-model-info/${userId}`,
            { signal: AbortSignal.timeout(3000) }
        );

        if (!response.ok) {
            return res.json({
                success: true,
                data: {
                    active_model: 'global',
                    note: 'Using global baseline model.'
                }
            });
        }

        const data = await response.json();
        res.json({ success: true, data });
    } catch (err) {
        res.json({
            success: true,
            data: {
                active_model: 'global',
                note: 'ML service unavailable.'
            }
        });
    }
});

// POST /api/sprint-planner/trigger-retraining (TESTING ONLY)
// Manually trigger retraining for a specific sprint
router.post('/trigger-retraining', async (req, res, next) => {
    try {
        const { captureAndRetrain } = require(
            '../services/durationRetrainingService'
        );
        const { sprintId } = req.body;

        if (!sprintId) {
            throw { statusCode: 400, message: 'sprintId is required' };
        }

        // Run async, don't wait — respond immediately
        captureAndRetrain(req.user._id, parseInt(sprintId))
            .then(() => {
                require('../utils/logger').log(
                    `✅ Manual retraining complete for sprint ${sprintId}`
                );
            })
            .catch(err => {
                require('../utils/logger').error(
                    '❌ Manual retraining error:', err.message
                );
            });

        res.json({
            success: true,
            message: `Retraining triggered for sprint ${sprintId}. ` +
                     `Check backend logs for progress.`
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;