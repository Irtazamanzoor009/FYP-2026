from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import joblib
import json
import numpy as np
import shap
import os
import sys
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))

from models.anomaly.train_personal import train_personal_model, predict_anomaly

app = FastAPI(
    title="ProManage ML Service",
    description="Sprint Outcome Predictor + Duration Estimator + Anomaly Detector",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# SPRINT PREDICTOR FEATURES
# ─────────────────────────────────────────
SPRINT_FEATURES = [
    'velocity_ratio',
    'completion_pct',
    'days_elapsed_ratio',
    'overloaded_members_ratio',
    'blocked_tasks_ratio',
    'overdue_tasks_ratio',
    'scope_ratio',
    'high_priority_incomplete_ratio'
]

FEATURE_LABELS = {
    'velocity_ratio': 'Team Velocity',
    'completion_pct': 'Work Completed',
    'days_elapsed_ratio': 'Sprint Progress',
    'overloaded_members_ratio': 'Team Overload',
    'blocked_tasks_ratio': 'Blocked Tasks',
    'overdue_tasks_ratio': 'Overdue Tasks',
    'scope_ratio': 'Sprint Scope',
    'high_priority_incomplete_ratio': 'Critical Tasks Pending'
}

# ─────────────────────────────────────────
# DURATION ESTIMATOR CONSTANTS
# ─────────────────────────────────────────
TASK_TYPE_KEYWORDS = {
    'backend': [
        'api', 'backend', 'database', 'migration', 'server',
        'endpoint', 'schema', 'auth', 'security', 'cache',
        'service', 'engine', 'calculator', 'sync'
    ],
    'frontend': [
        'ui', 'frontend', 'design', 'responsive', 'layout',
        'component', 'page', 'dashboard', 'interface', 'css',
        'html', 'react', 'widget', 'form', 'modal'
    ],
    'testing': [
        'test', 'testing', 'qa', 'quality', 'e2e',
        'unit', 'integration test', 'spec', 'coverage'
    ]
}

PRIORITY_NUMERIC = {
    'Highest': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Lowest': 1
}
TYPE_NUMERIC = {
    'backend': 0, 'frontend': 1, 'testing': 2, 'devops': 3, 'general': 4
}

# ─────────────────────────────────────────
# GLOBAL MODEL VARIABLES
# ─────────────────────────────────────────
MODEL = None
METADATA = None
EXPLAINER = None
DURATION_MODEL = None
DURATION_METADATA = None


@app.on_event("startup")
async def load_all_models():
    global MODEL, METADATA, EXPLAINER, DURATION_MODEL, DURATION_METADATA

    # Sprint predictor
    if os.path.exists("sprint_model.pkl"):
        MODEL = joblib.load("sprint_model.pkl")
        EXPLAINER = shap.TreeExplainer(MODEL)
        print("✅ Sprint predictor loaded")

    if os.path.exists("model_metadata.json"):
        with open("model_metadata.json") as f:
            METADATA = json.load(f)

    # Duration estimator
    if os.path.exists("models/duration/duration_model.pkl"):
        DURATION_MODEL = joblib.load("models/duration/duration_model.pkl")
        print("✅ Duration estimator loaded")

    if os.path.exists("models/duration/duration_metadata.json"):
        with open("models/duration/duration_metadata.json") as f:
            DURATION_METADATA = json.load(f)
        print(f"✅ Duration MAE: {DURATION_METADATA['mae']:.2f} days")

    # Global anomaly model
    if not os.path.exists("models/anomaly/anomaly_global.pkl"):
        print("⚠️ Global anomaly model missing. Training now...")
        from models.anomaly.global_baseline import train_global_model
        train_global_model()
    else:
        print("✅ Global anomaly model loaded")


# ─────────────────────────────────────────
# PYDANTIC MODELS — defined ONCE
# ─────────────────────────────────────────

class SprintFeatures(BaseModel):
    velocity_ratio: float
    completion_pct: float
    days_elapsed_ratio: float
    overloaded_members_ratio: float
    blocked_tasks_ratio: float
    overdue_tasks_ratio: float
    scope_ratio: float
    high_priority_incomplete_ratio: float
    sprint_name: Optional[str] = "Current Sprint"
    days_left: Optional[int] = 0
    blocked_count: Optional[int] = 0
    overloaded_count: Optional[int] = 0

class DurationRequest(BaseModel):
    title: str
    task_type: Optional[str] = None
    priority: str = "Medium"
    story_points: int = 5
    user_id: Optional[str] = None

class BatchRequest(BaseModel):
    tasks: List[DurationRequest]

class AnomalyPredictRequest(BaseModel):
    user_id: str
    daily_velocity: float
    tasks_in_progress_ratio: float
    blocked_ratio: float
    overdue_ratio: float
    workload_ratio: float

class AnomalyTrainRequest(BaseModel):
    user_id: str
    sprint_metrics: List[dict]

class RetrainSample(BaseModel):
    task_type_numeric: int
    priority_numeric: int
    story_points: int
    word_count: int
    actual_days: float

class RetrainRequest(BaseModel):
    new_samples: List[RetrainSample]
    user_id: Optional[str] = None
    create_personal_model: bool = False


# ─────────────────────────────────────────
# HELPER FUNCTIONS — defined ONCE
# ─────────────────────────────────────────

def detect_task_type(title: str) -> str:
    title_lower = title.lower()
    for task_type, keywords in TASK_TYPE_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            return task_type
    return 'general'


def get_confidence_interval(predicted: float, task_type: str,
                            metadata: dict = None) -> dict:
    std = 1.2
    if metadata and 'duration_stats_by_type' in metadata:
        stats = metadata['duration_stats_by_type']
        type_std = stats.get('std', {})
        if isinstance(type_std, dict):
            std = type_std.get(task_type, 1.2)
    elif DURATION_METADATA and 'duration_stats_by_type' in DURATION_METADATA:
        stats = DURATION_METADATA['duration_stats_by_type']
        type_std = stats.get('std', {})
        if isinstance(type_std, dict):
            std = type_std.get(task_type, 1.2)
    low = max(0.5, round(predicted - std * 0.8, 1))
    high = round(predicted + std * 0.8, 1)
    return {'low': low, 'high': high}


def load_duration_model_for_user(user_id: str = None):
    """Returns best duration model for user. Personal first, global fallback."""
    if user_id:
        personal_path = f"models/duration/personal/duration_{user_id}.pkl"
        if os.path.exists(personal_path):
            model = joblib.load(personal_path)
            meta_path = (
                f"models/duration/personal/duration_{user_id}_metadata.json"
            )
            metadata = None
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    metadata = json.load(f)
            return model, 'personal', metadata
    return DURATION_MODEL, 'global', DURATION_METADATA


def generate_recommendations(factors, data, success_prob):
    recommendations = []
    for factor in factors[:3]:
        if factor["direction"] == "negative":
            feat = factor["feature"]
            if feat == "blocked_tasks_ratio" and data.blocked_count > 0:
                improvement = min(15, data.blocked_count * 5)
                recommendations.append({
                    "action": f"Resolve {data.blocked_count} blocked task(s)",
                    "impact": f"+{improvement}% success probability",
                    "priority": "HIGH"
                })
            elif (feat == "overloaded_members_ratio"
                  and data.overloaded_count > 0):
                recommendations.append({
                    "action": (
                        f"Redistribute tasks from "
                        f"{data.overloaded_count} overloaded member(s)"
                    ),
                    "impact": "+8-12% success probability",
                    "priority": "HIGH"
                })
            elif feat == "velocity_ratio":
                recommendations.append({
                    "action": (
                        "Focus team on completing In Progress tasks "
                        "before starting new ones"
                    ),
                    "impact": "+10-20% success probability",
                    "priority": "CRITICAL"
                })
            elif feat == "scope_ratio" and data.scope_ratio > 1.3:
                recommendations.append({
                    "action": (
                        "Descope 20-30% of remaining To Do tasks "
                        "to next sprint"
                    ),
                    "impact": "+15% success probability",
                    "priority": "HIGH"
                })
            elif feat == "high_priority_incomplete_ratio":
                recommendations.append({
                    "action": (
                        "Prioritize all Highest/High priority "
                        "incomplete tasks immediately"
                    ),
                    "impact": "+5-10% success probability",
                    "priority": "MEDIUM"
                })
    if not recommendations:
        if success_prob > 60:
            recommendations.append({
                "action": "Maintain current pace and monitor daily",
                "impact": "Sprint on track",
                "priority": "LOW"
            })
        else:
            recommendations.append({
                "action": "Consider emergency sprint replanning with team",
                "impact": "Prevents full sprint failure",
                "priority": "CRITICAL"
            })
    return recommendations[:3]


# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "running",
        "model_loaded": MODEL is not None,
        "accuracy": METADATA['accuracy'] if METADATA else None
    }


