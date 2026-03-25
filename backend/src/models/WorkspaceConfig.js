const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    id: String,
    key: String,
    name: String,
    boardId: Number,
    projectType: {
        type: String,
        enum: ['company-managed', 'team-managed'],
        default: 'company-managed'
    }
}, { _id: false });

const teamMemberSchema = new mongoose.Schema({
    accountId: String,
    name: String,
    email: String,
    role: {
        type: String,
        enum: [
            'Lead Developer',
            'Backend Engineer',
            'Frontend Developer',
            'Full Stack Developer',
            'QA Engineer',
            'DevOps Engineer',
            'Project Manager'
        ],
        default: null
    },
    skills: {
        type: [String],
        default: []
    }
}, { _id: false });

const workspaceConfigSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Jira workspace info
    jiraDomain: {
        type: String,
        required: true
    },
    boardId: {
        type: Number,
        default: null
    },
    storyPointsField: {
        type: String,
        default: 'customfield_10016'
    },
    // All projects fetched from Jira
    allProjects: {
        type: [projectSchema],
        default: []
    },
    // Currently selected project
    selectedProjectKey: {
        type: String,
        default: null
    },
    selectedProjectName: {
        type: String,
        default: null
    },
    selectedBoardId: {
        type: Number,
        default: null
    },
    // Sync status
    isConnected: {
        type: Boolean,
        default: false
    },
    lastSyncedAt: {
        type: Date,
        default: null
    },
    connectedAt: {
        type: Date,
        default: Date.now
    },
    teamMembers: {
        type: [teamMemberSchema],
        default: []
    },
    rolesConfigured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('WorkspaceConfig', workspaceConfigSchema);