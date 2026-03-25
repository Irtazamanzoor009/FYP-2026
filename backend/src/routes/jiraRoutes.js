const express = require('express');
const router = express.Router();
const jiraController = require('../controllers/jiraController');
const auth = require('../middleware/auth');

// All Jira routes require authentication
router.use(auth);

// POST /api/jira/initialize
// Call this after saving Jira credentials
router.post('/initialize', jiraController.initializeWorkspace);

// GET /api/jira/projects
// Get all projects for dropdown
router.get('/projects', jiraController.getProjects);

// POST /api/jira/switch-project
// Switch selected project
router.post('/switch-project', jiraController.switchProject);

// GET /api/jira/sprints
// Get all sprints
router.get('/sprints', jiraController.getSprints);

// GET /api/jira/active-sprint
// Get active sprint with issues
router.get('/active-sprint', jiraController.getActiveSprint);

// GET /api/jira/closed-sprints
// Get closed sprints with velocity
router.get('/closed-sprints', jiraController.getClosedSprints);

// GET /api/jira/team
// Get team members
router.get('/team', jiraController.getTeamMembers);

// GET /api/jira/workspace-config
// Get workspace config
router.get('/workspace-config', jiraController.getWorkspaceConfig);

// POST /api/jira/team-roles
// Save team member roles configured by PM
router.post('/team-roles', jiraController.saveTeamRoles);

// GET /api/jira/team-roles
// Get current team roles configuration
router.get('/team-roles', jiraController.getTeamRoles);

module.exports = router;
