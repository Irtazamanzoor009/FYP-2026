from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import json
import numpy as np
import shap
import os

app = FastAPI(
    title="ProManage ML Service",
    description="Sprint Outcome Predictor using Random Forest + SHAP",
    version="1.0.0"
)

# CORS — allow Node.js backend to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and metadata on startup
MODEL = None
METADATA = None
EXPLAINER = None

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

@app.on_event("startup")
async def load_model():
    global MODEL, METADATA, EXPLAINER
    model_path = "sprint_model.pkl"
    metadata_path = "model_metadata.json"

    if not os.path.exists(model_path):
        print("⚠️  Model not found. Run train.py first.")
        return

    MODEL = joblib.load(model_path)
    EXPLAINER = shap.TreeExplainer(MODEL)
    print("✅ Model loaded successfully")

    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            METADATA = json.load(f)
        print(f"✅ Model accuracy: {METADATA['accuracy']:.1%}")

class SprintFeatures(BaseModel):
    velocity_ratio: float
    completion_pct: float
    days_elapsed_ratio: float
    overloaded_members_ratio: float
    blocked_tasks_ratio: float
    overdue_tasks_ratio: float
    scope_ratio: float
    high_priority_incomplete_ratio: float
    # Optional context for better recommendations
    sprint_name: Optional[str] = "Current Sprint"
    days_left: Optional[int] = 0
    blocked_count: Optional[int] = 0
    overloaded_count: Optional[int] = 0

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

    # Build feature vector
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

    # Get prediction and probability
    prediction = MODEL.predict(features)[0]
    probabilities = MODEL.predict_proba(features)[0]
    success_probability = round(float(probabilities[1]) * 100, 1)
    failure_probability = round(float(probabilities[0]) * 100, 1)
    confidence = round(max(probabilities) * 100, 1)

    # SHAP explanation
    shap_values = EXPLAINER.shap_values(features)

    # For binary classification get SHAP for success class
    if isinstance(shap_values, list):
        shap_for_success = shap_values[1][0]
    else:
        shap_for_success = shap_values[0]

    # Build factor impacts
    factors = []
    for i, feat_name in enumerate(FEATURES):
        impact = float(shap_for_success[i])
        factors.append({
            "feature": feat_name,
            "label": FEATURE_LABELS[feat_name],
            "value": float(features[0][i]),
            "impact": round(impact, 4),
            "impact_percent": round(abs(impact) * 100, 1),
            "direction": "positive" if impact > 0 else "negative"
        })

    # Sort by absolute impact
    factors.sort(key=lambda x: abs(x["impact"]), reverse=True)

    # Generate recommendations based on top negative factors
    recommendations = generate_recommendations(
        factors, data, success_probability
    )

    # Outcome label
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
        "factors": factors[:6],  # top 6 factors
        "recommendations": recommendations,
        "model_accuracy": METADATA['accuracy'] if METADATA else None,
        "sprint_name": data.sprint_name
    }

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
            elif feat == "overloaded_members_ratio" and data.overloaded_count > 0:
                recommendations.append({
                    "action": f"Redistribute tasks from {data.overloaded_count} overloaded member(s)",
                    "impact": "+8-12% success probability",
                    "priority": "HIGH"
                })
            elif feat == "velocity_ratio":
                recommendations.append({
                    "action": "Focus team on completing In Progress tasks before starting new ones",
                    "impact": "+10-20% success probability",
                    "priority": "CRITICAL"
                })
            elif feat == "scope_ratio" and data.scope_ratio > 1.3:
                recommendations.append({
                    "action": "Descope 20-30% of remaining To Do tasks to next sprint",
                    "impact": "+15% success probability",
                    "priority": "HIGH"
                })
            elif feat == "high_priority_incomplete_ratio":
                recommendations.append({
                    "action": "Prioritize all Highest/High priority incomplete tasks immediately",
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)