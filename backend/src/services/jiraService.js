const { createJiraClient } = require('../config/jira');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const User = require('../models/User');
const { log, error } = require('../utils/logger');

// ─────────────────────────────────────────
// HELPER: Get Jira client for a user
// ─────────────────────────────────────────
const getJiraClientForUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.jiraDomain || !user.jiraEmail || !user.jiraApiToken) {
        throw { statusCode: 400, message: 'Jira credentials not found. Please connect Jira first.' };
    }
    return {
        client: createJiraClient(user.jiraDomain, user.jiraEmail, user.jiraApiToken),
        domain: user.jiraDomain,
        email: user.jiraEmail,
        token: user.jiraApiToken
    };
};

// ─────────────────────────────────────────
// STEP 1: Auto-detect story points field
// ─────────────────────────────────────────
const detectStoryPointsField = async (client) => {
    try {
        // Get all fields from this Jira workspace
        const response = await client.get('/rest/api/3/field');
        const fields = response.data;

        // Search by name first
        const spField = fields.find(f =>
            f.name.toLowerCase() === 'story points' ||
            f.name.toLowerCase() === 'story point estimate' ||
            f.name.toLowerCase() === 'story_points'
        );

        if (spField) {
            log(`✅ Story points field found by name: ${spField.id}`);
            return spField.id;
        }

        // If not found by name, detect by value from a sample issue
        log('⚠️ Story points field not found by name. Trying value detection...');
        const issueResponse = await client.get('/rest/api/3/search?jql=project is not EMPTY&maxResults=1');

        if (issueResponse.data.issues && issueResponse.data.issues.length > 0) {
            const fields = issueResponse.data.issues[0].fields;

            for (const [key, value] of Object.entries(fields)) {
                if (
                    key.startsWith('customfield_') &&
                    typeof value === 'number' &&
                    value > 0 &&
                    value <= 100
                ) {
                    log(`✅ Story points field detected by value: ${key} = ${value}`);
                    return key;
                }
            }
        }

        // Default fallback
        log('⚠️ Could not detect story points field. Using default: customfield_10016');
        return 'customfield_10016';

    } catch (err) {
        error('❌ Error detecting story points field:', err.message);
        return 'customfield_10016';
    }
};

// ─────────────────────────────────────────
// STEP 2: Fetch all boards
// ─────────────────────────────────────────
const fetchBoards = async (client) => {
    const response = await client.get('/rest/agile/1.0/board?maxResults=50');
    return response.data.values || [];
};

// ─────────────────────────────────────────
// STEP 3: Fetch all Jira projects
// ─────────────────────────────────────────
const fetchProjects = async (client) => {
    const response = await client.get('/rest/api/3/project');
    return response.data;
};

// ─────────────────────────────────────────
// STEP 4: Match each project to its board
// ─────────────────────────────────────────
const matchProjectsToBoards = (projects, boards) => {
    return projects.map(project => {
        const board = boards.find(b =>
            b.location?.projectKey === project.key
        );

        return {
            id: project.id,
            key: project.key,
            name: project.name,
            boardId: board ? board.id : null,
            projectType: project.style === 'next-gen' ? 'team-managed' : 'company-managed'
        };
    });
};

// ─────────────────────────────────────────
// MAIN: Initialize workspace after Jira connect
// ─────────────────────────────────────────
const initializeWorkspace = async (userId) => {
    const { client } = await getJiraClientForUser(userId);

    log(`🔄 Initializing Jira workspace for user: ${userId}`);

    // Run all detections in parallel for speed
    const [boards, projects, storyPointsField, teamMembers] = await Promise.all([
        fetchBoards(client),
        fetchProjects(client),
        detectStoryPointsField(client),
        fetchTeamMembersFromClient(client)
    ]);

    // Match projects to their boards
    const matchedProjects = matchProjectsToBoards(projects, boards);

    // Get first board ID for workspace level
    const primaryBoardId = boards.length > 0 ? boards[0].id : null;

    // Save or update WorkspaceConfig
    const config = await WorkspaceConfig.findOneAndUpdate(
        { userId },
        {
            userId,
            jiraDomain: (await User.findById(userId)).jiraDomain,
            boardId: primaryBoardId,
            storyPointsField,
            allProjects: matchedProjects,
            // Auto-select first project
            selectedProjectKey: matchedProjects[0]?.key || null,
            selectedProjectName: matchedProjects[0]?.name || null,
            selectedBoardId: matchedProjects[0]?.boardId || primaryBoardId,
            isConnected: true,
            connectedAt: new Date(),

            // NEW: Save team members during init
            // PM only needs to assign roles later
            teamMembers: teamMembers.map(member => ({
                accountId: member.accountId,
                name: member.name,
                email: member.email || '',
                role: null,    // PM assigns role later
                skills: []     // auto-populated when role assigned
            })),
            rolesConfigured: false
        },
        { new: true, upsert: true }
    );

    log(`✅ Workspace initialized. Projects found: ${matchedProjects.length}`);
    log(`✅ Story points field: ${storyPointsField}`);
    log(`✅ Auto-selected project: ${config.selectedProjectKey}`);

    return config;
};

