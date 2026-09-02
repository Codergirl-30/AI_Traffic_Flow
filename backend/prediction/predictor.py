"""
Short-term traffic buildup predictor — RandomForest trained on synthetic
data at import time (no historical DB exists, so we generate a plausible
ground truth to train against).
"""

import numpy as np
from sklearn.ensemble import RandomForestRegressor

_FEATURE_NAMES = ["vehicle_count", "queue_length", "avg_speed_kmph", "avg_wait_time_s"]

_model = None


def _generate_synthetic_training_data(n_samples: int = 2000, seed: int = 42):
    rng = np.random.default_rng(seed)

    vehicle_count = rng.uniform(0, 80, n_samples)
    queue_length = rng.uniform(0, 40, n_samples)
    avg_speed_kmph = rng.uniform(2, 60, n_samples)
    avg_wait_time_s = rng.uniform(0, 120, n_samples)

    X = np.column_stack([vehicle_count, queue_length, avg_speed_kmph, avg_wait_time_s])

    noise = rng.normal(0, 2.0, n_samples)
    y = (
        0.35 * queue_length
        + 0.15 * vehicle_count
        + 0.08 * avg_wait_time_s
        - 0.10 * avg_speed_kmph
        + noise
    )
    y = np.clip(y, 0, None)
    return X, y


def _get_model() -> RandomForestRegressor:
    global _model
    if _model is None:
        X, y = _generate_synthetic_training_data()
        model = RandomForestRegressor(n_estimators=60, max_depth=6, random_state=42)
        model.fit(X, y)
        _model = model
    return _model


def predict_demand(road_state: dict) -> float:
    """
    Predict near-term extra demand for one road. Never raises — returns
    0.0 on any bad input so a flaky predictor can't crash decide().
    """
    try:
        model = _get_model()
        features = np.array([[road_state.get(name, 0.0) for name in _FEATURE_NAMES]])
        prediction = float(model.predict(features)[0])
        return max(0.0, prediction)
    except Exception:
        return 0.0