@app.get("/model-info")
def model_info():
    if not METADATA:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return METADATA


@app.post("/predict")
def predict(data: SprintFeatures):
    if MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Run train.py first."
        )

    features = np.array([[
        data.velocity_ratio,
        data.completion_pct,
        data.days_elapsed_ratio,
        data.overloaded_members_ratio,
        data.blocked_tasks_ratio,
        data.overdue_tasks_ratio,
        data.scope_ratio,
        data.high_priority_incomplete_ratio
    ]])

    prediction = MODEL.predict(features)[0]
    probabilities = MODEL.predict_proba(features)[0]
    success_probability = round(float(probabilities[1]) * 100, 1)
    failure_probability = round(float(probabilities[0]) * 100, 1)
    confidence = round(max(probabilities) * 100, 1)

    shap_values = EXPLAINER.shap_values(features)
    if isinstance(shap_values, list):
        shap_for_success = shap_values[1][0]
    else:
        shap_for_success = shap_values[0]

    factors = []
    for i, feat_name in enumerate(SPRINT_FEATURES):
        impact = float(shap_for_success[i])
        factors.append({
            "feature": feat_name,
            "label": FEATURE_LABELS[feat_name],
            "value": float(features[0][i]),
            "impact": round(impact, 4),
            "impact_percent": round(abs(impact) * 100, 1),
            "direction": "positive" if impact > 0 else "negative"
        })
    factors.sort(key=lambda x: abs(x["impact"]), reverse=True)

    recommendations = generate_recommendations(
        factors, data, success_probability
    )

    if success_probability >= 70:
        outcome = "LIKELY TO SUCCEED"
        outcome_color = "green"
    elif success_probability >= 40:
        outcome = "AT RISK"
        outcome_color = "yellow"
    else:
        outcome = "LIKELY TO FAIL"
        outcome_color = "red"

    return {
        "success_probability": success_probability,
        "failure_probability": failure_probability,
        "confidence": confidence,
        "outcome": outcome,
        "outcome_color": outcome_color,
        "prediction": int(prediction),
        "factors": factors[:6],
        "recommendations": recommendations,
        "model_accuracy": METADATA['accuracy'] if METADATA else None,
        "sprint_name": data.sprint_name
    }


