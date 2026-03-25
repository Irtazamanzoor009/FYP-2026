const jiraService = require('../services/jiraService');

// POST /api/jira/initialize
// Called after user saves Jira credentials
exports.initializeWorkspace = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const config = await jiraService.initializeWorkspace(userId);

        res.status(200).json({
            success: true,
            message: 'Jira workspace initialized successfully',
            data: config
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/projects
// Returns all projects for dropdown
exports.getProjects = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await jiraService.getProjects(userId);

        res.status(200).json({
            success: true,
            message: 'Projects fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/jira/switch-project
// Switch selected project
exports.switchProject = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { projectKey } = req.body;

        if (!projectKey) {
            throw { statusCode: 400, message: 'projectKey is required' };
        }

        const config = await jiraService.switchProject(userId, projectKey);

        res.status(200).json({
            success: true,
            message: `Switched to project ${projectKey}`,
            data: config
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/sprints
// Returns all sprints for selected project
exports.getSprints = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const sprints = await jiraService.fetchSprints(userId);

        res.status(200).json({
            success: true,
            message: 'Sprints fetched successfully',
            data: sprints
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/active-sprint
// Returns active sprint with all issues
exports.getActiveSprint = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await jiraService.fetchActiveSprintIssues(userId);

        res.status(200).json({
            success: true,
            message: 'Active sprint fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/closed-sprints
// Returns closed sprints with velocity data
exports.getClosedSprints = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await jiraService.fetchClosedSprints(userId);

        res.status(200).json({
            success: true,
            message: 'Closed sprints fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/team
// Returns team members
exports.getTeamMembers = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const data = await jiraService.fetchTeamMembers(userId);

        res.status(200).json({
            success: true,
            message: 'Team members fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/workspace-config
// Returns current workspace config
exports.getWorkspaceConfig = async (req, res, next) => {
    try {
        const WorkspaceConfig = require('../models/WorkspaceConfig');
        const config = await WorkspaceConfig.findOne({ userId: req.user._id });

        if (!config) {
            throw { statusCode: 404, message: 'Workspace not configured yet.' };
        }

        res.status(200).json({
            success: true,
            data: config
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/jira/team-roles
exports.saveTeamRoles = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { teamMembers } = req.body;
        const { getSkillsForRole } = require('../utils/roleSkills');
        const WorkspaceConfig = require('../models/WorkspaceConfig');

        if (!teamMembers || !Array.isArray(teamMembers)) {
            throw { statusCode: 400, message: 'teamMembers array required' };
        }

        // Auto-populate skills from role
        const enrichedMembers = teamMembers.map(member => ({
            ...member,
            skills: member.role
                ? getSkillsForRole(member.role)
                : []
        }));

        const config = await WorkspaceConfig.findOneAndUpdate(
            { userId },
            {
                teamMembers: enrichedMembers,
                rolesConfigured: true
            },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            success: true,
            message: 'Team roles saved successfully',
            data: {
                teamMembers: config.teamMembers,
                rolesConfigured: config.rolesConfigured
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/jira/team-roles
exports.getTeamRoles = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const WorkspaceConfig = require('../models/WorkspaceConfig');

        const config = await WorkspaceConfig.findOne({ userId });
        if (!config) {
            throw { statusCode: 404, message: 'Workspace not found' };
        }

        // Members already in WorkspaceConfig from initializeWorkspace()
        // No need to call Jira API again
        res.status(200).json({
            success: true,
            data: {
                teamMembers: config.teamMembers || [],
                rolesConfigured: config.rolesConfigured || false
            }
        });
    } catch (err) {
        next(err);
    }
};