// ─────────────────────────────────────────
// GET: All projects for dropdown
// ─────────────────────────────────────────
const getProjects = async (userId) => {
    const config = await WorkspaceConfig.findOne({ userId });

    if (!config) {
        throw { statusCode: 400, message: 'Workspace not initialized. Please reconnect Jira.' };
    }

    return {
        projects: config.allProjects,
        selectedProject: {
            key: config.selectedProjectKey,
            name: config.selectedProjectName,
            boardId: config.selectedBoardId
        }
    };
};

// ─────────────────────────────────────────
// POST: Switch selected project
// ─────────────────────────────────────────
const switchProject = async (userId, projectKey) => {
    const config = await WorkspaceConfig.findOne({ userId });

    if (!config) {
        throw { statusCode: 400, message: 'Workspace not found.' };
    }

    const project = config.allProjects.find(p => p.key === projectKey);
    if (!project) {
        throw { statusCode: 404, message: `Project ${projectKey} not found in your workspace.` };
    }

    const updated = await WorkspaceConfig.findOneAndUpdate(
        { userId },
        {
            selectedProjectKey: project.key,
            selectedProjectName: project.name,
            selectedBoardId: project.boardId
        },
        { new: true }
    );

    log(`✅ User ${userId} switched to project: ${projectKey}`);
    return updated;
};

// ─────────────────────────────────────────
// GET: All sprints for selected project
// ─────────────────────────────────────────
const fetchSprints = async (userId) => {
    const { client } = await getJiraClientForUser(userId);
    const config = await WorkspaceConfig.findOne({ userId });

    if (!config || !config.selectedBoardId) {
        throw { statusCode: 400, message: 'No board found. Please select a project first.' };
    }

    const response = await client.get(
        `/rest/agile/1.0/board/${config.selectedBoardId}/sprint?maxResults=20`
    );

    return response.data.values || [];
};

// ─────────────────────────────────────────
// GET: Active sprint issues
// ─────────────────────────────────────────
const fetchActiveSprintIssues = async (userId) => {
    const { client } = await getJiraClientForUser(userId);
    const config = await WorkspaceConfig.findOne({ userId });

    if (!config || !config.selectedBoardId) {
        throw { statusCode: 400, message: 'No board found. Please select a project first.' };
    }

    const spField = config.storyPointsField;

    // Get active sprint
    const sprintsRes = await client.get(
        `/rest/agile/1.0/board/${config.selectedBoardId}/sprint?state=active&maxResults=1`
    );

    const sprints = sprintsRes.data.values || [];
    if (sprints.length === 0) {
        throw { statusCode: 404, message: 'No active sprint found for this project.' };
    }

    const activeSprint = sprints[0];

    // Get issues for active sprint
    const issuesRes = await client.get(
        `/rest/agile/1.0/sprint/${activeSprint.id}/issue?maxResults=100&fields=summary,assignee,status,priority,duedate,issuelinks,${spField}`
    );

    const rawIssues = issuesRes.data.issues || [];

    // Normalize issues
    const issues = rawIssues.map(issue => {
        const fields = issue.fields;

        // Detect if blocked
        const isBlocked = fields.issuelinks?.some(link =>
            link.type?.inward === 'is blocked by' && link.inwardIssue
        );

        const blockedBy = fields.issuelinks
            ?.filter(link => link.type?.inward === 'is blocked by' && link.inwardIssue)
            ?.map(link => ({
                key: link.inwardIssue.key,
                summary: link.inwardIssue.fields?.summary,
                status: link.inwardIssue.fields?.status?.name
            })) || [];

        return {
            id: issue.id,
            key: issue.key,
            summary: fields.summary,
            assignee: fields.assignee ? {
                accountId: fields.assignee.accountId,
                name: fields.assignee.displayName,
                email: fields.assignee.emailAddress
            } : null,
            status: fields.status?.name,
            statusCategory: fields.status?.statusCategory?.key,
            priority: fields.priority?.name,
            storyPoints: fields[spField] || 0,
            dueDate: fields.duedate || null,
            isBlocked,
            blockedBy,
            isOverdue: fields.duedate
                ? new Date(fields.duedate) < new Date() && fields.status?.name !== 'Done'
                : false
        };
    });

    return {
        sprint: {
            id: activeSprint.id,
            name: activeSprint.name,
            state: activeSprint.state,
            startDate: activeSprint.startDate,
            endDate: activeSprint.endDate,
            boardId: config.selectedBoardId
        },
        issues,
        totalIssues: issues.length
    };
};

