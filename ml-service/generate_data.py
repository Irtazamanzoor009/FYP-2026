import pandas as pd
import numpy as np
import random

random.seed(42)
np.random.seed(42)

def generate_sprint(sprint_id):
    # Sprint parameters
    total_days = random.randint(10, 21)
    days_elapsed = random.randint(1, total_days)
    days_elapsed_ratio = days_elapsed / total_days

    # Total scope — sometimes over-ambitious
    avg_velocity = random.randint(30, 60)
    scope_multiplier = random.uniform(0.7, 2.0)
    total_points = int(avg_velocity * scope_multiplier)
    total_points = max(total_points, 10)

    # Team
    team_size = random.randint(2, 6)
    overloaded_ratio = random.uniform(0, 1)
    overloaded_members = int(team_size * overloaded_ratio)

    # Progress — correlated with days elapsed
    # Better teams complete more work proportionally
    base_completion = days_elapsed_ratio
    team_penalty = overloaded_ratio * 0.3
    luck_factor = random.uniform(-0.15, 0.15)
    completion_pct = max(0, min(100,
        (base_completion - team_penalty + luck_factor) * 100
    ))
    completed_points = int(total_points * completion_pct / 100)

    # Velocity ratio
    remaining = total_points - completed_points
    days_left = total_days - days_elapsed
    if days_elapsed > 0:
        current_velocity = completed_points / days_elapsed
    else:
        current_velocity = 0
    if days_left > 0:
        required_velocity = remaining / days_left
    else:
        required_velocity = 999
    if required_velocity > 0:
        velocity_ratio = current_velocity / required_velocity
    else:
        velocity_ratio = 2.0
    velocity_ratio = min(velocity_ratio, 3.0)

    # Issues
    total_issues = random.randint(8, 20)
    # Blocked tasks — higher when team is struggling
    struggle_factor = max(0, 1 - velocity_ratio)
    blocked_ratio = random.uniform(0, min(0.6, struggle_factor + 0.2))
    overdue_ratio = random.uniform(0, min(0.5, struggle_factor + 0.1))
    high_priority_incomplete = random.uniform(
        max(0, 1 - completion_pct / 100 - 0.1),
        1 - completion_pct / 100 + 0.1
    )
    high_priority_incomplete = max(0, min(1, high_priority_incomplete))

    # Scope ratio
    scope_ratio = total_points / max(avg_velocity, 1)
    scope_ratio = min(scope_ratio, 3.0)

    # Calculate outcome label
    # Success = sprint likely to complete >= 80% of points
    score = 0

    # Velocity contribution (most important)
    if velocity_ratio >= 1.0:
        score += 40
    elif velocity_ratio >= 0.7:
        score += 25
    elif velocity_ratio >= 0.4:
        score += 10
    else:
        score += 0

    # Team health
    healthy_ratio = 1 - overloaded_ratio
    score += healthy_ratio * 25

    # Risk indicators
    risk_score = (1 - blocked_ratio) * 15 + (1 - overdue_ratio) * 10
    score += risk_score

    # Scope penalty
    if scope_ratio > 1.5:
        score -= (scope_ratio - 1.5) * 15

    # Late sprint penalty
    if days_elapsed_ratio > 0.7 and completion_pct < 50:
        score -= 20

    # Label: success if score >= 50
    success = 1 if score >= 50 else 0

    return {
        'sprint_id': sprint_id,
        'velocity_ratio': round(velocity_ratio, 3),
        'completion_pct': round(completion_pct, 1),
        'days_elapsed_ratio': round(days_elapsed_ratio, 3),
        'overloaded_members_ratio': round(overloaded_ratio, 3),
        'blocked_tasks_ratio': round(blocked_ratio, 3),
        'overdue_tasks_ratio': round(overdue_ratio, 3),
        'scope_ratio': round(scope_ratio, 3),
        'high_priority_incomplete_ratio': round(high_priority_incomplete, 3),
        'success': success
    }

def add_real_sprints(data):
    """Add real sprint data from your project"""
    real_sprints = [
        # Sprint 1: Authentication Module — SUCCESS
        {
            'sprint_id': 9001,
            'velocity_ratio': 1.2,
            'completion_pct': 100.0,
            'days_elapsed_ratio': 1.0,
            'overloaded_members_ratio': 0.0,
            'blocked_tasks_ratio': 0.0,
            'overdue_tasks_ratio': 0.0,
            'scope_ratio': 0.85,
            'high_priority_incomplete_ratio': 0.0,
            'success': 1
        },
        # Sprint 2: Dashboard Module — SUCCESS
        {
            'sprint_id': 9002,
            'velocity_ratio': 1.1,
            'completion_pct': 100.0,
            'days_elapsed_ratio': 1.0,
            'overloaded_members_ratio': 0.0,
            'blocked_tasks_ratio': 0.0,
            'overdue_tasks_ratio': 0.0,
            'scope_ratio': 0.91,
            'high_priority_incomplete_ratio': 0.0,
            'success': 1
        },
        # Sprint 3: API Integration — SUCCESS
        {
            'sprint_id': 9003,
            'velocity_ratio': 1.15,
            'completion_pct': 100.0,
            'days_elapsed_ratio': 1.0,
            'overloaded_members_ratio': 0.0,
            'blocked_tasks_ratio': 0.0,
            'overdue_tasks_ratio': 0.0,
            'scope_ratio': 1.09,
            'high_priority_incomplete_ratio': 0.0,
            'success': 1
        },
        # Sprint 4: Website Redesign — PARTIAL FAILURE (71%)
        {
            'sprint_id': 9004,
            'velocity_ratio': 0.45,
            'completion_pct': 71.0,
            'days_elapsed_ratio': 1.0,
            'overloaded_members_ratio': 0.75,
            'blocked_tasks_ratio': 0.21,
            'overdue_tasks_ratio': 0.64,
            'scope_ratio': 1.59,
            'high_priority_incomplete_ratio': 0.38,
            'success': 0
        }
    ]

    real_df = pd.DataFrame(real_sprints)
    # Add real data 5 times to increase their weight
    real_df_weighted = pd.concat([real_df] * 5, ignore_index=True)
    return pd.concat([data, real_df_weighted], ignore_index=True)

if __name__ == '__main__':
    print("Generating sprint training data...")

    # Generate 1000 synthetic sprints
    sprints = [generate_sprint(i) for i in range(1000)]
    df = pd.DataFrame(sprints)

    # Add real sprint data
    df = add_real_sprints(df)

    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    df.to_csv('sprint_training_data.csv', index=False)

    print(f"Total sprints: {len(df)}")
    print(f"Success rate: {df['success'].mean():.1%}")
    print(f"Features: {list(df.columns)}")
    print("Saved to sprint_training_data.csv ✅")