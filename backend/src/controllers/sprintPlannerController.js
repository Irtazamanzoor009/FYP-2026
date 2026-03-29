const sprintPlannerService = require('../services/sprintPlannerService');
const anomalyService = require('../services/anomalyService');

// POST /api/sprint-planner/estimate
exports.estimateTask = async (req, res, next) => {
    try {
        const { title, description, priority, storyPoints } = req.body;
        if (!title) throw { statusCode: 400, message: 'title is required' };

        const result = await sprintPlannerService.estimateTask({
            title, description, priority, storyPoints
        });

        res.status(200).json({
            success: true,
            message: 'Duration estimated successfully',
            data: result
        });
    } catch (err) { next(err); }
};

// POST /api/sprint-planner/plan
exports.planSprint = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const planData = req.body;

        if (!planData.sprintName) {
            throw { statusCode: 400, message: 'sprintName is required' };
        }
        if (!planData.tasks || planData.tasks.length === 0) {
            throw { statusCode: 400, message: 'tasks array is required' };
        }

        const result = await sprintPlannerService.planSprint(userId, planData);

        res.status(200).json({
            success: true,
            message: 'Sprint plan generated',
            data: result
        });
    } catch (err) { next(err); }
};

// POST /api/sprint-planner/push-to-jira
exports.pushToJira = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const planData = req.body;

        if (!planData.sprintName || !planData.tasks) {
            throw { statusCode: 400, message: 'sprintName and tasks are required' };
        }

        const result = await sprintPlannerService.createSprintInJira(
            userId, planData
        );

        res.status(200).json({
            success: true,
            message: 'Sprint created in Jira as FUTURE sprint',
            data: result
        });
    } catch (err) { next(err); }
};

// POST /api/sprint-planner/check-dependency
exports.checkDependency = async (req, res, next) => {
    try {
        const { tasks, newTaskId, dependsOnId } = req.body;

        const isCircular = sprintPlannerService.detectCircularDependency(
            tasks || [], newTaskId, dependsOnId
        );

        res.status(200).json({
            success: true,
            data: {
                isCircular,
                message: isCircular
                    ? `Circular dependency detected between ${newTaskId} and ${dependsOnId}`
                    : 'No circular dependency detected'
            }
        });
    } catch (err) { next(err); }
};

// GET /api/sprint-planner/anomaly-check
exports.checkAnomalies = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await anomalyService.detectAnomalies(userId);

        res.status(200).json({
            success: true,
            message: 'Anomaly check complete',
            data: result
        });
    } catch (err) { next(err); }
};

// GET /api/sprint-planner/anomaly-model-info
exports.getAnomalyModelInfo = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const info = await anomalyService.getAnomalyModelInfo(userId.toString());

        res.status(200).json({
            success: true,
            data: info || { message: 'No model info available' }
        });
    } catch (err) { next(err); }
};