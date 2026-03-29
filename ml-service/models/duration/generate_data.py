import pandas as pd
import numpy as np
import random
import json
import os

random.seed(42)
np.random.seed(42)

# ─────────────────────────────────────────
# Task type keyword patterns
# (mirrors roleSkills.js on backend)
# ─────────────────────────────────────────
TASK_TYPES = {
    'backend': [
        'api', 'backend', 'database', 'migration', 'server',
        'endpoint', 'schema', 'authentication', 'security',
        'cache', 'service', 'engine', 'calculator', 'sync',
        'integration', 'rest', 'crud', 'repository', 'model'
    ],
    'frontend': [
        'ui', 'frontend', 'design', 'responsive', 'layout',
        'component', 'page', 'dashboard', 'interface', 'css',
        'html', 'react', 'widget', 'form', 'modal', 'button',
        'navbar', 'sidebar', 'chart', 'table', 'card'
    ],
    'testing': [
        'test', 'testing', 'qa', 'quality', 'e2e',
        'unit', 'integration test', 'spec', 'coverage',
        'automation', 'selenium', 'jest', 'cypress'
    ],
    'devops': [
        'deploy', 'deployment', 'docker', 'kubernetes', 'ci',
        'cd', 'pipeline', 'infrastructure', 'aws', 'cloud',
        'monitoring', 'logging', 'nginx', 'ssl'
    ]
}

# Realistic duration ranges per task type (in days)
DURATION_RANGES = {
    'backend':  {'min': 2.0, 'max': 8.0, 'mean': 4.5, 'std': 1.8},
    'frontend': {'min': 1.5, 'max': 6.0, 'mean': 3.2, 'std': 1.4},
    'testing':  {'min': 1.0, 'max': 4.0, 'mean': 2.1, 'std': 0.9},
    'devops':   {'min': 2.0, 'max': 7.0, 'mean': 4.0, 'std': 1.5},
    'general':  {'min': 1.0, 'max': 5.0, 'mean': 2.8, 'std': 1.2}
}

# Priority multipliers (higher priority = more focus = slightly less time)
PRIORITY_MULTIPLIERS = {
    'Highest': 0.85,
    'High':    0.92,
    'Medium':  1.00,
    'Low':     1.12,
    'Lowest':  1.20
}

# Story points to expected duration correlation
# (more points = more complex = more days)
POINTS_TO_DAYS_MULTIPLIER = {
    1: 0.7,
    2: 0.85,
    3: 1.0,
    5: 1.2,
    8: 1.6,
    13: 2.2,
    21: 3.0
}

def get_task_type_from_title(title):
    """Detect task type from title keywords"""
    title_lower = title.lower()
    for task_type, keywords in TASK_TYPES.items():
        if any(kw in title_lower for kw in keywords):
            return task_type
    return 'general'

def get_task_type_numeric(task_type):
    """Convert task type to numeric for model"""
    mapping = {
        'backend': 0,
        'frontend': 1,
        'testing': 2,
        'devops': 3,
        'general': 4
    }
    return mapping.get(task_type, 4)

def get_priority_numeric(priority):
    """Convert priority to numeric"""
    mapping = {
        'Highest': 5,
        'High':    4,
        'Medium':  3,
        'Low':     2,
        'Lowest':  1
    }
    return mapping.get(priority, 3)

def generate_synthetic_duration(task_type, story_points, priority):
    """Generate realistic duration for a task"""
    ranges = DURATION_RANGES[task_type]

    # Base duration from normal distribution
    base = np.random.normal(ranges['mean'], ranges['std'])
    base = max(ranges['min'], min(ranges['max'], base))

    # Apply story points multiplier
    closest_points = min(
        POINTS_TO_DAYS_MULTIPLIER.keys(),
        key=lambda x: abs(x - story_points)
    )
    points_mult = POINTS_TO_DAYS_MULTIPLIER[closest_points]

    # Apply priority multiplier
    priority_mult = PRIORITY_MULTIPLIERS.get(priority, 1.0)

    # Add random variance (±20%)
    variance = np.random.uniform(0.8, 1.2)

    duration = base * points_mult * priority_mult * variance

    # Round to 1 decimal place
    return round(max(0.5, duration), 1)

