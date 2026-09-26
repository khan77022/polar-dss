"""
03_clean_ml_dataset.py
Part 3: Analyze missingness, remove unviable target records, and prepare clean dataset.
Produces:
  - dataSet/ml_dataset_final.parquet
  - reports/missing_value_report.txt
"""

import os
import pandas as pd
import numpy as np

IN_PATH     = os.path.join("dataSet", "ml_dataset_2024.parquet")
OUT_PARQUET = os.path.join("dataSet", "ml_dataset_final.parquet")
REPORT_PATH = os.path.join("reports", "missing_value_report.txt")


def clean_dataset():
    if not os.path.exists(IN_PATH):
        raise FileNotFoundError(f"Input dataset not found at {IN_PATH}")

    df = pd.read_parquet(IN_PATH)
    n_initial = len(df)
    report_lines = []

    def log(msg=""):
        print(msg)
        report_lines.append(str(msg))

    log("=" * 80)
    log("PART 3: ML DATASET CLEANING & MISSING VALUE ANALYSIS")
    log("=" * 80)
    log(f"Input file: {IN_PATH}")
    log(f"Initial row count: {n_initial:,}")
    log(f"Unique icebergs: {df['iceberg_id'].nunique()}")
    log()

    log("--- Initial Missing Value Profile ---")
    for col in df.columns:
        n_miss = df[col].isna().sum()
        pct = (n_miss / n_initial) * 100
        log(f"  {col:<26} | missing: {n_miss:>5} ({pct:5.1f}%)")
    log()

    # Step 1: Filter target anomalies
    # The primary objective is predicting next-step movement.
    # An observation is only usable for next-step regression if:
    # 1. target_delta_lat and target_delta_lon are present and non-NaN
    # 2. future_dt_days is within reasonable bounds (e.g. <= 7 days; larger gaps represent untracked multi-week leaps)
    log("--- Filtering Target & Step-Duration Anomalies ---")
    valid_target = df["target_delta_lat"].notna() & df["target_delta_lon"].notna()
    n_invalid_target = (~valid_target).sum()
    log(f"  Rows with invalid/missing targets: {n_invalid_target}")

    # Future dt bounds: must be > 0 and <= 7 days
    valid_dt = (df["future_dt_days"] > 0) & (df["future_dt_days"] <= 7.0)
    n_invalid_dt = (~valid_dt).sum()
    log(f"  Rows with future_dt_days <= 0 or > 7 days (long gaps): {n_invalid_dt}")

    # Maximum speed check for target step: speed > 100 km/day is physically impossible
    # Haversine distance for target step:
    R = 6371.0
    lat1 = np.radians(df["lat"].values)
    lon1 = np.radians(df["lon"].values)
    lat2 = np.radians(df["target_lat"].values)
    lon2 = np.radians(df["target_lon"].values)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
    dist_km = R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    target_speed = np.where(df["future_dt_days"] > 0, dist_km / df["future_dt_days"], 0)
    impossible_speed = target_speed > 100.0
    n_impossible_speed = impossible_speed.sum()
    log(f"  Rows with target step speed > 100 km/day: {n_impossible_speed}")

    keep_mask = valid_target & valid_dt & (~impossible_speed)
    df_clean = df[keep_mask].copy().reset_index(drop=True)
    n_kept = len(df_clean)
    log(f"  Retained rows after target sanity filtering: {n_kept:,} ({n_kept/n_initial*100:.1f}%)")
    log(f"  Removed {n_initial - n_kept:,} unviable rows.")
    log()

    # Step 2: Analysis of environmental missingness
    log("--- Environmental Missingness Strategy ---")
    log("1. GLORYS Ocean Currents (uo, vo, so, bottomT):")
    log(f"   Missing in {df_clean['glorys_uo_ms'].isna().sum()} rows ({df_clean['glorys_uo_ms'].isna().mean()*100:.1f}%).")
    log("   Strategy: Retain rows; impute using training-set median during model pipeline.")
    log()
    log("2. Sea Ice Concentration (seaice_conc_pct):")
    log(f"   Missing in {df_clean['seaice_conc_pct'].isna().sum()} rows ({df_clean['seaice_conc_pct'].isna().mean()*100:.1f}%).")
    log("   Note: In OSI-SAF, open ocean outside sea ice zones is screened as open water (0% concentration).")
    log("   Strategy: Impute open water 0.0% where missing, or impute with training median.")
    log()
    log("3. Bathymetry (ocean_depth_m):")
    log(f"   Missing in {df_clean['ocean_depth_m'].isna().sum()} rows ({df_clean['ocean_depth_m'].isna().mean()*100:.1f}%).")
    log("   Points north of 60°S fall outside the Antarctic GEBCO tile.")
    log("   Strategy: Impute with training median depth.")
    log()
    log("4. Wind (wind_u10_ms, wind_v10_ms):")
    log(f"   Missing in {df_clean['wind_u10_ms'].isna().sum()} rows ({df_clean['wind_u10_ms'].isna().mean()*100:.1f}%).")
    log("   Only 1 day of wind is present in the archive. Preserved for feature ablation,")
    log("   imputed with 0 / training median.")
    log()
    log("5. Physical Size (length, width):")
    log(f"   Missing in {df_clean['length'].isna().sum()} rows ({df_clean['length'].isna().mean()*100:.1f}%).")
    log("   Not used as mandatory core feature to avoid corrupting model with 80% synthetic size values.")
    log("=" * 80)

    # Save final clean parquet
    print(f"Saving final clean dataset to: {OUT_PARQUET}...")
    df_clean.to_parquet(OUT_PARQUET, index=False)
    print(f"Done. Final rows: {len(df_clean):,}")

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))
    print(f"Report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    clean_dataset()