# ─────────────────────────────────────────
# DURATION ESTIMATION
# ─────────────────────────────────────────

@app.post("/estimate-duration")
def estimate_duration(data: DurationRequest):
    model, model_type, metadata = load_duration_model_for_user(data.user_id)

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Duration model not loaded. Run models/duration/train.py first."
        )

    task_type = data.task_type or detect_task_type(data.title)

    features = np.array([[
        TYPE_NUMERIC.get(task_type, 4),
        PRIORITY_NUMERIC.get(data.priority, 3),
        data.story_points,
        len(data.title.split())
    ]])

    predicted_days = float(model.predict(features)[0])
    predicted_days = max(0.5, round(predicted_days, 1))
    confidence = get_confidence_interval(predicted_days, task_type, metadata)

    if predicted_days <= 1.5:
        suggested_points = 2
    elif predicted_days <= 2.5:
        suggested_points = 3
    elif predicted_days <= 4.0:
        suggested_points = 5
    elif predicted_days <= 6.0:
        suggested_points = 8
    else:
        suggested_points = 13

    mae = (metadata['mae'] if metadata
           else (DURATION_METADATA['mae'] if DURATION_METADATA else None))

    return {
        "title": data.title,
        "task_type": task_type,
        "priority": data.priority,
        "story_points": data.story_points,
        "predicted_days": predicted_days,
        "confidence_low": confidence['low'],
        "confidence_high": confidence['high'],
        "suggested_story_points": suggested_points,
        "model_mae": mae,
        "model_type": model_type,
        "interpretation": (
            f"This task is estimated to take {predicted_days} days "
            f"(range: {confidence['low']} to {confidence['high']} days)"
        )
    }


