const mongoose = require('mongoose');

const riskItemSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['OVERLOAD', 'BOTTLENECK', 'DEADLINE', 'VELOCITY', 'DEPENDENCY'],
        required: true
    },
    level: {
        type: String,
        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    why: String,
    action: String,
    affectedIssues: { type: Array, default: [] },
    affectedMembers: { type: Array, default: [] }
}, { _id: false });

// Replace existing timelineEventSchema with this:
const timelineEventSchema = new mongoose.Schema({
    day: Number,
    date: String,
    hasRisk: { type: Boolean, default: false },
    highestSeverity: { type: String, default: null },
    riskEvents: {
        type: [{
            riskType: String,
            label: String,
            severity: String,
            _id: false
        }],
        default: []
    }
}, { _id: false });

const whatIfResultSchema = new mongoose.Schema({
    scenario: String,
    originalProbability: Number,
    newProbability: Number,
    change: Number,
    recommendation: String
}, { _id: false });

const riskCacheSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },
    sprintId: Number,
    sprintName: String,
    // Overall sprint success probability
    sprintSuccessProbability: {
        type: Number,
        default: 0
    },
    // Identified risk items
    risks: {
        type: [riskItemSchema],
        default: []
    },
    // Predictive risk timeline
    timeline: {
        type: [timelineEventSchema],
        default: []
    },
    // What-if simulation results cache
    whatIfResults: {
        type: [whatIfResultSchema],
        default: []
    },
    cachedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 60 * 1000)
    }
}, { timestamps: true });

riskCacheSchema.index(
    { userId: 1, projectKey: 1 },
    { unique: true }
);

module.exports = mongoose.model('RiskCache', riskCacheSchema);