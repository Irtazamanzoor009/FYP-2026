const decisionService = require('../services/decisionService');

// GET /api/decisions
exports.getDecisionLogs = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const filters = {
            status: req.query.status || 'ALL',
            search: req.query.search || '',
            page: req.query.page || 1,
            limit: req.query.limit || 20
        };

        const data = await decisionService.getDecisionLogs(
            userId,
            filters
        );

        res.status(200).json({
            success: true,
            message: 'Decision logs fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/decisions/:id
exports.getDecisionLogById = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const logId = req.params.id;
        const data = await decisionService.getDecisionLogById(
            userId,
            logId
        );

        res.status(200).json({
            success: true,
            message: 'Decision log fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/decisions/:id/undo
exports.undoDecision = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const logId = req.params.id;
        const result = await decisionService.undoDecision(
            userId,
            logId
        );

        res.status(200).json({
            success: true,
            message: 'Action undone successfully',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/decisions/summary
exports.getAuditSummary = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await decisionService.getAuditSummary(userId);

        res.status(200).json({
            success: true,
            message: 'Audit summary fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/decisions/export
exports.exportAuditLog = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await decisionService.exportAuditLog(userId);

        res.status(200).json({
            success: true,
            message: 'Audit log exported successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};