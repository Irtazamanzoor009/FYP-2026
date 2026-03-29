const mongoose = require('mongoose');

const plannedTaskSchema = new mongoose.Schema({
    tempId: String,
    jiraKey: { type: String, default: null },
    title: String,
    description: { type: String, default: '' },
    taskType: String,
    priority: String,
    storyPoints: { type: Number, default: 5 },

    // ML predictions at planning time
    predictedDays: { type: Number, default: null },
    confidenceLow: { type: Number, default: null },
    confidenceHigh: { type: Number, default: null },
    estimationSource: {
        type: String,
        enum: ['ml_model', 'rule_based'],
        default: 'ml_model'
    },

    // Suggested assignment
    suggestedAssigneeId: { type: String, default: null },
    suggestedAssigneeName: { type: String, default: null },
    suggestedDueDate: { type: String, default: null },

    // Actual outcome (filled when sprint completes)
    actualDays: { type: Number, default: null },
    actualAssigneeId: { type: String, default: null },
    wasCompleted: { type: Boolean, default: null },

    // Dependencies
    dependsOn: { type: [String], default: [] }
}, { _id: false });

const sprintPlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectKey: {
        type: String,
        required: true
    },

    // Sprint details
    sprintName: { type: String, required: true },
    sprintGoal: { type: String, default: '' },
    plannedDurationDays: { type: Number, default: 14 },
    jiraSprintId: { type: Number, default: null },

    // Plan state
    status: {
        type: String,
        enum: ['DRAFT', 'PUSHED_TO_JIRA', 'ACTIVE', 'COMPLETED'],
        default: 'DRAFT'
    },

    // All planned tasks
    tasks: { type: [plannedTaskSchema], default: [] },

    // Summary at planning time
    totalPlannedPoints: { type: Number, default: 0 },
    totalEstimatedDays: { type: Number, default: 0 },
    estimatedSuccessProbability: { type: Number, default: null },
    averageVelocityAtPlanning: { type: Number, default: 0 },

    // Actual outcome (filled when sprint completes)
    actualVelocity: { type: Number, default: null },
    actualCompletionPct: { type: Number, default: null },
    sprintOutcome: {
        type: String,
        enum: ['SUCCESS', 'PARTIAL', 'FAILED', null],
        default: null
    },

    // Model retraining flag
    usedForRetraining: { type: Boolean, default: false },

    pushedToJiraAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

sprintPlanSchema.index({ userId: 1, projectKey: 1, status: 1 });

module.exports = mongoose.model('SprintPlan', sprintPlanSchema);