const express = require('express');
const router = express.Router();
const overviewController = require('../controllers/overviewController');
const auth = require('../middleware/auth');

// All overview routes require authentication
router.use(auth);

// GET /api/overview
// Main overview page data (health score + actions + workload + burndown)
router.get('/', overviewController.getOverview);

// POST /api/overview/refresh
// Force refresh from Jira (manual refresh button)
router.post('/refresh', overviewController.refreshOverview);

// GET /api/overview/team-workload
// Team workload bars only
router.get('/team-workload', overviewController.getTeamWorkload);

// GET /api/overview/health-score
// Sprint health score only
router.get('/health-score', overviewController.getHealthScore);

// GET /api/overview/burndown
// Burndown chart data only
router.get('/burndown', overviewController.getBurndown);

module.exports = router;