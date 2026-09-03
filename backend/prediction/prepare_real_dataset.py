"""
Turns the raw real-world dataset (Time, Date, Day of the week, CarCount,
BikeCount, BusCount, TruckCount, Total, Traffic Situation) into the
feature set our predictor needs: vehicle_count, queue_length,
avg_speed_kmph, avg_wait_time_s — plus a genuine prediction target.

IMPORTANT: this file's rows are already in true chronological order (we
verified this — Date and Day of the week increase in step through the
file). We deliberately do NOT reshuffle or re-sort by Date/Time, since
the Date column alone (1-31) can't distinguish which of the two months a
row belongs to, and re-sorting on it would scramble the real time order.

Run this from the repo root:
    python -m backend.prediction.prepare_real_dataset
"""

import pandas as pd
import os

from backend.prediction.traffic_flow_theory import (
    derive_queue_length,
    derive_wait_time,
    derive_speed,
)

RAW_PATH = os.path.join("data", "TrafficTwoMonth.csv")
OUTPUT_PATH = os.path.join("data", "real_traffic_processed.csv")

INTERVAL_SECONDS = 15 * 60  # dataset is recorded in 15-minute buckets


def prepare():
    df = pd.read_csv(RAW_PATH)

    # Preserve original row order — do NOT sort, it's already chronological.
    df["vehicle_count"] = df["Total"].astype(float)

    df["queue_length"] = df["vehicle_count"].apply(
        lambda v: derive_queue_length(v, INTERVAL_SECONDS)
    )
    df["avg_wait_time_s"] = df["queue_length"].apply(derive_wait_time)
    df["avg_speed_kmph"] = df["queue_length"].apply(derive_speed)

    # Real prediction target: how much MORE traffic shows up next interval.
    # This is a genuine time-series forecasting target from real data,
    # not a synthetic formula.
    df["next_vehicle_count"] = df["vehicle_count"].shift(-1)
    df["predicted_increase_target"] = (
        df["next_vehicle_count"] - df["vehicle_count"]
    ).clip(lower=0)

    # Drop the last row (no "next" value to predict) and any nulls.
    df = df.dropna(subset=["predicted_increase_target"])

    output_columns = [
        "Time", "Date", "Day of the week", "Traffic Situation",
        "vehicle_count", "queue_length", "avg_speed_kmph", "avg_wait_time_s",
        "predicted_increase_target",
    ]
    df[output_columns].to_csv(OUTPUT_PATH, index=False)
    print(f"Processed {len(df)} rows -> {OUTPUT_PATH}")
    print(df[output_columns].describe())


if __name__ == "__main__":
    prepare()