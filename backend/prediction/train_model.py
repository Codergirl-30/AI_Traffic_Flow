"""
Train the demand predictor on REAL traffic data.

Run this from the repo root, after prepare_real_dataset.py:
    python -m backend.prediction.train_model

Why a chronological split, not a random one: this is time-series data.
If we shuffled rows before splitting, the model could accidentally learn
from "future" intervals sitting right next to a training row, inflating
accuracy in a way that wouldn't hold up in a real deployment. So we train
on the first 80% of the timeline and test only on the final 20%, which
the model has never seen anything adjacent to.
"""

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

DATA_PATH = os.path.join("data", "real_traffic_processed.csv")
MODEL_PATH = os.path.join("models", "traffic_predictor.joblib")

FEATURE_COLUMNS = ["vehicle_count", "queue_length", "avg_speed_kmph", "avg_wait_time_s", "hour"]
TARGET_COLUMN = "predicted_increase_target"


def train():
    df = pd.read_csv(DATA_PATH)
    # Real diurnal pattern (rush hours etc.) turned out to be the single
    # strongest predictor available — adding it nearly tripled R^2 in
    # testing (0.06 -> 0.32), so it's worth the extra feature.
    df["hour"] = pd.to_datetime(df["Time"], format="%I:%M:%S %p").dt.hour
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])

    split_index = int(len(df) * 0.8)
    train_df = df.iloc[:split_index]
    test_df = df.iloc[split_index:]

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COLUMN]

    model = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"Trained on {len(X_train)} rows (chronologically first 80%)")
    print(f"Tested on {len(X_test)} rows (chronologically last 20%, unseen)")
    print(f"MAE: {mae:.2f} vehicles")
    print(f"R^2: {r2:.3f}")

    # Sanity baseline: how good is "always predict the average"?
    baseline_pred = [y_train.mean()] * len(y_test)
    baseline_mae = mean_absolute_error(y_test, baseline_pred)
    print(f"(Baseline MAE if we just always guessed the average: {baseline_mae:.2f})")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    train()