const mongoose = require('mongoose');

const failureSnapshotSchema = new mongoose.Schema({
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
    probability: {
        type: Number,
        required: true
    },
    // Date only (no time) for daily snapshots
    snapshotDate: {
        type: String,
        required: true
    },
    factors: {
        teamVelocity: String,
        remainingWork: String,
        capacity: String
    }
}, { timestamps: true });

// One snapshot per user per project per day
failureSnapshotSchema.index(
    { userId: 1, projectKey: 1, snapshotDate: 1 },
    { unique: true }
);

module.exports = mongoose.model('FailureSnapshot', failureSnapshotSchema);