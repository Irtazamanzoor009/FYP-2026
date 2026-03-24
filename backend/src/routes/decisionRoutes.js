const express = require('express');
const router = express.Router();
const decisionController = require('../controllers/decisionController');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/decisions/summary
// Must be BEFORE /:id route to avoid conflict
router.get('/summary', decisionController.getAuditSummary);

// GET /api/decisions/export
// Must be BEFORE /:id route to avoid conflict
router.get('/export', decisionController.exportAuditLog);

// GET /api/decisions
// Get all logs with optional filters
// ?status=APPROVED|REJECTED|AUTO_EXECUTED|ALL
// ?search=keyword
// ?page=1&limit=20
router.get('/', decisionController.getDecisionLogs);

// GET /api/decisions/:id
// Get single log by ID
router.get('/:id', decisionController.getDecisionLogById);

// POST /api/decisions/:id/undo
// Undo an approved action
router.post('/:id/undo', decisionController.undoDecision);

module.exports = router;