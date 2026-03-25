// Maps roles to their skill sets
const ROLE_SKILLS = {
    'Lead Developer': [
        'backend', 'frontend', 'fullstack',
        'api', 'database', 'general'
    ],
    'Backend Engineer': [
        'backend', 'api', 'database', 'general'
    ],
    'Frontend Developer': [
        'frontend', 'ui', 'general'
    ],
    'Full Stack Developer': [
        'backend', 'frontend', 'fullstack',
        'api', 'ui', 'general'
    ],
    'QA Engineer': [
        'testing', 'qa', 'general'
    ],
    'DevOps Engineer': [
        'devops', 'backend', 'general'
    ],
    'Project Manager': [
        'general'
    ]
};

// Detect task type from issue summary
const detectTaskType = (issue) => {
    const summary = (issue.summary || '').toLowerCase();
    const labels = issue.labels || [];

    const backendKeywords = [
        'api', 'backend', 'database', 'migration',
        'server', 'endpoint', 'schema', 'auth',
        'authentication', 'security', 'cache',
        'service', 'engine', 'calculator', 'sync'
    ];

    const frontendKeywords = [
        'ui', 'frontend', 'design', 'responsive',
        'layout', 'component', 'page', 'dashboard',
        'interface', 'css', 'html', 'react', 'widget'
    ];

    const testingKeywords = [
        'test', 'testing', 'qa', 'quality',
        'e2e', 'unit test', 'integration test'
    ];

    const isBackend = backendKeywords.some(k =>
        summary.includes(k)
    ) || labels.includes('backend');

    const isFrontend = frontendKeywords.some(k =>
        summary.includes(k)
    ) || labels.includes('frontend');

    const isTesting = testingKeywords.some(k =>
        summary.includes(k)
    ) || labels.includes('testing');

    if (isTesting) return 'testing';
    if (isBackend && !isFrontend) return 'backend';
    if (isFrontend && !isBackend) return 'frontend';
    return 'general';
};

// Check if member can do a task
const canMemberDoTask = (memberSkills, taskType) => {
    if (!memberSkills || memberSkills.length === 0) {
        return true; // No role configured = assume can do anything
    }
    if (taskType === 'general') return true;
    return memberSkills.includes(taskType) ||
        memberSkills.includes('fullstack');
};

// Get skills for a role
const getSkillsForRole = (role) => {
    return ROLE_SKILLS[role] || ['general'];
};

module.exports = {
    ROLE_SKILLS,
    detectTaskType,
    canMemberDoTask,
    getSkillsForRole
};