@app.post("/estimate-duration/batch")
def estimate_duration_batch(data: BatchRequest):
    results = []
    for task in data.tasks:
        try:
            result = estimate_duration(task)
            results.append(result)
        except Exception as e:
            results.append({
                "title": task.title,
                "error": str(e),
                "predicted_days": 3.0,
                "confidence_low": 1.5,
                "confidence_high": 5.0
            })
    return {"tasks": results, "count": len(results)}


# ─────────────────────────────────────────
# DURATION MODEL RETRAINING
# ─────────────────────────────────────────

@app.post("/retrain-duration")
def retrain_duration(data: RetrainRequest):
    if not data.new_samples:
        raise HTTPException(status_code=400, detail="No samples provided.")

    new_rows = []
    type_names = ['backend', 'frontend', 'testing', 'devops', 'general']
    for sample in data.new_samples:
        new_rows.append({
            'title': 'real_sprint_task',
            'task_type': type_names[min(sample.task_type_numeric, 4)],
            'task_type_numeric': sample.task_type_numeric,
            'priority': 'Medium',
            'priority_numeric': sample.priority_numeric,
            'story_points': sample.story_points,
            'word_count': sample.word_count,
            'actual_days': sample.actual_days
        })

    df_new = pd.DataFrame(new_rows)
    df_new_weighted = pd.concat([df_new] * 10, ignore_index=True)

    try:
        if data.create_personal_model and data.user_id:
            # ── Personal model for this user ──
            os.makedirs('models/duration/personal', exist_ok=True)

            global_data_path = 'models/duration/duration_training_data.csv'
            if os.path.exists(global_data_path):
                df_base = pd.read_csv(global_data_path)
            else:
                df_base = pd.DataFrame(columns=df_new.columns)

            df_combined = pd.concat(
                [df_base, df_new_weighted], ignore_index=True
            )

            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import mean_absolute_error

            DURATION_FEATURES = [
                'task_type_numeric', 'priority_numeric',
                'story_points', 'word_count'
            ]

            X = df_combined[DURATION_FEATURES]
            y = df_combined['actual_days']

            model = GradientBoostingRegressor(
                n_estimators=200, max_depth=4,
                learning_rate=0.1, random_state=42
            )

            if len(df_combined) > 10:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                model.fit(X_train, y_train)
                mae = mean_absolute_error(y_test, model.predict(X_test))
            else:
                model.fit(X, y)
                mae = 1.5

            model_path = (
                f'models/duration/personal/duration_{data.user_id}.pkl'
            )
            joblib.dump(model, model_path)

            metadata_out = {
                'user_id': data.user_id,
                'mae': round(float(mae), 4),
                'n_samples': len(df_new),
                'total_training_samples': len(df_combined),
                'model_type': 'personal',
                'duration_stats_by_type': {
                    'std': df_new.groupby('task_type')['actual_days']
                    .std().fillna(1.2).to_dict()
                }
            }
            meta_path = (
                f'models/duration/personal/'
                f'duration_{data.user_id}_metadata.json'
            )
            with open(meta_path, 'w') as f:
                json.dump(metadata_out, f, indent=2)

            return {
                "success": True,
                "model_type": "personal",
                "user_id": data.user_id,
                "new_samples_added": len(data.new_samples),
                "total_training_samples": len(df_combined),
                "new_mae": round(float(mae), 4),
                "message": (
                    f"Personal model created for user {data.user_id} "
                    f"with {len(data.new_samples)} real sprint tasks. "
                    f"MAE: {mae:.2f} days"
                )
            }

        else:
            # ── Update global model ──
            data_path = 'models/duration/duration_training_data.csv'
            if os.path.exists(data_path):
                df_existing = pd.read_csv(data_path)
                df_combined = pd.concat(
                    [df_existing, df_new_weighted], ignore_index=True
                )
            else:
                df_combined = df_new_weighted

            df_combined.to_csv(data_path, index=False)

            from models.duration.train import train
            model_retrained, mae = train()

            global DURATION_MODEL, DURATION_METADATA
            DURATION_MODEL = joblib.load(
                'models/duration/duration_model.pkl'
            )
            with open('models/duration/duration_metadata.json') as f:
                DURATION_METADATA = json.load(f)

            return {
                "success": True,
                "model_type": "global",
                "new_samples_added": len(data.new_samples),
                "total_training_samples": len(df_combined),
                "new_mae": round(float(mae), 4),
                "message": (
                    f"Global model retrained with {len(data.new_samples)} "
                    f"real sprint tasks. MAE: {mae:.2f} days"
                )
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Retraining failed: {str(e)}"
        )


