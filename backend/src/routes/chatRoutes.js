const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.use(auth);

// POST /api/chat/message
// Send a message and get AI response
router.post('/message', chatController.sendMessage);

// GET /api/chat/suggestions
// Get dynamic suggested questions based on sprint state
router.get('/suggestions', chatController.getSuggestedQuestions);

module.exports = router;