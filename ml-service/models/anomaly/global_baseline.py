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

def generate_global_baseline_data(n_samples=800):
    """
    Generate normal developer productivity data
    based on industry benchmarks.
    Represents a typical 2-week sprint team.
    """
    print("Generating global baseline training data...")
    data = []

    for _ in range(n_samples):
        # Normal range: 1-4 story points per day per developer
        daily_velocity = np.random.normal(2.5, 0.8)
        daily_velocity = max(0.2, min(6.0, daily_velocity))

        # 40-80% of sprint in progress at any time is normal
        tasks_in_progress_ratio = np.random.normal(0.55, 0.15)
        tasks_in_progress_ratio = max(0.1, min(0.9, tasks_in_progress_ratio))

        # 0-20% blocked at any time is normal
        blocked_ratio = np.random.exponential(0.1)
        blocked_ratio = max(0.0, min(0.4, blocked_ratio))

        # 0-15% overdue is normal (some tasks run over)
        overdue_ratio = np.random.exponential(0.07)
        overdue_ratio = max(0.0, min(0.3, overdue_ratio))

        # 70-100% workload is normal during sprint
        workload_ratio = np.random.normal(0.85, 0.12)
        workload_ratio = max(0.4, min(1.3, workload_ratio))

        data.append({
            'daily_velocity': round(daily_velocity, 3),
            'tasks_in_progress_ratio': round(tasks_in_progress_ratio, 3),
            'blocked_ratio': round(blocked_ratio, 3),
            'overdue_ratio': round(overdue_ratio, 3),
            'workload_ratio': round(workload_ratio, 3)
        })

    return pd.DataFrame(data)

def train_global_model():
    """Train Isolation Forest on global baseline data"""
    os.makedirs('models/anomaly', exist_ok=True)

    df = generate_global_baseline_data(800)

    print("Training Isolation Forest (global baseline)...")
    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,  # expect 5% anomalies in normal data
        random_state=42,
        max_features=len(ANOMALY_FEATURES)
    )

    model.fit(df[ANOMALY_FEATURES])

    # Test on the training data to calibrate threshold
    scores = model.score_samples(df[ANOMALY_FEATURES])
    threshold = np.percentile(scores, 5)  # bottom 5% = anomaly

    # Save model
    model_path = 'models/anomaly/anomaly_global.pkl'
    joblib.dump(model, model_path)

    metadata = {
        'features': ANOMALY_FEATURES,
        'contamination': 0.05,
        'threshold': float(threshold),
        'n_samples': len(df),
        'model_type': 'global_baseline',
        'feature_ranges': {
            feat: {
                'mean': float(df[feat].mean()),
                'std': float(df[feat].std()),
                'min': float(df[feat].min()),
                'max': float(df[feat].max())
            }
            for feat in ANOMALY_FEATURES
        }
    }

    metadata_path = 'models/anomaly/anomaly_global_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Global anomaly model saved to {model_path} ✅")
    print(f"Anomaly threshold: {threshold:.4f}")
    print(f"Features: {ANOMALY_FEATURES}")

    return model, threshold

if __name__ == '__main__':
    train_global_model()