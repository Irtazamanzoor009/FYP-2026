const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/risk
router.get('/', riskController.getRiskData);

// POST /api/risk/refresh
router.post('/refresh', riskController.refreshRiskData);

// GET /api/risk/whatif/:scenario
// Scenarios: NONE, MEMBER_LEAVES, SCOPE_CREEP, DEADLINE_EARLIER
router.get('/whatif/:scenario', riskController.runWhatIf);

// POST /api/risk/mitigation-plan
router.post('/mitigation-plan', riskController.getMitigationPlan);

module.exports = router;