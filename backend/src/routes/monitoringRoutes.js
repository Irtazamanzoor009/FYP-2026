const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/monitoring
router.get('/', monitoringController.getMonitoringData);

// POST /api/monitoring/check
router.post('/check', monitoringController.triggerManualCheck);

// GET /api/monitoring/failure-history
router.get('/failure-history', monitoringController.getFailureHistory);

// POST /api/monitoring/snapshot
router.post('/snapshot', monitoringController.takeSnapshot);

// POST /api/monitoring/alerts/clear-resolved
// Must be BEFORE /alerts/:id routes
router.post('/alerts/clear-resolved', monitoringController.clearResolvedAlerts);

// POST /api/monitoring/alerts/:id/resolve
router.post('/alerts/:id/resolve', monitoringController.resolveAlert);

// POST /api/monitoring/alerts/:id/snooze
router.post('/alerts/:id/snooze', monitoringController.snoozeAlert);

module.exports = router;