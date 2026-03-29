import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

FEATURES = [
    'task_type_numeric',
    'priority_numeric',
    'story_points',
    'word_count'
]

TARGET = 'actual_days'

def train():
    data_path = 'models/duration/duration_training_data.csv'

    if not os.path.exists(data_path):
        print("Training data not found. Run generate_data.py first.")
        return

    print("Loading duration training data...")
    df = pd.read_csv(data_path)

    print(f"Dataset: {len(df)} samples")
    print(f"Duration range: {df[TARGET].min():.1f} to {df[TARGET].max():.1f} days")
    print(f"Mean duration: {df[TARGET].mean():.2f} days")

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train Gradient Boosting Regressor
    print("\nTraining Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    # Cross validation
    cv_scores = cross_val_score(
        model, X, y, cv=5, scoring='neg_mean_absolute_error'
    )
    cv_mae = -cv_scores.mean()

    print(f"\nTest MAE:  {mae:.2f} days")
    print(f"Test RMSE: {rmse:.2f} days")
    print(f"Test R²:   {r2:.3f}")
    print(f"CV MAE:    {cv_mae:.2f} days (+/- {cv_scores.std():.2f})")

    # Feature importance
    feature_importance = dict(zip(FEATURES, model.feature_importances_))
    print("\nFeature Importance:")
    for feat, imp in sorted(
        feature_importance.items(), key=lambda x: x[1], reverse=True
    ):
        bar = '█' * int(imp * 50)
        print(f"  {feat:<30} {bar} {imp:.3f}")

    # Duration stats per task type for confidence intervals
    type_stats = df.groupby('task_type')[TARGET].agg(
        ['mean', 'std', 'min', 'max']
    ).round(2).to_dict()

    # Save model
    model_path = 'models/duration/duration_model.pkl'
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path} ✅")

    # Save metadata
    metadata = {
        'features': FEATURES,
        'target': TARGET,
        'mae': round(mae, 4),
        'rmse': round(rmse, 4),
        'r2': round(r2, 4),
        'cv_mae': round(cv_mae, 4),
        'feature_importance': {
            k: round(v, 4) for k, v in sorted(
                feature_importance.items(),
                key=lambda x: x[1], reverse=True
            )
        },
        'task_type_encoding': {
            'backend': 0, 'frontend': 1, 'testing': 2,
            'devops': 3, 'general': 4
        },
        'priority_encoding': {
            'Highest': 5, 'High': 4, 'Medium': 3,
            'Low': 2, 'Lowest': 1
        },
        'duration_stats_by_type': type_stats
    }

    metadata_path = 'models/duration/duration_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {metadata_path} ✅")

    # Test predictions for common tasks
    print("\nSample predictions:")
    test_cases = [
        ('Build REST API endpoint', 'backend',  'High',    8),
        ('Create login page UI',    'frontend', 'Medium',  5),
        ('Write unit tests',        'testing',  'Low',     3),
        ('Fix security bug',        'backend',  'Highest', 5),
        ('Responsive mobile layout','frontend', 'Medium',  3),
    ]

    type_map = {'backend': 0, 'frontend': 1, 'testing': 2, 'devops': 3, 'general': 4}
    prio_map = {'Highest': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Lowest': 1}

    for title, ttype, prio, pts in test_cases:
        features = [[
            type_map[ttype],
            prio_map[prio],
            pts,
            len(title.split())
        ]]
        pred = model.predict(features)[0]
        print(f"  '{title}' → {pred:.1f} days")

    return model, mae

if __name__ == '__main__':
    os.makedirs('models/duration', exist_ok=True)
    train()