def generate_sample_titles():
    """Generate varied task titles for training"""
    titles = {
        'backend': [
            'Build REST API for user authentication',
            'Implement database migration script',
            'Create JWT token validation service',
            'Develop backend API for sprint analytics',
            'Build risk scoring calculation engine',
            'Implement Redis caching layer',
            'Create database schema for reports',
            'Backend service for file uploads',
            'API endpoint for dashboard metrics',
            'Server-side validation and security fix',
            'Database backup automation script',
            'Build monitoring alerts detection service',
            'Implement WebSocket server connection',
            'Create health score calculator backend',
            'API integration with third-party service'
        ],
        'frontend': [
            'Design homepage UI redesign',
            'Build responsive dashboard layout',
            'Create reusable button components',
            'Implement mobile responsive layouts',
            'Design risk analytics page frontend',
            'Build AI suggestions page component',
            'Frontend integration testing setup',
            'Create data visualization charts',
            'Implement dark mode toggle',
            'Build sidebar navigation component',
            'Design settings page UI',
            'Create login form with validation',
            'Dashboard header with project selector',
            'Build burndown chart component',
            'Implement drag and drop interface'
        ],
        'testing': [
            'Write unit tests for auth service',
            'Create e2e testing suite configuration',
            'Integration test for API endpoints',
            'QA test suite for frontend components',
            'End to end system testing',
            'Write test cases for sprint calculator',
            'Performance load testing scripts',
            'Unit tests for risk scoring engine',
            'Test automation for login flow',
            'Write integration tests for Jira service'
        ],
        'general': [
            'Setup project repository and structure',
            'Document API endpoints',
            'Code review and cleanup',
            'Sprint planning and task estimation',
            'Team knowledge transfer session',
            'Update project README',
            'Configure development environment',
            'Refactor legacy code modules',
            'Setup monitoring and logging'
        ]
    }
    return titles

def generate_dataset(n_synthetic=700):
    """Generate complete training dataset"""
    print(f"Generating {n_synthetic} synthetic task samples...")

    data = []
    titles_by_type = generate_sample_titles()
    priorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest']
    points_options = [1, 2, 3, 5, 8, 13]

    for i in range(n_synthetic):
        # Random task type
        task_type = random.choice(list(DURATION_RANGES.keys()))
        if task_type == 'devops':
            task_type = random.choice(['backend', 'general'])

        # Get a random title of that type
        type_titles = titles_by_type.get(task_type, titles_by_type['general'])
        title = random.choice(type_titles)

        # Add slight variation to title
        variations = ['Setup', 'Implement', 'Build', 'Create', 'Fix', 'Update', 'Add']
        if random.random() > 0.6:
            title = random.choice(variations) + ' ' + title.split(' ', 1)[-1]

        priority = random.choice(priorities)
        story_points = random.choice(points_options)
        actual_days = generate_synthetic_duration(task_type, story_points, priority)

        # Word count of title (useful feature)
        word_count = len(title.split())

        data.append({
            'title': title,
            'task_type': task_type,
            'task_type_numeric': get_task_type_numeric(task_type),
            'priority': priority,
            'priority_numeric': get_priority_numeric(priority),
            'story_points': story_points,
            'word_count': word_count,
            'actual_days': actual_days
        })

    # Add real sprint data from your project (Sprints 1-5)
    real_tasks = get_real_sprint_tasks()
    data.extend(real_tasks)

    df = pd.DataFrame(data)

    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"Total samples: {len(df)}")
    print(f"Task type distribution:")
    print(df['task_type'].value_counts())
    print(f"\nAverage duration by type:")
    print(df.groupby('task_type')['actual_days'].mean().round(2))

    return df

