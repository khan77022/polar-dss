"""
10_error_analysis.py
Part 10: Granular error analysis across physical and environmental regimes.
Produces:
  - reports/error_analysis.csv
  - reports/error_by_regime.png
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

TEST_PATH   = os.path.join("dataSet", "test.parquet")
MODEL_DIR   = "models"
REPORT_DIR  = "reports"
FEAT_PATH   = os.path.join(MODEL_DIR, "rf_features.json")
IMPUTER_PATH = os.path.join(MODEL_DIR, "rf_imputer.joblib")


def compute_haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return R * c


def run_error_analysis():
    print("=" * 70)
    print("DETAILED ERROR ANALYSIS ON UNTOUCHED TEST SET")
    print("=" * 70)

    df_test = pd.read_parquet(TEST_PATH)
    with open(FEAT_PATH, "r") as f:
        feature_cols = json.load(f)
    imputer = joblib.load(IMPUTER_PATH)

    # Use best model (XGBoost if present, else Random Forest)
    xgb_lat_path = os.path.join(MODEL_DIR, "xgboost_lat.json")
    xgb_lon_path = os.path.join(MODEL_DIR, "xgboost_lon.json")
    if os.path.exists(xgb_lat_path) and os.path.exists(xgb_lon_path):
        import xgboost as xgb
        model_lat = xgb.XGBRegressor()
        model_lon = xgb.XGBRegressor()
        model_lat.load_model(xgb_lat_path)
        model_lon.load_model(xgb_lon_path)
        model_name = "XGBoost"
    else:
        model_lat = joblib.load(os.path.join(MODEL_DIR, "random_forest_lat.joblib"))
        model_lon = joblib.load(os.path.join(MODEL_DIR, "random_forest_lon.joblib"))
        model_name = "Random Forest"

    X_test = imputer.transform(df_test[feature_cols])
    pred_dlat = model_lat.predict(X_test)
    pred_dlon = model_lon.predict(X_test)

    pred_lat = df_test["lat"] + pred_dlat
    pred_lon = df_test["lon"] + pred_dlon
    pred_lon = ((pred_lon + 180.0) % 360.0) - 180.0

    df_test["geo_error_km"] = compute_haversine_km(df_test["target_lat"], df_test["target_lon"], pred_lat, pred_lon)

    print(f"Model: {model_name}")
    print(f"Overall Test Geographic Error: Mean = {df_test['geo_error_km'].mean():.2f} km, Median = {df_test['geo_error_km'].median():.2f} km")

    analysis_records = []

    # 1. Error by Iceberg
    print("\n--- 1. Error by Test Iceberg ---")
    ib_err = df_test.groupby("iceberg_id")["geo_error_km"].agg(["count", "mean", "median", "max"]).reset_index()
    print(ib_err.to_string(index=False))
    for _, r in ib_err.iterrows():
        analysis_records.append({
            "category": "Iceberg",
            "group": r["iceberg_id"],
            "count": int(r["count"]),
            "mean_error_km": round(r["mean"], 2),
            "median_error_km": round(r["median"], 2),
            "max_error_km": round(r["max"], 2)
        })

    # 2. Error by Speed Regime
    print("\n--- 2. Error by Drift Speed Regime ---")
    speed = df_test["previous_speed_kmday"].fillna(0.0)
    df_test["speed_regime"] = pd.cut(speed, bins=[-np.inf, 2.0, 10.0, np.inf], labels=["Stationary/Slow (<2 km/d)", "Moderate (2-10 km/d)", "Fast (>10 km/d)"])
    sp_err = df_test.groupby("speed_regime", observed=False)["geo_error_km"].agg(["count", "mean", "median", "max"]).reset_index()
    print(sp_err.to_string(index=False))
    for _, r in sp_err.iterrows():
        analysis_records.append({
            "category": "Speed Regime",
            "group": str(r["speed_regime"]),
            "count": int(r["count"]),
            "mean_error_km": round(r["mean"], 2),
            "median_error_km": round(r["median"], 2),
            "max_error_km": round(r["max"], 2)
        })

    # 3. Error by Sea Ice Regime (Open Water vs Pack Ice)
    print("\n--- 3. Error by Sea Ice Concentration Regime ---")
    sic = df_test["seaice_conc_pct"].fillna(0.0)
    df_test["seaice_regime"] = pd.cut(sic, bins=[-np.inf, 15.0, 80.0, np.inf], labels=["Open Water (<15%)", "Marginal Ice (15-80%)", "Dense Pack Ice (>80%)"])
    sic_err = df_test.groupby("seaice_regime", observed=False)["geo_error_km"].agg(["count", "mean", "median", "max"]).reset_index()
    print(sic_err.to_string(index=False))
    for _, r in sic_err.iterrows():
        analysis_records.append({
            "category": "Sea Ice Regime",
            "group": str(r["seaice_regime"]),
            "count": int(r["count"]),
            "mean_error_km": round(r["mean"], 2),
            "median_error_km": round(r["median"], 2),
            "max_error_km": round(r["max"], 2)
        })

    # 4. Error by Ocean Depth / Bathymetry (Shelf vs Deep)
    print("\n--- 4. Error by Ocean Depth Regime ---")
    depth = df_test["ocean_depth_m"].fillna(-3000.0)
    df_test["depth_regime"] = pd.cut(depth, bins=[-np.inf, -2000.0, -500.0, np.inf], labels=["Deep Abyssal (<-2000m)", "Continental Slope (-2000m to -500m)", "Continental Shelf (>-500m)"])
    dep_err = df_test.groupby("depth_regime", observed=False)["geo_error_km"].agg(["count", "mean", "median", "max"]).reset_index()
    print(dep_err.to_string(index=False))
    for _, r in dep_err.iterrows():
        analysis_records.append({
            "category": "Bathymetry Regime",
            "group": str(r["depth_regime"]),
            "count": int(r["count"]),
            "mean_error_km": round(r["mean"], 2),
            "median_error_km": round(r["median"], 2),
            "max_error_km": round(r["max"], 2)
        })

    # 5. Top 5 Worst Prediction Errors
    print("\n--- 5. Top 5 Largest Outlier Errors ---")
    top_outliers = df_test.sort_values("geo_error_km", ascending=False).head(5)
    print(top_outliers[["iceberg_id", "date", "lat", "lon", "previous_speed_kmday", "future_dt_days", "geo_error_km"]].to_string(index=False))

    # Save CSV report
    out_csv = os.path.join(REPORT_DIR, "error_analysis.csv")
    pd.DataFrame(analysis_records).to_csv(out_csv, index=False)
    print(f"\nError analysis table saved to: {out_csv}")

    # Plot regime comparisons
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    
    # Subplot A: Speed regime
    axes[0].bar(sp_err["speed_regime"].astype(str), sp_err["mean"].fillna(0), color="#2b5c8f", edgecolor="black", alpha=0.85)
    axes[0].set_title(f"{model_name}: Mean Error by Drift Speed Regime")
    axes[0].set_ylabel("Mean Geographic Error (km)")
    axes[0].grid(axis="y", linestyle="--", alpha=0.5)

    # Subplot B: Sea Ice regime
    axes[1].bar(sic_err["seaice_regime"].astype(str), sic_err["mean"].fillna(0), color="#3caea3", edgecolor="black", alpha=0.85)
    axes[1].set_title(f"{model_name}: Mean Error by Sea Ice Concentration")
    axes[1].set_ylabel("Mean Geographic Error (km)")
    axes[1].grid(axis="y", linestyle="--", alpha=0.5)

    plt.tight_layout()
    plot_path = os.path.join(REPORT_DIR, "error_by_regime.png")
    plt.savefig(plot_path, dpi=200)
    plt.close()
    print(f"Error regime plot saved to: {plot_path}")


if __name__ == "__main__":
    run_error_analysis()
