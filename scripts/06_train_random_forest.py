"""
06_train_random_forest.py
Part 6: Train Random Forest Regressors for target_delta_lat and target_delta_lon.
Produces:
  - models/random_forest_lat.joblib
  - models/random_forest_lon.joblib
  - models/rf_imputer.joblib
  - models/rf_features.json
  - reports/random_forest_feature_importance.csv
  - reports/random_forest_feature_importance.png
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer

TRAIN_PATH   = os.path.join("dataSet", "train.parquet")
VAL_PATH     = os.path.join("dataSet", "validation.parquet")
MODEL_DIR    = "models"
REPORT_DIR   = "reports"

# Complete feature set strictly available at time t
FEATURE_COLS = [
    # Spatial
    "lat", "lon", "latitude_rad", "longitude_rad",
    # Temporal & step duration
    "month", "day_of_year", "sin_day_of_year", "cos_day_of_year", "future_dt_days",
    # Kinematic lags
    "previous_delta_lat", "previous_delta_lon", "previous_speed_kmday", "previous_direction",
    "previous_dt_days", "delta_lat_lag2", "delta_lon_lag2", "speed_lag2",
    # Ocean physics
    "glorys_uo_ms", "glorys_vo_ms", "glorys_current_speed_ms", "glorys_current_dir",
    "glorys_so", "glorys_bottomT",
    # Cryosphere, Atmosphere & Bathymetry
    "seaice_conc_pct", "ocean_depth_m",
    "wind_u10_ms", "wind_v10_ms", "wind_speed_ms", "wind_dir"
]


def train_rf():
    print("=" * 70)
    print("TRAINING RANDOM FOREST REGRESSOR MODELS")
    print("=" * 70)

    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(REPORT_DIR, exist_ok=True)

    df_train = pd.read_parquet(TRAIN_PATH)
    df_val   = pd.read_parquet(VAL_PATH)

    print(f"Train samples: {len(df_train):,} across {df_train['iceberg_id'].nunique()} icebergs")
    print(f"Val samples  : {len(df_val):,} across {df_val['iceberg_id'].nunique()} icebergs")

    # 1. Fit Imputer STRICTLY on Training Set
    print("\nFitting imputer on training features only (median strategy)...")
    imputer = SimpleImputer(strategy="median")
    X_train = imputer.fit_transform(df_train[FEATURE_COLS])
    X_val   = imputer.transform(df_val[FEATURE_COLS])

    y_train_lat = df_train["target_delta_lat"].values
    y_train_lon = df_train["target_delta_lon"].values
    y_val_lat   = df_val["target_delta_lat"].values
    y_val_lon   = df_val["target_delta_lon"].values

    # 2. Train Model A: Latitude displacement
    print("\nTraining Model A: target_delta_lat...")
    rf_lat = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1
    )
    rf_lat.fit(X_train, y_train_lat)
    val_pred_lat = rf_lat.predict(X_val)
    mae_lat = np.mean(np.abs(val_pred_lat - y_val_lat))
    print(f"  Validation MAE (delta_lat): {mae_lat:.6f} deg")

    # 3. Train Model B: Longitude displacement
    print("\nTraining Model B: target_delta_lon...")
    rf_lon = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1
    )
    rf_lon.fit(X_train, y_train_lon)
    val_pred_lon = rf_lon.predict(X_val)
    mae_lon = np.mean(np.abs(val_pred_lon - y_val_lon))
    print(f"  Validation MAE (delta_lon): {mae_lon:.6f} deg")

    # 4. Save Models & Artifacts
    lat_model_path = os.path.join(MODEL_DIR, "random_forest_lat.joblib")
    lon_model_path = os.path.join(MODEL_DIR, "random_forest_lon.joblib")
    imputer_path   = os.path.join(MODEL_DIR, "rf_imputer.joblib")
    feat_path      = os.path.join(MODEL_DIR, "rf_features.json")

    joblib.dump(rf_lat, lat_model_path)
    joblib.dump(rf_lon, lon_model_path)
    joblib.dump(imputer, imputer_path)
    with open(feat_path, "w") as f:
        json.dump(FEATURE_COLS, f, indent=2)

    print(f"\nModels saved:")
    print(f"  {lat_model_path}")
    print(f"  {lon_model_path}")
    print(f"  {imputer_path}")

    # 5. Extract Feature Importance
    importances_lat = rf_lat.feature_importances_
    importances_lon = rf_lon.feature_importances_
    mean_importance = (importances_lat + importances_lon) / 2.0

    df_imp = pd.DataFrame({
        "feature": FEATURE_COLS,
        "importance_lat": np.round(importances_lat, 6),
        "importance_lon": np.round(importances_lon, 6),
        "mean_importance": np.round(mean_importance, 6)
    }).sort_values("mean_importance", ascending=False).reset_index(drop=True)

    csv_imp_path = os.path.join(REPORT_DIR, "random_forest_feature_importance.csv")
    df_imp.to_csv(csv_imp_path, index=False)
    print(f"Feature importance table saved to: {csv_imp_path}")

    # 6. Plot Feature Importance
    png_imp_path = os.path.join(REPORT_DIR, "random_forest_feature_importance.png")
    plt.figure(figsize=(10, 8))
    top_df = df_imp.head(15).iloc[::-1]
    plt.barh(top_df["feature"], top_df["mean_importance"], color="#1f77b4", edgecolor="black", alpha=0.85)
    plt.xlabel("Mean Relative Feature Importance (Gini)")
    plt.title("Random Forest: Top 15 Most Important Features for Iceberg Drift")
    plt.grid(axis="x", linestyle="--", alpha=0.5)
    plt.tight_layout()
    plt.savefig(png_imp_path, dpi=200)
    plt.close()
    print(f"Feature importance plot saved to: {png_imp_path}")


if __name__ == "__main__":
    train_rf()
