import pandas as pd
import numpy as np
import joblib
import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    confusion_matrix
)
from sklearn.preprocessing import StandardScaler
import shap

FEATURES = [
    'velocity_ratio',
    'completion_pct',
    'days_elapsed_ratio',
    'overloaded_members_ratio',
    'blocked_tasks_ratio',
    'overdue_tasks_ratio',
    'scope_ratio',
    'high_priority_incomplete_ratio'
]

def train():
    print("Loading training data...")
    df = pd.read_csv('sprint_training_data.csv')

    X = df[FEATURES]
    y = df['success']

    print(f"Dataset: {len(df)} sprints")
    print(f"Success: {y.sum()} ({y.mean():.1%})")
    print(f"Failure: {(1-y).sum()} ({(1-y).mean():.1%})")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train Random Forest
    print("\nTraining Random Forest...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    # Cross validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')

    print(f"\nTest Accuracy: {accuracy:.1%}")
    print(f"Cross-validation: {cv_scores.mean():.1%} (+/- {cv_scores.std():.1%})")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
          target_names=['Failure', 'Success']))

    # Feature importance
    feature_importance = dict(zip(FEATURES, model.feature_importances_))
    print("\nFeature Importance:")
    for feat, imp in sorted(feature_importance.items(),
                            key=lambda x: x[1], reverse=True):
        bar = '█' * int(imp * 40)
        print(f"  {feat:<40} {bar} {imp:.3f}")

    # Save model
    joblib.dump(model, 'sprint_model.pkl')
    print("\nModel saved to sprint_model.pkl ✅")

    # Save model metadata
    metadata = {
        'features': FEATURES,
        'accuracy': round(accuracy, 4),
        'cv_accuracy': round(cv_scores.mean(), 4),
        'cv_std': round(cv_scores.std(), 4),
        'n_estimators': 200,
        'feature_importance': {
            k: round(v, 4)
            for k, v in sorted(
                feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
        }
    }

    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print("Metadata saved to model_metadata.json ✅")
    print(f"\nFinal model accuracy: {accuracy:.1%}")
    return model, accuracy

if __name__ == '__main__':
    train()