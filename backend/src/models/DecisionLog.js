const mongoose = require('mongoose');

const decisionLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },
    // Action details
    actionType: {
        type: String,
        enum: [
            'TASK_REASSIGNMENT',
            'DEADLINE_EXTENSION',
            'PRIORITY_ESCALATION',
            'DEPENDENCY_RESOLVED',
            'STATUS_UPDATE',
            'SUGGESTION_IGNORED'
        ],
        required: true
    },
    actionDetail: {
        type: String,
        required: true
    },
    // Status
    status: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'AUTO_EXECUTED'],
        required: true
    },
    // Who executed
    executedBy: {
        type: String,
        required: true
    },
    executorType: {
        type: String,
        enum: ['HUMAN', 'AI'],
        default: 'HUMAN'
    },
    // AI reasoning for audit
    aiReasoning: {
        type: String,
        default: null
    },
    // Jira issue involved
    jiraIssueKey: {
        type: String,
        default: null
    },
    // Original state before action (for undo)
    originalData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Link to suggestion
    suggestionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Suggestion',
        default: null
    },
    // Undo tracking
    canUndo: {
        type: Boolean,
        default: false
    },
    undoDeadline: {
        type: Date,
        default: null
    },
    undone: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

decisionLogSchema.index({ userId: 1, projectKey: 1, timestamp: -1 });

module.exports = mongoose.model('DecisionLog', decisionLogSchema);