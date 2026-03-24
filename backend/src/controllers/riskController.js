const riskService = require('../services/riskService');

// GET /api/risk
exports.getRiskData = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await riskService.getRiskData(userId);

        res.status(200).json({
            success: true,
            message: 'Risk data fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/risk/refresh
exports.refreshRiskData = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await riskService.syncRiskCache(userId);

        res.status(200).json({
            success: true,
            message: 'Risk data refreshed successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/risk/whatif/:scenario
exports.runWhatIf = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { scenario } = req.params;
        const result = await riskService.runWhatIfSimulation(
            userId,
            scenario.toUpperCase()
        );

        res.status(200).json({
            success: true,
            message: 'What-If simulation completed',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/risk/mitigation-plan
exports.getMitigationPlan = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await riskService.generateMitigationPlan(userId);

        res.status(200).json({
            success: true,
            message: 'Mitigation plan generated',
            data: result
        });
    } catch (err) {
        next(err);
    }
};