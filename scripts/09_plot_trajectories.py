"""
09_plot_trajectories.py
Part 9: Visualize actual vs predicted iceberg drift trajectories for unseen test icebergs.
Produces:
  - reports/trajectories/<iceberg_id>_trajectory.png (at least 5 icebergs)
  - reports/trajectories/combined_trajectories.png
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

TEST_PATH   = os.path.join("dataSet", "test.parquet")
MODEL_DIR   = "models"
OUT_DIR     = os.path.join("reports", "trajectories")
FEAT_PATH   = os.path.join(MODEL_DIR, "rf_features.json")
IMPUTER_PATH = os.path.join(MODEL_DIR, "rf_imputer.joblib")


def plot_trajectories():
    print("=" * 70)
    print("PLOTTING ACTUAL VS PREDICTED TRAJECTORIES FOR UNSEEN TEST ICEBERGS")
    print("=" * 70)

    os.makedirs(OUT_DIR, exist_ok=True)
    df_test = pd.read_parquet(TEST_PATH)

    with open(FEAT_PATH, "r") as f:
        feature_cols = json.load(f)
    imputer = joblib.load(IMPUTER_PATH)

    # Prefer Random Forest or XGBoost if available
    xgb_lat_path = os.path.join(MODEL_DIR, "xgboost_lat.json")
    xgb_lon_path = os.path.join(MODEL_DIR, "xgboost_lon.json")
    if os.path.exists(xgb_lat_path) and os.path.exists(xgb_lon_path):
        import xgboost as xgb
        model_lat = xgb.XGBRegressor()
        model_lon = xgb.XGBRegressor()
        model_lat.load_model(xgb_lat_path)
        model_lon.load_model(xgb_lon_path)
        model_title = "XGBoost"
    else:
        model_lat = joblib.load(os.path.join(MODEL_DIR, "random_forest_lat.joblib"))
        model_lon = joblib.load(os.path.join(MODEL_DIR, "random_forest_lon.joblib"))
        model_title = "Random Forest"

    X_test = imputer.transform(df_test[feature_cols])
    df_test["pred_delta_lat"] = model_lat.predict(X_test)
    df_test["pred_delta_lon"] = model_lon.predict(X_test)
    df_test["pred_target_lat"] = df_test["lat"] + df_test["pred_delta_lat"]
    df_test["pred_target_lon"] = df_test["lon"] + df_test["pred_delta_lon"]

    # Select representative test icebergs (sorted by observation count)
    ib_counts = df_test["iceberg_id"].value_counts()
    print(f"Test Iceberg observation counts:\n{ib_counts}")
    selected_icebergs = ib_counts.head(5).index.tolist()

    # 1. Individual plots for at least 5 icebergs
    for ib_id in selected_icebergs:
        sub = df_test[df_test["iceberg_id"] == ib_id].sort_values("date").reset_index(drop=True)
        if len(sub) < 2:
            continue

        plt.figure(figsize=(9, 7))
        # Actual track
        plt.plot(sub["lon"], sub["lat"], "b-o", markersize=4, linewidth=1.8, label="Actual Observed Track", alpha=0.85)
        # Next-step predictions (from current point to predicted next point)
        plt.plot(sub["pred_target_lon"], sub["pred_target_lat"], "r--^", markersize=4, linewidth=1.4, label=f"Predicted Next Position ({model_title})", alpha=0.75)

        # Mark start and end points
        plt.plot(sub["lon"].iloc[0], sub["lat"].iloc[0], "go", markersize=10, label="Start Point", zorder=5)
        plt.plot(sub["lon"].iloc[-1], sub["lat"].iloc[-1], "ks", markersize=10, label="End Point", zorder=5)

        plt.title(f"Unseen Test Iceberg: {ib_id} ({len(sub)} observations in 2024)\nActual vs {model_title} 1-Step Ahead Drift", fontsize=12)
        plt.xlabel("Longitude (°E/W)")
        plt.ylabel("Latitude (°S)")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.legend(loc="best")
        plt.tight_layout()

        out_path = os.path.join(OUT_DIR, f"{ib_id}_trajectory.png")
        plt.savefig(out_path, dpi=200)
        plt.close()
        print(f"  Saved trajectory plot: {out_path}")

    # 2. Combined plot of all test icebergs
    plt.figure(figsize=(11, 8))
    for ib_id in selected_icebergs:
        sub = df_test[df_test["iceberg_id"] == ib_id].sort_values("date").reset_index(drop=True)
        plt.plot(sub["lon"], sub["lat"], "-o", markersize=3, linewidth=1.5, label=f"{ib_id} (Actual)")
        plt.plot(sub["pred_target_lon"], sub["pred_target_lat"], "--", linewidth=1.0, alpha=0.7)

    plt.title(f"Combined Test Iceberg Drift Tracks (Model: {model_title})\nSolid = Actual, Dashed = Predicted", fontsize=13)
    plt.xlabel("Longitude (°E/W)")
    plt.ylabel("Latitude (°S)")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="best", fontsize=9)
    plt.tight_layout()

    comb_path = os.path.join(OUT_DIR, "combined_trajectories.png")
    plt.savefig(comb_path, dpi=200)
    plt.close()
    print(f"  Saved combined trajectory plot: {comb_path}")


if __name__ == "__main__":
    plot_trajectories()
