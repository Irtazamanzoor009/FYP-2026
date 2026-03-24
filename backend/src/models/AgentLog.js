const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'CHECK',
            'ALERT',
            'SYNC',
            'VALIDATION',
            'SUGGESTION',
            'ERROR'
        ],
        default: 'CHECK'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: false });

// Index for fast recent log lookups
agentLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('AgentLog', agentLogSchema);