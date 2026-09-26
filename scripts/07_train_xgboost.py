"""
07_train_xgboost.py
Part 7: Train XGBoost Regressor models with early stopping on validation set.
Produces:
  - models/xgboost_lat.json
  - models/xgboost_lon.json
  - reports/xgboost_feature_importance.csv
"""

import os
import json
import joblib
import pandas as pd
import numpy as np

TRAIN_PATH   = os.path.join("dataSet", "train.parquet")
VAL_PATH     = os.path.join("dataSet", "validation.parquet")
MODEL_DIR    = "models"
REPORT_DIR   = "reports"
FEAT_PATH    = os.path.join(MODEL_DIR, "rf_features.json")
IMPUTER_PATH = os.path.join(MODEL_DIR, "rf_imputer.joblib")


def train_xgboost():
    print("=" * 70)
    print("TRAINING XGBOOST REGRESSOR MODELS")
    print("=" * 70)

    try:
        import xgboost as xgb
        print(f"XGBoost version {xgb.__version__} is installed.")
    except ImportError:
        print("xgboost not installed — install with pip install xgboost")
        return

    if not os.path.exists(FEAT_PATH) or not os.path.exists(IMPUTER_PATH):
        raise FileNotFoundError("Prerequisite imputer/features from Step 06 not found. Please run 06_train_random_forest.py first.")

    with open(FEAT_PATH, "r") as f:
        feature_cols = json.load(f)

    imputer = joblib.load(IMPUTER_PATH)

    df_train = pd.read_parquet(TRAIN_PATH)
    df_val   = pd.read_parquet(VAL_PATH)

    X_train = imputer.transform(df_train[feature_cols])
    X_val   = imputer.transform(df_val[feature_cols])

    y_train_lat = df_train["target_delta_lat"].values
    y_train_lon = df_train["target_delta_lon"].values
    y_val_lat   = df_val["target_delta_lat"].values
    y_val_lon   = df_val["target_delta_lon"].values

    # Model A: Latitude
    print("\nTraining XGBoost Model A: target_delta_lat...")
    xgb_lat = xgb.XGBRegressor(
        n_estimators=400,
        learning_rate=0.03,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=25,
        eval_metric="mae",
        random_state=42,
        n_jobs=-1
    )
    xgb_lat.fit(
        X_train, y_train_lat,
        eval_set=[(X_val, y_val_lat)],
        verbose=False
    )
    val_pred_lat = xgb_lat.predict(X_val)
    mae_lat = np.mean(np.abs(val_pred_lat - y_val_lat))
    print(f"  Best iteration: {xgb_lat.best_iteration} | Validation MAE (delta_lat): {mae_lat:.6f} deg")

    # Model B: Longitude
    print("\nTraining XGBoost Model B: target_delta_lon...")
    xgb_lon = xgb.XGBRegressor(
        n_estimators=400,
        learning_rate=0.03,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=25,
        eval_metric="mae",
        random_state=42,
        n_jobs=-1
    )
    xgb_lon.fit(
        X_train, y_train_lon,
        eval_set=[(X_val, y_val_lon)],
        verbose=False
    )
    val_pred_lon = xgb_lon.predict(X_val)
    mae_lon = np.mean(np.abs(val_pred_lon - y_val_lon))
    print(f"  Best iteration: {xgb_lon.best_iteration} | Validation MAE (delta_lon): {mae_lon:.6f} deg")

    # Save models
    os.makedirs(MODEL_DIR, exist_ok=True)
    lat_model_path = os.path.join(MODEL_DIR, "xgboost_lat.json")
    lon_model_path = os.path.join(MODEL_DIR, "xgboost_lon.json")

    xgb_lat.save_model(lat_model_path)
    xgb_lon.save_model(lon_model_path)
    print(f"\nModels saved:")
    print(f"  {lat_model_path}")
    print(f"  {lon_model_path}")

    # Feature importances
    imp_lat = xgb_lat.feature_importances_
    imp_lon = xgb_lon.feature_importances_
    mean_imp = (imp_lat + imp_lon) / 2.0

    df_imp = pd.DataFrame({
        "feature": feature_cols,
        "importance_lat": np.round(imp_lat, 6),
        "importance_lon": np.round(imp_lon, 6),
        "mean_importance": np.round(mean_imp, 6)
    }).sort_values("mean_importance", ascending=False).reset_index(drop=True)

    csv_imp_path = os.path.join(REPORT_DIR, "xgboost_feature_importance.csv")
    df_imp.to_csv(csv_imp_path, index=False)
    print(f"XGBoost feature importance saved to: {csv_imp_path}")


if __name__ == "__main__":
    train_xgboost()