// ─────────────────────────────────────────
// GET: Closed sprints for historical data
// ─────────────────────────────────────────
const fetchClosedSprints = async (userId) => {
    const { client } = await getJiraClientForUser(userId);
    const config = await WorkspaceConfig.findOne({ userId });

    if (!config || !config.selectedBoardId) {
        throw { statusCode: 400, message: 'No board found.' };
    }

    const spField = config.storyPointsField;

    const sprintsRes = await client.get(
        `/rest/agile/1.0/board/${config.selectedBoardId}/sprint?state=closed&maxResults=10`
    );

    const closedSprints = sprintsRes.data.values || [];
    const results = [];

    for (const sprint of closedSprints) {
        const issuesRes = await client.get(
            `/rest/agile/1.0/sprint/${sprint.id}/issue?maxResults=100&fields=status,${spField}`
        );

        const issues = issuesRes.data.issues || [];
        let totalPoints = 0;
        let completedPoints = 0;

        issues.forEach(issue => {
            const points = issue.fields[spField] || 0;
            totalPoints += points;
            if (issue.fields.status?.name === 'Done') {
                completedPoints += points;
            }
        });

        results.push({
            id: sprint.id,
            name: sprint.name,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            completeDate: sprint.completeDate,
            totalPoints,
            completedPoints,
            velocity: completedPoints
        });
    }

    return results;
};

const fetchTeamMembersFromClient = async (client) => {
    const response = await client.get(
        '/rest/api/3/users/search?maxResults=50'
    );
    const allUsers = response.data;
    const realUsers = allUsers.filter(
        u => u.accountType === 'atlassian'
    );
    return realUsers.map(u => ({
        accountId: u.accountId,
        name: u.displayName,
        email: u.emailAddress || '',
        avatar: u.avatarUrls?.['48x48']
    }));
};

// ─────────────────────────────────────────
// GET: Team members for project
// ─────────────────────────────────────────
const fetchTeamMembers = async (userId) => {
    const { client } = await getJiraClientForUser(userId);
    const config = await WorkspaceConfig.findOne({ userId });

    const response = await client.get('/rest/api/3/users/search?maxResults=50');
    const allUsers = response.data;

    // Filter only real users (not apps/bots)
    const realUsers = allUsers.filter(u => u.accountType === 'atlassian');

    return realUsers.map(u => ({
        accountId: u.accountId,
        name: u.displayName,
        email: u.emailAddress,
        avatar: u.avatarUrls?.['48x48']
    }));
};

// ─────────────────────────────────────────
// POST: Update issue assignee in Jira
// ─────────────────────────────────────────
const updateIssueAssignee = async (userId, issueKey, accountId) => {
    const { client } = await getJiraClientForUser(userId);

    await client.put(`/rest/api/3/issue/${issueKey}/assignee`, {
        accountId
    });

    log(`✅ Issue ${issueKey} reassigned to ${accountId}`);
    return { success: true };
};

// ─────────────────────────────────────────
// POST: Update issue due date in Jira
// ─────────────────────────────────────────
const updateIssueDueDate = async (userId, issueKey, newDueDate) => {
    const { client } = await getJiraClientForUser(userId);

    await client.put(`/rest/api/3/issue/${issueKey}`, {
        fields: { duedate: newDueDate }
    });

    log(`✅ Issue ${issueKey} due date updated to ${newDueDate}`);
    return { success: true };
};

module.exports = {
    getJiraClientForUser,
    initializeWorkspace,
    getProjects,
    switchProject,
    fetchSprints,
    fetchActiveSprintIssues,
    fetchClosedSprints,
    fetchTeamMembers,
    updateIssueAssignee,
    updateIssueDueDate
};
