"""
05_baseline_models.py
Part 5: Baseline models (Zero-movement Persistence, Kinematic Persistence, Current-driven).
Produces: reports/baseline_results.csv
"""

import os
import pandas as pd
import numpy as np

VAL_PATH    = os.path.join("dataSet", "validation.parquet")
TEST_PATH   = os.path.join("dataSet", "test.parquet")
REPORT_PATH = os.path.join("reports", "baseline_results.csv")


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


def evaluate_predictions(df, pred_dlat, pred_dlon, model_name, split_name):
    actual_dlat = df["target_delta_lat"].values
    actual_dlon = df["target_delta_lon"].values
    curr_lat    = df["lat"].values
    curr_lon    = df["lon"].values
    actual_lat  = df["target_lat"].values
    actual_lon  = df["target_lon"].values

    pred_lat = curr_lat + pred_dlat
    pred_lon = curr_lon + pred_dlon

    # Handle wrap-around for longitude if needed
    pred_lon = ((pred_lon + 180.0) % 360.0) - 180.0

    mae_lat = float(np.nanmean(np.abs(pred_dlat - actual_dlat)))
    mae_lon = float(np.nanmean(np.abs(pred_dlon - actual_dlon)))
    rmse_lat = float(np.sqrt(np.nanmean((pred_dlat - actual_dlat)**2)))
    rmse_lon = float(np.sqrt(np.nanmean((pred_dlon - actual_dlon)**2)))

    geo_err = compute_haversine_km(actual_lat, actual_lon, pred_lat, pred_lon)

    mean_km   = float(np.nanmean(geo_err))
    median_km = float(np.nanmedian(geo_err))
    p75_km    = float(np.nanpercentile(geo_err, 75))
    p90_km    = float(np.nanpercentile(geo_err, 90))
    p95_km    = float(np.nanpercentile(geo_err, 95))
    max_km    = float(np.nanmax(geo_err))

    return {
        "model": model_name,
        "split": split_name,
        "n_samples": len(df),
        "mae_delta_lat": round(mae_lat, 6),
        "mae_delta_lon": round(mae_lon, 6),
        "rmse_delta_lat": round(rmse_lat, 6),
        "rmse_delta_lon": round(rmse_lon, 6),
        "mean_geo_err_km": round(mean_km, 3),
        "median_geo_err_km": round(median_km, 3),
        "p75_geo_err_km": round(p75_km, 3),
        "p90_geo_err_km": round(p90_km, 3),
        "p95_geo_err_km": round(p95_km, 3),
        "max_geo_err_km": round(max_km, 3)
    }


def run_baselines():
    df_val  = pd.read_parquet(VAL_PATH)
    df_test = pd.read_parquet(TEST_PATH)

    results = []

    for name, df in [("Validation", df_val), ("Test", df_test)]:
        print(f"\nEvaluating Baselines on {name} ({len(df)} samples)...")

        # 1. Zero-Movement Persistence (predict delta_lat=0, delta_lon=0)
        pred_dlat_zero = np.zeros(len(df))
        pred_dlon_zero = np.zeros(len(df))
        r0 = evaluate_predictions(df, pred_dlat_zero, pred_dlon_zero, "Zero-Movement Persistence", name)
        results.append(r0)
        print(f"  Zero-Movement: Mean Err = {r0['mean_geo_err_km']} km, Median = {r0['median_geo_err_km']} km")

        # 2. Kinematic Persistence (predict delta_lat = previous_delta_lat)
        pred_dlat_kin = df["previous_delta_lat"].fillna(0.0).values
        pred_dlon_kin = df["previous_delta_lon"].fillna(0.0).values
        r1 = evaluate_predictions(df, pred_dlat_kin, pred_dlon_kin, "Kinematic Persistence", name)
        results.append(r1)
        print(f"  Kinematic Persistence: Mean Err = {r1['mean_geo_err_km']} km, Median = {r1['median_geo_err_km']} km")

        # 3. Simple Ocean-Current Driven Drift
        # Conversion: dt_sec = dt_days * 86400
        # dy = vo * dt_sec (meters); dx = uo * dt_sec (meters)
        # dlat = dy / 111,320 meters per degree
        # dlon = dx / (111,320 * cos(lat))
        dt_sec = df["future_dt_days"].values * 86400.0
        uo = df["glorys_uo_ms"].fillna(0.0).values
        vo = df["glorys_vo_ms"].fillna(0.0).values
        lat_rad = np.radians(df["lat"].values)

        dlat_curr = (vo * dt_sec) / 111320.0
        dlon_curr = (uo * dt_sec) / (111320.0 * np.maximum(np.cos(lat_rad), 0.01))

        r2 = evaluate_predictions(df, dlat_curr, dlon_curr, "Physical Ocean-Current Drift", name)
        results.append(r2)
        print(f"  Ocean-Current Drift: Mean Err = {r2['mean_geo_err_km']} km, Median = {r2['median_geo_err_km']} km")

    df_results = pd.DataFrame(results)
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    df_results.to_csv(REPORT_PATH, index=False)
    print(f"\nBaseline results saved to: {REPORT_PATH}")
    print("\nSummary Table:")
    print(df_results[["model", "split", "mae_delta_lat", "mae_delta_lon", "mean_geo_err_km", "median_geo_err_km", "p90_geo_err_km"]].to_string(index=False))


if __name__ == "__main__":
    run_baselines()