@app.get("/duration-model-info/{user_id}")
def get_duration_model_info(user_id: str):
    personal_path = (
        f"models/duration/personal/duration_{user_id}_metadata.json"
    )
    if os.path.exists(personal_path):
        with open(personal_path) as f:
            info = json.load(f)
        info['active_model'] = 'personal'
        return info

    if DURATION_METADATA:
        result = dict(DURATION_METADATA)
        result['active_model'] = 'global'
        result['note'] = (
            'Using global model. '
            'Complete 3+ sprints for personal model.'
        )
        return result

    raise HTTPException(status_code=404, detail="No duration model found")


# ─────────────────────────────────────────
# ANOMALY DETECTION
# ─────────────────────────────────────────

@app.post("/anomaly/predict")
def predict_anomaly_endpoint(data: AnomalyPredictRequest):
    metrics = {
        'daily_velocity': data.daily_velocity,
        'tasks_in_progress_ratio': data.tasks_in_progress_ratio,
        'blocked_ratio': data.blocked_ratio,
        'overdue_ratio': data.overdue_ratio,
        'workload_ratio': data.workload_ratio
    }

    result = predict_anomaly(data.user_id, metrics)

    description = None
    if result['is_anomaly'] and result.get('anomalous_features'):
        top = result['anomalous_features'][0]
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
            f"({top['value']} vs avg {top['personal_mean']})"
        )
    elif result['is_anomaly']:
        # Global baseline fallback description
        description = (
            "Anomaly detected: sprint metrics deviate "
            "significantly from normal patterns."
        )

    result['description'] = description
    return result


@app.post("/anomaly/train")
def train_anomaly_endpoint(data: AnomalyTrainRequest):
    result = train_personal_model(data.user_id, data.sprint_metrics)
    return result


@app.get("/anomaly/model-info/{user_id}")
def get_anomaly_model_info(user_id: str):
    personal_path = (
        f"models/anomaly/personal/anomaly_{user_id}_metadata.json"
    )
    global_path = "models/anomaly/anomaly_global_metadata.json"

    if os.path.exists(personal_path):
        with open(personal_path) as f:
            return json.load(f)
    elif os.path.exists(global_path):
        with open(global_path) as f:
            info = json.load(f)
        info['note'] = (
            'Using global baseline. '
            'Complete 3+ sprints for personal model.'
        )
        return info
    else:
        raise HTTPException(
            status_code=404, detail="No anomaly model found"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)