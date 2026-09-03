"""
Short-term traffic buildup predictor.

Loads the model trained on REAL data (see train_model.py, trained on
data/real_traffic_processed.csv derived from TrafficTwoMonth.csv) from
models/traffic_predictor.joblib.

If that file doesn't exist yet (e.g. a teammate pulls this branch before
running the training step), we fall back to a small synthetic-trained
model so the demo never breaks — but this should not happen once
train_model.py has been run and the .joblib file is committed.
"""

import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = os.path.join("models", "traffic_predictor.joblib")

# Must match the exact order used in train_model.py's FEATURE_COLUMNS.
_FEATURE_NAMES = ["vehicle_count", "queue_length", "avg_speed_kmph", "avg_wait_time_s", "hour"]

_model = None


def _train_synthetic_fallback() -> RandomForestRegressor:
    """
    Safety net only — used if models/traffic_predictor.joblib is missing.
    Not the real model; just keeps decide() from crashing.
    """
    rng = np.random.default_rng(42)
    n = 500
    vehicle_count = rng.uniform(0, 80, n)
    queue_length = rng.uniform(0, 40, n)
    avg_speed_kmph = rng.uniform(2, 60, n)
    avg_wait_time_s = rng.uniform(0, 120, n)
    hour = rng.uniform(0, 23, n)
    X = np.column_stack([vehicle_count, queue_length, avg_speed_kmph, avg_wait_time_s, hour])
    y = np.clip(0.35 * queue_length + 0.15 * vehicle_count - 0.1 * avg_speed_kmph, 0, None)
    model = RandomForestRegressor(n_estimators=40, max_depth=6, random_state=42)
    model.fit(X, y)
    return model


def _get_model():
    global _model
    if _model is not None:
        return _model

    try:
        _model = joblib.load(MODEL_PATH)
        print(f"[predictor] Loaded real-data-trained model from {MODEL_PATH}")
    except Exception as error:
        print(f"[predictor] Could not load {MODEL_PATH} ({error}); using synthetic fallback. "
              f"Run `python -m backend.prediction.train_model` to fix this.")
        _model = _train_synthetic_fallback()

    return _model


def predict_demand(road_state: dict) -> float:
    """
    Predict near-term extra demand (additional vehicles expected soon)
    for a single road's current state. Never raises — returns 0.0 on any
    bad input so a flaky predictor can never crash decide().
    """
    try:
        model = _get_model()
        current_hour = datetime.now().hour  # live wall-clock hour, real diurnal signal
        features = pd.DataFrame([{
            "vehicle_count": road_state.get("vehicle_count", 0.0),
            "queue_length": road_state.get("queue_length", 0.0),
            "avg_speed_kmph": road_state.get("avg_speed_kmph", 0.0),
            "avg_wait_time_s": road_state.get("avg_wait_time_s", 0.0),
            "hour": current_hour,
        }])[_FEATURE_NAMES]
        prediction = float(model.predict(features)[0])
        return max(0.0, prediction)
    except Exception:
        return 0.0