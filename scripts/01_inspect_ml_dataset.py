"""
01_inspect_ml_dataset.py
Part 1: Inspect the environmentally matched iceberg dataset without modifying it.
Produces: reports/dataset_inspection.txt
"""

import os
import pandas as pd
import numpy as np

DATASET_PATH = os.path.join("dataSet", "iceberg_env_matched_2024.parquet")
REPORT_PATH  = os.path.join("reports", "dataset_inspection.txt")


def inspect_dataset():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    df = pd.read_parquet(DATASET_PATH)
    lines = []

    def log(msg=""):
        print(msg)
        lines.append(str(msg))

    log("=" * 80)
    log("PART 1: ICEBERG ENVIRONMENTALLY MATCHED DATASET INSPECTION REPORT")
    log("=" * 80)
    log(f"Source file: {DATASET_PATH}")
    log(f"Number of rows: {len(df):,}")
    log(f"Number of columns: {len(df.columns)}")
    log(f"Unique icebergs: {df['iceberg_id'].nunique()}")
    log(f"Date range: {df['date'].min()} to {df['date'].max()}")
    log()

    log("--- Column Names & Data Types ---")
    for col, dtype in df.dtypes.items():
        n_missing = df[col].isna().sum()
        pct_missing = (n_missing / len(df)) * 100
        log(f"  {col:<26} | dtype: {str(dtype):<10} | missing: {n_missing:>5} ({pct_missing:5.1f}%)")
    log()

    log("--- Basic Descriptive Statistics ---")
    log(df.describe().to_string())
    log()

    # Check sorting
    is_sorted = df["iceberg_id"].is_monotonic_increasing and df.groupby("iceberg_id")["date"].apply(lambda s: s.is_monotonic_increasing).all()
    log(f"Is dataset sorted strictly by (iceberg_id, date)? {is_sorted}")
    log()

    # Per-iceberg diagnostics
    log("--- Per-Iceberg Trajectory Summary ---")
    log(f"{'Iceberg ID':<12} | {'Rows':<6} | {'Start Date':<10} | {'End Date':<10} | {'Day Span':<8} | {'Gaps (>1d)':<10} | {'Duplicates':<10}")
    log("-" * 80)

    total_gaps = 0
    total_dupes = 0
    iceberg_summaries = []

    for ib_id, grp in df.groupby("iceberg_id", sort=True):
        grp_sorted = grp.sort_values("date")
        n_rows = len(grp_sorted)
        start_d = grp_sorted["date"].min().strftime("%Y-%m-%d")
        end_d   = grp_sorted["date"].max().strftime("%Y-%m-%d")
        day_span = (grp_sorted["date"].max() - grp_sorted["date"].min()).days + 1

        # Check duplicate dates
        n_dupes = grp_sorted["date"].duplicated().sum()
        total_dupes += n_dupes

        # Check temporal gaps: difference in consecutive dates > 1 day
        dt = (grp_sorted["date"] - grp_sorted["date"].shift(1)).dt.total_seconds() / 86400.0
        n_gaps = (dt > 1.0).sum()
        total_gaps += n_gaps

        log(f"{ib_id:<12} | {n_rows:<6} | {start_d:<10} | {end_d:<10} | {day_span:<8} | {n_gaps:<10} | {n_dupes:<10}")
        iceberg_summaries.append({
            "iceberg_id": ib_id,
            "rows": n_rows,
            "start": start_d,
            "end": end_d,
            "gaps": n_gaps,
            "duplicates": n_dupes
        })

    log("-" * 80)
    log(f"Total Trajectory Gaps (>1 day): {total_gaps}")
    log(f"Total Duplicate Dates across all icebergs: {total_dupes}")
    log()

    # Leakage Identification
    log("--- Leakage Analysis ---")
    log("1. 'delta_lat', 'delta_lon', 'speed_kmday', 'direction':")
    log("   These columns in the raw dataset represent the movement from observation (t-1) to (t).")
    log("   They must NOT be treated as future targets, but rather as CURRENT/PAST kinematics at time t.")
    log("2. Future Targets:")
    log("   The true prediction targets must be explicitly constructed by shifting forward within each iceberg:")
    log("   target_delta_lat = lat(t+1) - lat(t)")
    log("   target_delta_lon = lon(t+1) - lon(t)")
    log("3. Environmental variables at time t:")
    log("   'glorys_uo_ms', 'glorys_vo_ms', 'seaice_conc_pct', 'ocean_depth_m' represent conditions at time t.")
    log("   Future environmental conditions (t+1) must NOT be leaked into features at time t.")
    log("4. Dropped / Identifier columns:")
    log("   'iceberg_id', 'date', 'source', 'confidence', 'length', 'width' (high missingness) should be kept for")
    log("   metadata/splitting/filtering, but not leaked as invalid predictors.")
    log("=" * 80)

    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nReport written to: {REPORT_PATH}")


if __name__ == "__main__":
    inspect_dataset()
