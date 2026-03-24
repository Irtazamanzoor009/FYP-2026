const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },
    sprintId: {
        type: Number,
        required: true
    },
    sprintName: {
        type: String,
        required: true
    },
    // Type of suggestion
    type: {
        type: String,
        enum: [
            'TASK_REASSIGN',
            'DEADLINE_BUFFER',
            'PRIORITY_ESCALATION',
            'DEPENDENCY_ALERT',
            'MEETING_REQUIRED'
        ],
        required: true
    },
    // Priority badge
    priority: {
        type: String,
        enum: ['URGENT', 'SOON', 'OPTIONAL'],
        required: true
    },
    // Display content
    title: {
        type: String,
        required: true
    },
    aiReasoning: {
        type: String,
        required: true
    },
    impactPreview: {
        type: String,
        required: true
    },
    // Raw trigger data used to generate this suggestion
    triggerData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Jira issue this suggestion is about
    jiraIssueKey: {
        type: String,
        default: null
    },
    // For reassignment suggestions
    fromMember: {
        accountId: String,
        name: String
    },
    toMember: {
        accountId: String,
        name: String
    },
    // For deadline suggestions
    currentDueDate: {
        type: Date,
        default: null
    },
    newDueDate: {
        type: Date,
        default: null
    },
    // Status tracking
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'IGNORED'],
        default: 'PENDING'
    },
    approvedBy: {
        type: String,
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    ignoredBy: {
        type: String,
        default: null
    },
    ignoredAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Index for fast lookups
suggestionSchema.index({ userId: 1, projectKey: 1, status: 1 });

module.exports = mongoose.model('Suggestion', suggestionSchema);