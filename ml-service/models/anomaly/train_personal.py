import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.ensemble import IsolationForest

ANOMALY_FEATURES = [
    'daily_velocity',
    'tasks_in_progress_ratio',
    'blocked_ratio',
    'overdue_ratio',
    'workload_ratio'
]

def train_personal_model(user_id: str, sprint_metrics: list):
    """
    Train a personal Isolation Forest model for a specific user
    based on their historical sprint daily metrics.

    sprint_metrics: list of dicts, each representing one day:
    {
        'daily_velocity': float,
        'tasks_in_progress_ratio': float,
        'blocked_ratio': float,
        'overdue_ratio': float,
        'workload_ratio': float
    }
    """
    os.makedirs(f'models/anomaly/personal', exist_ok=True)

    if len(sprint_metrics) < 15:
        return {
            'success': False,
            'reason': f'Insufficient data: {len(sprint_metrics)} days. Need at least 15.',
            'model_type': 'global_baseline'
        }

    df = pd.DataFrame(sprint_metrics)

    # Validate all required features present
    for feat in ANOMALY_FEATURES:
        if feat not in df.columns:
            df[feat] = 0.0

    df = df[ANOMALY_FEATURES].fillna(0)

    print(f"Training personal model for user {user_id} with {len(df)} samples...")

    # Isolation Forest with personal contamination rate
    # Lower contamination for personal data (user knows their own patterns)
    contamination = min(0.1, max(0.03, 1.0 / len(df)))

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        max_features=len(ANOMALY_FEATURES)
    )

    model.fit(df)

    # Calculate personal baselines
    scores = model.score_samples(df)
    threshold = np.percentile(scores, 5)

    # Personal statistics
    personal_stats = {
        feat: {
            'mean': float(df[feat].mean()),
            'std': float(df[feat].std()),
            'p25': float(df[feat].quantile(0.25)),
            'p75': float(df[feat].quantile(0.75))
        }
        for feat in ANOMALY_FEATURES
    }

    # Save model
    model_path = f'models/anomaly/personal/anomaly_{user_id}.pkl'
    joblib.dump(model, model_path)

    metadata = {
        'user_id': user_id,
        'features': ANOMALY_FEATURES,
        'n_samples': len(df),
        'contamination': contamination,
        'threshold': float(threshold),
        'model_type': 'personal',
        'personal_stats': personal_stats,
        'sprints_used': len(sprint_metrics) // 14
    }

    metadata_path = f'models/anomaly/personal/anomaly_{user_id}_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Personal model saved for user {user_id} ✅")
    print(f"Samples: {len(df)}, Threshold: {threshold:.4f}")

    return {
        'success': True,
        'user_id': user_id,
        'n_samples': len(df),
        'threshold': float(threshold),
        'model_type': 'personal',
        'personal_stats': personal_stats
    }


