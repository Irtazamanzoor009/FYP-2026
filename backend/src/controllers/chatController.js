const chatService = require('../services/chatService');

// POST /api/chat/message
exports.sendMessage = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { message, conversationHistory } = req.body;

        if (!message || message.trim() === '') {
            throw {
                statusCode: 400,
                message: 'Message is required.'
            };
        }

        const result = await chatService.sendMessage(
            userId,
            message,
            conversationHistory || []
        );

        res.status(200).json({
            success: true,
            message: 'Response generated successfully',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/chat/suggestions
exports.getSuggestedQuestions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const suggestions = await chatService
            .getSuggestedQuestions(userId);

        res.status(200).json({
            success: true,
            message: 'Suggested questions fetched',
            data: { suggestions }
        });
    } catch (err) {
        next(err);
    }
};