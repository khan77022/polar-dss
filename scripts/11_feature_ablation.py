"""
11_feature_ablation.py
Part 11: Feature ablation experiments to test incremental value of environmental variables.
Produces: reports/feature_ablation_results.csv
"""

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer

TRAIN_PATH  = os.path.join("dataSet", "train.parquet")
TEST_PATH   = os.path.join("dataSet", "test.parquet")
REPORT_PATH = os.path.join("reports", "feature_ablation_results.csv")


def compute_haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return R * c


# Feature Subsets
BASE_TRAJ = [
    "lat", "lon", "latitude_rad", "longitude_rad",
    "month", "day_of_year", "sin_day_of_year", "cos_day_of_year", "future_dt_days",
    "previous_delta_lat", "previous_delta_lon", "previous_speed_kmday", "previous_direction",
    "previous_dt_days", "delta_lat_lag2", "delta_lon_lag2", "speed_lag2"
]
CURRENTS = ["glorys_uo_ms", "glorys_vo_ms", "glorys_current_speed_ms", "glorys_current_dir", "glorys_so", "glorys_bottomT"]
SEAICE   = ["seaice_conc_pct"]
WIND     = ["wind_u10_ms", "wind_v10_ms", "wind_speed_ms", "wind_dir"]
BATHY    = ["ocean_depth_m"]

EXPERIMENTS = [
    ("Exp A: Trajectory History Only", BASE_TRAJ),
    ("Exp B: Trajectory + Ocean Currents", BASE_TRAJ + CURRENTS),
    ("Exp C: Trajectory + Currents + Sea Ice", BASE_TRAJ + CURRENTS + SEAICE),
    ("Exp D: Trajectory + Currents + Sea Ice + Wind", BASE_TRAJ + CURRENTS + SEAICE + WIND),
    ("Exp E: All Features (+ Bathymetry)", BASE_TRAJ + CURRENTS + SEAICE + WIND + BATHY),
]


def run_ablation():
    print("=" * 70)
    print("RUNNING FEATURE ABLATION EXPERIMENTS")
    print("=" * 70)

    df_train = pd.read_parquet(TRAIN_PATH)
    df_test  = pd.read_parquet(TEST_PATH)

    y_train_lat = df_train["target_delta_lat"].values
    y_train_lon = df_train["target_delta_lon"].values
    actual_lat  = df_test["target_lat"].values
    actual_lon  = df_test["target_lon"].values

    results = []

    for name, feats in EXPERIMENTS:
        print(f"\nRunning {name} ({len(feats)} features)...")

        # Impute missing values with training medians
        imputer = SimpleImputer(strategy="median")
        X_train = imputer.fit_transform(df_train[feats])
        X_test  = imputer.transform(df_test[feats])

        # Train Random Forest
        rf_lat = RandomForestRegressor(n_estimators=150, max_depth=10, min_samples_leaf=3, random_state=42, n_jobs=-1)
        rf_lon = RandomForestRegressor(n_estimators=150, max_depth=10, min_samples_leaf=3, random_state=42, n_jobs=-1)
        rf_lat.fit(X_train, y_train_lat)
        rf_lon.fit(X_train, y_train_lon)

        pred_dlat = rf_lat.predict(X_test)
        pred_dlon = rf_lon.predict(X_test)

        pred_lat = df_test["lat"].values + pred_dlat
        pred_lon = df_test["lon"].values + pred_dlon
        pred_lon = ((pred_lon + 180.0) % 360.0) - 180.0

        geo_err = compute_haversine_km(actual_lat, actual_lon, pred_lat, pred_lon)

        mean_km   = float(np.mean(geo_err))
        median_km = float(np.median(geo_err))
        p90_km    = float(np.percentile(geo_err, 90))
        max_km    = float(np.max(geo_err))

        mae_lat = float(np.mean(np.abs(pred_dlat - df_test["target_delta_lat"].values)))
        mae_lon = float(np.mean(np.abs(pred_dlon - df_test["target_delta_lon"].values)))

        print(f"  Test Geo Error -> Mean: {mean_km:.3f} km | Median: {median_km:.3f} km | P90: {p90_km:.3f} km")

        results.append({
            "experiment": name,
            "n_features": len(feats),
            "mae_delta_lat": round(mae_lat, 6),
            "mae_delta_lon": round(mae_lon, 6),
            "mean_geo_err_km": round(mean_km, 3),
            "median_geo_err_km": round(median_km, 3),
            "p90_geo_err_km": round(p90_km, 3),
            "max_geo_err_km": round(max_km, 3)
        })

    df_res = pd.DataFrame(results)
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    df_res.to_csv(REPORT_PATH, index=False)
    print(f"\nAblation results saved to: {REPORT_PATH}")
    print("\n" + df_res.to_string(index=False))


if __name__ == "__main__":
    run_ablation()
