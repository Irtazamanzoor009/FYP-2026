const suggestionsService = require('../services/suggestionsService');

// POST /api/suggestions/generate
exports.generateSuggestions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await suggestionsService.generateSuggestions(userId);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/suggestions
exports.getSuggestions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const statusFilter = req.query.status || 'ALL';
        const data = await suggestionsService.getSuggestions(
            userId,
            statusFilter
        );

        res.status(200).json({
            success: true,
            message: 'Suggestions fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/suggestions/:id/approve
exports.approveSuggestion = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const suggestionId = req.params.id;
        const result = await suggestionsService.approveSuggestion(
            userId,
            suggestionId
        );

        res.status(200).json({
            success: true,
            message: 'Suggestion approved and synced to Jira',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/suggestions/:id/ignore
exports.ignoreSuggestion = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const suggestionId = req.params.id;
        const result = await suggestionsService.ignoreSuggestion(
            userId,
            suggestionId
        );

        res.status(200).json({
            success: true,
            message: 'Suggestion ignored successfully',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/suggestions/:id/explain
exports.explainSuggestion = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const suggestionId = req.params.id;
        const result = await suggestionsService.explainSuggestion(
            userId,
            suggestionId
        );

        res.status(200).json({
            success: true,
            message: 'Explanation generated successfully',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/suggestions/force-regenerate
exports.forceRegenerateSuggestions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const result = await suggestionsService
            .forceRegenerateSuggestions(userId);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (err) {
        next(err);
    }
};