const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    id: String,
    key: String,
    summary: String,
    assignee: {
        accountId: String,
        name: String,
        email: String
    },
    status: String,
    statusCategory: String,
    priority: String,
    storyPoints: { type: Number, default: 0 },
    dueDate: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    blockedBy: { type: Array, default: [] },
    isOverdue: { type: Boolean, default: false }
}, { _id: false });

const closedSprintSchema = new mongoose.Schema({
    id: Number,
    name: String,
    startDate: Date,
    endDate: Date,
    completeDate: Date,
    totalPoints: { type: Number, default: 0 },
    completedPoints: { type: Number, default: 0 },
    velocity: { type: Number, default: 0 }
}, { _id: false });

const teamWorkloadSchema = new mongoose.Schema({
    accountId: String,
    name: String,
    email: String,
    totalPoints: { type: Number, default: 0 },
    taskCount: { type: Number, default: 0 },
    workloadPercentage: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Overloaded', 'Warning', 'Optimal', 'Underloaded'],
        default: 'Optimal'
    },
    tasks: { type: Array, default: [] }
}, { _id: false });

const sprintCacheSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },
    // Active sprint data
    activeSprint: {
        id: Number,
        name: String,
        state: String,
        startDate: Date,
        endDate: Date,
        boardId: Number,
        totalStoryPoints: { type: Number, default: 0 },
        completedStoryPoints: { type: Number, default: 0 },
        inProgressStoryPoints: { type: Number, default: 0 },
        todoStoryPoints: { type: Number, default: 0 },
        issues: { type: [issueSchema], default: [] }
    },
    // Historical closed sprints
    closedSprints: {
        type: [closedSprintSchema],
        default: []
    },
    // Calculated average velocity
    averageVelocity: {
        type: Number,
        default: 0
    },
    // Team workload calculated
    teamWorkload: {
        type: [teamWorkloadSchema],
        default: []
    },
    topActions: {
        type: [
            {
                type: { type: String },
                task: String,
                desc: String,
                priority: String,
                _id: false
            }
        ],
        default: []
    },
    // Cache metadata
    cachedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60 * 1000)
    }
}, { timestamps: true });

// Compound index for fast lookups
sprintCacheSchema.index({ userId: 1, projectKey: 1 }, { unique: true });

module.exports = mongoose.model('SprintCache', sprintCacheSchema);