def predict_anomaly(user_id: str, current_metrics: dict):
    """
    Predict anomaly score for current sprint metrics.
    Uses personal model if available, else global baseline.
    """
    personal_model_path = f'models/anomaly/personal/anomaly_{user_id}.pkl'
    global_model_path = 'models/anomaly/anomaly_global.pkl'

    # Choose which model to use
    if os.path.exists(personal_model_path):
        model = joblib.load(personal_model_path)
        metadata_path = f'models/anomaly/personal/anomaly_{user_id}_metadata.json'
        model_type = 'personal'
    elif os.path.exists(global_model_path):
        model = joblib.load(global_model_path)
        metadata_path = 'models/anomaly/anomaly_global_metadata.json'
        model_type = 'global_baseline'
    else:
        return {
            'anomaly_score': 0.5,
            'is_anomaly': False,
            'model_type': 'none',
            'message': 'No model available. Train models first.'
        }

    with open(metadata_path) as f:
        metadata = json.load(f)

    # Build feature vector
    features = [[
        current_metrics.get('daily_velocity', 0),
        current_metrics.get('tasks_in_progress_ratio', 0),
        current_metrics.get('blocked_ratio', 0),
        current_metrics.get('overdue_ratio', 0),
        current_metrics.get('workload_ratio', 0)
    ]]

    # Get anomaly score
    raw_score = model.score_samples(features)[0]
    threshold = metadata.get('threshold', -0.5)

    is_anomaly = raw_score < threshold
    anomaly_probability = max(0, min(1, (threshold - raw_score) / abs(threshold)))

    # ── Personal model: use z-scores for anomalous feature detection ──
    anomalous_features = []
    if model_type == 'personal' and 'personal_stats' in metadata:
        for feat in ANOMALY_FEATURES:
            value = current_metrics.get(feat, 0)
            stats = metadata['personal_stats'].get(feat, {})
            mean = stats.get('mean', value)
            std = stats.get('std', 1)
            if std > 0:
                z_score = abs((value - mean) / std)
                if z_score > 2.0:
                    direction = 'above' if value > mean else 'below'
                    anomalous_features.append({
                        'feature': feat,
                        'value': round(value, 3),
                        'personal_mean': round(mean, 3),
                        'z_score': round(z_score, 2),
                        'direction': direction
                    })

    # ── Generate human-readable description ──
    description = None

    if is_anomaly:
        if model_type == 'personal' and anomalous_features:
            # Personal model: use specific feature deviation
            top = anomalous_features[0]
            feat_labels = {
                'daily_velocity': 'team velocity',
                'tasks_in_progress_ratio': 'tasks in progress',
                'blocked_ratio': 'blocked tasks',
                'overdue_ratio': 'overdue tasks',
                'workload_ratio': 'team workload'
            }
            label = feat_labels.get(top['feature'], top['feature'])
            direction = top['direction']
            pct = abs(round(
                (top['value'] - top['personal_mean']) /
                max(top['personal_mean'], 0.01) * 100, 0
            ))
            description = (
                f"Anomaly detected: {label} is {pct:.0f}% "
                f"{direction} your personal baseline "
                f"(current: {top['value']}, avg: {top['personal_mean']})"
            )
        else:
            # Global baseline: compare to feature_ranges
            ranges = metadata.get('feature_ranges', {})
            worst_feature = None
            worst_deviation = 0
            for feat in ANOMALY_FEATURES:
                value = current_metrics.get(feat, 0)
                mean = ranges.get(feat, {}).get('mean', value)
                std = ranges.get(feat, {}).get('std', 1)
                if std > 0:
                    deviation = abs((value - mean) / std)
                    if deviation > worst_deviation:
                        worst_deviation = deviation
                        worst_feature = (feat, value, mean, deviation)

            if worst_feature:
                feat, val, mean, dev = worst_feature
                labels = {
                    'daily_velocity': 'team velocity',
                    'tasks_in_progress_ratio': 'tasks in progress ratio',
                    'blocked_ratio': 'blocked task ratio',
                    'overdue_ratio': 'overdue task ratio',
                    'workload_ratio': 'team workload ratio'
                }
                label = labels.get(feat, feat)
                direction = 'above' if val > mean else 'below'
                pct = round(abs(val - mean) / max(mean, 0.01) * 100, 0)
                description = (
                    f"Anomaly detected: {label} is {pct:.0f}% "
                    f"{direction} normal range "
                    f"(current: {round(val, 2)}, normal avg: {round(mean, 2)})"
                )

    return {
        'anomaly_score': round(anomaly_probability, 4),
        'is_anomaly': bool(is_anomaly),
        'model_type': model_type,
        'raw_score': round(float(raw_score), 4),
        'threshold': round(float(threshold), 4),
        'anomalous_features': sorted(
            anomalous_features,
            key=lambda x: x['z_score'],
            reverse=True
        )[:3],
        'description': description
    }
    """
    Predict anomaly score for current sprint metrics.
    Uses personal model if available, else global baseline.
    """
    personal_model_path = f'models/anomaly/personal/anomaly_{user_id}.pkl'
    global_model_path = 'models/anomaly/anomaly_global.pkl'

    # Choose which model to use
    if os.path.exists(personal_model_path):
        model = joblib.load(personal_model_path)
        metadata_path = f'models/anomaly/personal/anomaly_{user_id}_metadata.json'
        model_type = 'personal'
    elif os.path.exists(global_model_path):
        model = joblib.load(global_model_path)
        metadata_path = 'models/anomaly/anomaly_global_metadata.json'
        model_type = 'global_baseline'
    else:
        return {
            'anomaly_score': 0.5,
            'is_anomaly': False,
            'model_type': 'none',
            'message': 'No model available. Train models first.'
        }

    with open(metadata_path) as f:
        metadata = json.load(f)

    # Build feature vector
    features = [[
        current_metrics.get('daily_velocity', 0),
        current_metrics.get('tasks_in_progress_ratio', 0),
        current_metrics.get('blocked_ratio', 0),
        current_metrics.get('overdue_ratio', 0),
        current_metrics.get('workload_ratio', 0)
    ]]

    # Get anomaly score (-1 = anomaly, 1 = normal in sklearn)
    raw_score = model.score_samples(features)[0]
    threshold = metadata.get('threshold', -0.5)

    # Normalize score to 0-1 range (higher = more anomalous)
    is_anomaly = raw_score < threshold
    anomaly_probability = max(0, min(1, (threshold - raw_score) / abs(threshold)))

    # Identify which features are most anomalous
    anomalous_features = []
    if model_type == 'personal' and 'personal_stats' in metadata:
        for feat in ANOMALY_FEATURES:
            value = current_metrics.get(feat, 0)
            stats = metadata['personal_stats'].get(feat, {})
            mean = stats.get('mean', value)
            std = stats.get('std', 1)

            if std > 0:
                z_score = abs((value - mean) / std)
                if z_score > 2.0:
                    direction = 'above' if value > mean else 'below'
                    anomalous_features.append({
                        'feature': feat,
                        'value': round(value, 3),
                        'personal_mean': round(mean, 3),
                        'z_score': round(z_score, 2),
                        'direction': direction
                    })

    return {
        'anomaly_score': round(anomaly_probability, 4),
        'is_anomaly': bool(is_anomaly),
        'model_type': model_type,
        'raw_score': round(float(raw_score), 4),
        'threshold': round(float(threshold), 4),
        'anomalous_features': sorted(
            anomalous_features,
            key=lambda x: x['z_score'],
            reverse=True
        )[:3]
    }