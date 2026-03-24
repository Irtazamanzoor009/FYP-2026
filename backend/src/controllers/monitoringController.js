const monitoringService = require('../services/monitoringService');

// GET /api/monitoring
exports.getMonitoringData = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await monitoringService.getMonitoringData(userId);

        res.status(200).json({
            success: true,
            message: 'Monitoring data fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/monitoring/check
exports.triggerManualCheck = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await monitoringService.triggerManualCheck(userId);

        res.status(200).json({
            success: true,
            message: 'Monitoring check completed',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/monitoring/alerts/:id/resolve
exports.resolveAlert = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const alertId = req.params.id;
        const data = await monitoringService.resolveAlert(userId, alertId);

        res.status(200).json({
            success: true,
            message: 'Alert resolved successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/monitoring/alerts/:id/snooze
exports.snoozeAlert = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const alertId = req.params.id;
        const minutes = req.body.minutes || 60;
        const data = await monitoringService.snoozeAlert(userId, alertId, minutes);

        res.status(200).json({
            success: true,
            message: `Alert snoozed for ${minutes} minutes`,
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/monitoring/alerts/clear-resolved
exports.clearResolvedAlerts = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await monitoringService.clearResolvedAlerts(userId);

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} resolved alert(s) cleared`,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/monitoring/failure-history
exports.getFailureHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await monitoringService.getFailureHistory(userId);

        res.status(200).json({
            success: true,
            message: 'Failure history fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/monitoring/snapshot
exports.takeSnapshot = async (req, res, next) => {
    try {
        const userId = req.user._id;
        await monitoringService.takeDailySnapshot(userId);

        res.status(200).json({
            success: true,
            message: 'Snapshot taken successfully'
        });
    } catch (err) {
        next(err);
    }
};