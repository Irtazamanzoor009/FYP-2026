const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['CRITICAL', 'WARNING', 'INFO'],
        required: true
    },
    type: {
        type: String,
        enum: [
            'DEADLINE_BREACH',
            'WORKLOAD_OVERLOAD',
            'BLOCKED_TASK',
            'VELOCITY_DROP',
            'SYNC_STATUS',
            'SPRINT_FAILURE_RISK'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'RESOLVED', 'SNOOZED'],
        default: 'ACTIVE'
    },
    resolvedBy: {
        type: String,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    snoozeUntil: {
        type: Date,
        default: null
    },
    // Unique key to prevent duplicate alerts
    alertKey: {
        type: String,
        required: true
    },
    relatedIssueKey: {
        type: String,
        default: null
    },
    relatedMember: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Compound index for fast lookups
alertSchema.index({ userId: 1, projectKey: 1, status: 1 });
// Unique alert key per user per project
alertSchema.index(
    { userId: 1, projectKey: 1, alertKey: 1 },
    { unique: true }
);

module.exports = mongoose.model('Alert', alertSchema);