const express = require('express');
const router = express.Router();
const suggestionsController = require('../controllers/suggestionsController');
const auth = require('../middleware/auth');

router.use(auth);

// POST /api/suggestions/generate
// Generate new suggestions from current sprint data
router.post('/generate', suggestionsController.generateSuggestions);

// POST /api/suggestions/force-regenerate
// Delete pending and regenerate fresh suggestions
router.post('/force-regenerate', suggestionsController.forceRegenerateSuggestions);

// GET /api/suggestions
// Get all suggestions (optional ?status=PENDING|APPROVED|IGNORED|ALL)
router.get('/', suggestionsController.getSuggestions);

// POST /api/suggestions/:id/approve
// Approve suggestion and sync to Jira
router.post('/:id/approve', suggestionsController.approveSuggestion);

// POST /api/suggestions/:id/ignore
// Ignore a suggestion
router.post('/:id/ignore', suggestionsController.ignoreSuggestion);

// GET /api/suggestions/:id/explain
// Ask AI to explain why this suggestion was made
router.get('/:id/explain', suggestionsController.explainSuggestion);

module.exports = router;