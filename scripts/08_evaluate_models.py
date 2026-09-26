"""
08_evaluate_models.py
Part 8: Comprehensive evaluation on untouched test set.
Produces: reports/final_model_comparison.csv
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

TRAIN_PATH   = os.path.join("dataSet", "train.parquet")
TEST_PATH    = os.path.join("dataSet", "test.parquet")
MODEL_DIR    = "models"
REPORT_PATH  = os.path.join("reports", "final_model_comparison.csv")
FEAT_PATH    = os.path.join(MODEL_DIR, "rf_features.json")
IMPUTER_PATH = os.path.join(MODEL_DIR, "rf_imputer.joblib")


def compute_haversine_km(lat1, lon1, lat2, lon2):
    """Vectorized Great-Circle distance in kilometers."""
    R = 6371.0
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return R * c


def evaluate_preds(df_test, pred_dlat, pred_dlon, model_name):
    actual_dlat = df_test["target_delta_lat"].values
    actual_dlon = df_test["target_delta_lon"].values
    curr_lat    = df_test["lat"].values
    curr_lon    = df_test["lon"].values
    actual_lat  = df_test["target_lat"].values
    actual_lon  = df_test["target_lon"].values

    pred_lat = curr_lat + pred_dlat
    pred_lon = curr_lon + pred_dlon
    pred_lon = ((pred_lon + 180.0) % 360.0) - 180.0

    mae_lat = float(np.mean(np.abs(pred_dlat - actual_dlat)))
    mae_lon = float(np.mean(np.abs(pred_dlon - actual_dlon)))
    rmse_lat = float(np.sqrt(np.mean((pred_dlat - actual_dlat)**2)))
    rmse_lon = float(np.sqrt(np.mean((pred_dlon - actual_dlon)**2)))

    geo_err = compute_haversine_km(actual_lat, actual_lon, pred_lat, pred_lon)

    return {
        "model": model_name,
        "n_test_samples": len(df_test),
        "test_icebergs": df_test["iceberg_id"].nunique(),
        "mae_delta_lat": round(mae_lat, 6),
        "mae_delta_lon": round(mae_lon, 6),
        "rmse_delta_lat": round(rmse_lat, 6),
        "rmse_delta_lon": round(rmse_lon, 6),
        "mean_geo_err_km": round(float(np.mean(geo_err)), 3),
        "median_geo_err_km": round(float(np.median(geo_err)), 3),
        "p75_geo_err_km": round(float(np.percentile(geo_err, 75)), 3),
        "p90_geo_err_km": round(float(np.percentile(geo_err, 90)), 3),
        "p95_geo_err_km": round(float(np.percentile(geo_err, 95)), 3),
        "max_geo_err_km": round(float(np.max(geo_err)), 3)
    }


def evaluate_all():
    print("=" * 70)
    print("FINAL MODEL EVALUATION ON UNTOUCHED TEST SET")
    print("=" * 70)

    df_test = pd.read_parquet(TEST_PATH)
    print(f"Test cohort: {len(df_test):,} observations across {df_test['iceberg_id'].nunique()} distinct icebergs")

    with open(FEAT_PATH, "r") as f:
        feature_cols = json.load(f)
    imputer = joblib.load(IMPUTER_PATH)

    X_test = imputer.transform(df_test[feature_cols])

    comparison = []

    # 1. Zero-Movement Persistence
    pred_dlat_zero = np.zeros(len(df_test))
    pred_dlon_zero = np.zeros(len(df_test))
    comparison.append(evaluate_preds(df_test, pred_dlat_zero, pred_dlon_zero, "Zero-Movement Persistence"))

    # 2. Kinematic Persistence
    pred_dlat_kin = df_test["previous_delta_lat"].fillna(0.0).values
    pred_dlon_kin = df_test["previous_delta_lon"].fillna(0.0).values
    comparison.append(evaluate_preds(df_test, pred_dlat_kin, pred_dlon_kin, "Kinematic Persistence"))

    # 3. Linear Regression
    df_train = pd.read_parquet(TRAIN_PATH)
    X_train = imputer.transform(df_train[feature_cols])
    y_train_lat = df_train["target_delta_lat"].values
    y_train_lon = df_train["target_delta_lon"].values

    lr_lat = LinearRegression().fit(X_train, y_train_lat)
    lr_lon = LinearRegression().fit(X_train, y_train_lon)
    pred_dlat_lr = lr_lat.predict(X_test)
    pred_dlon_lr = lr_lon.predict(X_test)
    comparison.append(evaluate_preds(df_test, pred_dlat_lr, pred_dlon_lr, "Linear Regression"))

    # 4. Random Forest
    rf_lat = joblib.load(os.path.join(MODEL_DIR, "random_forest_lat.joblib"))
    rf_lon = joblib.load(os.path.join(MODEL_DIR, "random_forest_lon.joblib"))
    pred_dlat_rf = rf_lat.predict(X_test)
    pred_dlon_rf = rf_lon.predict(X_test)
    comparison.append(evaluate_preds(df_test, pred_dlat_rf, pred_dlon_rf, "Random Forest"))

    # 5. XGBoost (if available)
    xgb_lat_path = os.path.join(MODEL_DIR, "xgboost_lat.json")
    xgb_lon_path = os.path.join(MODEL_DIR, "xgboost_lon.json")
    if os.path.exists(xgb_lat_path) and os.path.exists(xgb_lon_path):
        import xgboost as xgb
        xgb_lat = xgb.XGBRegressor()
        xgb_lon = xgb.XGBRegressor()
        xgb_lat.load_model(xgb_lat_path)
        xgb_lon.load_model(xgb_lon_path)
        pred_dlat_xgb = xgb_lat.predict(X_test)
        pred_dlon_xgb = xgb_lon.predict(X_test)
        comparison.append(evaluate_preds(df_test, pred_dlat_xgb, pred_dlon_xgb, "XGBoost"))

    df_comp = pd.DataFrame(comparison)
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    df_comp.to_csv(REPORT_PATH, index=False)
    print(f"\nFinal model comparison saved to: {REPORT_PATH}")
    print("\n" + df_comp[["model", "mae_delta_lat", "mae_delta_lon", "mean_geo_err_km", "median_geo_err_km", "p90_geo_err_km", "max_geo_err_km"]].to_string(index=False))


if __name__ == "__main__":
    evaluate_all()