def get_real_sprint_tasks():
    """Real task data from your Jira sprints 1-4"""
    # Sprint 1 — Authentication Module
    sprint1 = [
        {'title': 'Setup Frontend Component Library',     'task_type': 'frontend', 'priority': 'High',    'story_points': 5,  'actual_days': 3.0},
        {'title': 'Homepage UI Redesign',                 'task_type': 'frontend', 'priority': 'High',    'story_points': 5,  'actual_days': 4.0},
        {'title': 'Backend API for Sprint Data',          'task_type': 'backend',  'priority': 'Highest', 'story_points': 8,  'actual_days': 6.0},
        {'title': 'Dashboard Redesign UI',                'task_type': 'frontend', 'priority': 'High',    'story_points': 5,  'actual_days': 3.5},
        {'title': 'Backend API for Risk Analysis',        'task_type': 'backend',  'priority': 'High',    'story_points': 8,  'actual_days': 5.5},
        {'title': 'Database Migration Script',            'task_type': 'backend',  'priority': 'High',    'story_points': 8,  'actual_days': 6.5},
        {'title': 'Risk Analytics Page Frontend',         'task_type': 'frontend', 'priority': 'Medium',  'story_points': 5,  'actual_days': 4.0},
        {'title': 'QA Test Suite Configuration',          'task_type': 'testing',  'priority': 'Medium',  'story_points': 3,  'actual_days': 2.0},
        {'title': 'Security Authentication Fix',          'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 4.0},
        {'title': 'AI Suggestions Page Frontend',         'task_type': 'frontend', 'priority': 'High',    'story_points': 5,  'actual_days': 3.5},
        {'title': 'End to End Testing',                   'task_type': 'testing',  'priority': 'High',    'story_points': 5,  'actual_days': 3.0},
        {'title': 'Performance Load Testing',             'task_type': 'testing',  'priority': 'Medium',  'story_points': 3,  'actual_days': 1.5},
        {'title': 'Mobile Responsive Layouts',            'task_type': 'frontend', 'priority': 'Medium',  'story_points': 3,  'actual_days': 2.5},
        {'title': 'Database Backup Automation',           'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 4.0},
    ]

    # Sprint 5 tasks
    sprint5 = [
        {'title': 'Gemini API Integration Setup',        'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 3.0},
        {'title': 'Build Risk Scoring Engine',           'task_type': 'backend',  'priority': 'Highest', 'story_points': 8,  'actual_days': 5.0},
        {'title': 'Sprint Health Score Calculator',      'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 3.5},
        {'title': 'Team Workload Analysis Service',      'task_type': 'backend',  'priority': 'Medium',  'story_points': 8,  'actual_days': 5.5},
        {'title': 'AI Suggestions Generation Engine',    'task_type': 'backend',  'priority': 'Highest', 'story_points': 8,  'actual_days': 6.0},
        {'title': 'Suggestions Approve and Sync Jira',   'task_type': 'backend',  'priority': 'Highest', 'story_points': 8,  'actual_days': 5.0},
        {'title': 'Decision History Logging Service',    'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 3.0},
        {'title': 'Monitoring Alerts Detection Service', 'task_type': 'backend',  'priority': 'Highest', 'story_points': 8,  'actual_days': 5.5},
        {'title': 'WebSocket Live Agent Feed',           'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 3.5},
        {'title': 'Failure Probability Calculator',      'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 4.0},
        {'title': 'Predictive Risk Timeline Builder',    'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 3.5},
        {'title': 'What If Scenario Simulator',          'task_type': 'backend',  'priority': 'High',    'story_points': 5,  'actual_days': 4.0},
        {'title': 'Sprint Burndown Data Service',        'task_type': 'backend',  'priority': 'Medium',  'story_points': 3,  'actual_days': 2.0},
        {'title': 'Frontend API Integration Testing',    'task_type': 'testing',  'priority': 'Medium',  'story_points': 3,  'actual_days': 2.5},
        {'title': 'End to End System Testing',           'task_type': 'testing',  'priority': 'High',    'story_points': 5,  'actual_days': 3.0},
    ]

    real_tasks = []
    for task in sprint1 + sprint5:
        task['task_type_numeric'] = get_task_type_numeric(task['task_type'])
        task['priority_numeric'] = get_priority_numeric(task['priority'])
        task['word_count'] = len(task['title'].split())
        real_tasks.append(task)

    # Weight real data 8x for stronger anchoring
    weighted = real_tasks * 8
    print(f"Real tasks added: {len(real_tasks)} × 8 = {len(weighted)} samples")
    return weighted


if __name__ == '__main__':
    os.makedirs('models/duration', exist_ok=True)

    df = generate_dataset(n_synthetic=700)
    output_path = 'models/duration/duration_training_data.csv'
    df.to_csv(output_path, index=False)

    print(f"\nSaved to {output_path}")
    print(f"Sample data:")
    print(df[['title', 'task_type', 'priority', 'story_points', 'actual_days']].head(10))