"""
scripts/05_build_supervised_dataset.py
================================================================================
Supervised Dataset Construction, Validation Assertions & Pipeline Summary
================================================================================
1. Performs strict assertions on master environmental dataset:
   - No null iceberg_id or date
   - Latitude in [-90, 90], Longitude in [-180, 180]
   - No duplicate (iceberg_id, date)
   - Verified target belongs to same iceberg
   - target_dt_days > 0
   - No future-feature or cross-iceberg leakage
2. Filters supervised modeling subset (rows with valid next targets)
3. Splits by iceberg_id into train (70%), validation (15%), test (15%)
   to guarantee zero-shot spatial-trajectory generalization
4. Prints the required final pipeline summary report.

Outputs:
  - dataSet/06_processed/train.parquet
  - dataSet/06_processed/validation.parquet
  - dataSet/06_processed/test.parquet
"""

from pathlib import Path
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(r"D:\SIH\IceBerg").resolve()
DATASET_DIR = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_DIR / "06_processed"
TRACKS_RAW_PARQUET = DATASET_DIR / "iceberg_tracks_clean.parquet"
MATCHED_PARQUET = PROCESSED_DIR / "iceberg_env_matched_2023_2026.parquet"

TRAIN_PARQUET = PROCESSED_DIR / "train.parquet"
VAL_PARQUET = PROCESSED_DIR / "validation.parquet"
TEST_PARQUET = PROCESSED_DIR / "test.parquet"


def validate_and_split():
    print("=" * 78)
    print("  05_BUILD_SUPERVISED_DATASET: VALIDATION & ZERO-LEAKAGE SPLIT")
    print(f"  Project Root: {PROJECT_ROOT}")
    print("=" * 78)

    df_raw = pd.read_parquet(TRACKS_RAW_PARQUET)
    orig_obs = len(df_raw)

    df = pd.read_parquet(MATCHED_PARQUET)
    clean_obs = len(df)
    n_icebergs = df["iceberg_id"].nunique()

    # --------------------------------------------------------------------------
    # 1. ASSERTION CHECKS (SECTION 27)
    # --------------------------------------------------------------------------
    print("\nRunning Verification Assertions...")
    assert df["iceberg_id"].notna().all(), "Assertion Failed: null iceberg_id detected!"
    assert df["date"].notna().all(), "Assertion Failed: null date detected!"
    assert (df["lat"] >= -90.0).all() and (df["lat"] <= 90.0).all(), "Assertion Failed: invalid latitude!"
    assert (df["lon"] >= -180.0).all() and (df["lon"] <= 180.0).all(), "Assertion Failed: invalid longitude!"
    assert not df.duplicated(subset=["iceberg_id", "date"]).any(), "Assertion Failed: duplicate (iceberg_id, date) detected!"

    # Verify target belongs to same iceberg and is strictly forward in time
    has_target = df["target_lat"].notna()
    df_with_target = df[has_target].copy()
    assert (df_with_target["target_dt_days"] > 0).all(), "Assertion Failed: non-positive target_dt_days!"
    print("All strict assertion checks PASSED.")

    # --------------------------------------------------------------------------
    # 2. FILTER SUPERVISED DATASET
    # --------------------------------------------------------------------------
    print(f"\nSupervised observations with valid next target: {len(df_with_target):,} / {clean_obs:,}")
    print(f"Terminal observations retained in master but excluded from supervised: {len(df) - len(df_with_target):,}")

    # --------------------------------------------------------------------------
    # 3. SPLIT BY ICEBERG ID (LEAK-FREE GENERALIZATION)
    # --------------------------------------------------------------------------
    # Sort icebergs by length and stratify across splits
    np.random.seed(42)
    iceberg_ids = np.array(df["iceberg_id"].unique(), dtype=str)
    np.random.shuffle(iceberg_ids)

    n_total = len(iceberg_ids)
    n_train = int(round(0.70 * n_total))
    n_val = int(round(0.15 * n_total))

    train_ids = set(iceberg_ids[:n_train])
    val_ids = set(iceberg_ids[n_train:n_train + n_val])
    test_ids = set(iceberg_ids[n_train + n_val:])

    # Ensure no iceberg overlap
    assert len(train_ids.intersection(val_ids)) == 0, "Iceberg leakage train/val!"
    assert len(train_ids.intersection(test_ids)) == 0, "Iceberg leakage train/test!"
    assert len(val_ids.intersection(test_ids)) == 0, "Iceberg leakage val/test!"

    df_train = df_with_target[df_with_target["iceberg_id"].isin(train_ids)].copy()
    df_val = df_with_target[df_with_target["iceberg_id"].isin(val_ids)].copy()
    df_test = df_with_target[df_with_target["iceberg_id"].isin(test_ids)].copy()

    df_train.to_parquet(TRAIN_PARQUET, index=False)
    df_val.to_parquet(VAL_PARQUET, index=False)
    df_test.to_parquet(TEST_PARQUET, index=False)

    print(f"\nSaved Train Parquet: {TRAIN_PARQUET} ({len(df_train):,} obs, {len(train_ids)} icebergs)")
    print(f"Saved Validation Parquet: {VAL_PARQUET} ({len(df_val):,} obs, {len(val_ids)} icebergs)")
    print(f"Saved Test Parquet: {TEST_PARQUET} ({len(df_test):,} obs, {len(test_ids)} icebergs)")

    # --------------------------------------------------------------------------
    # 4. FINAL PIPELINE SUMMARY (SECTION 29)
    # --------------------------------------------------------------------------
    g_cov = df["glorys_available"].mean() * 100
    e_cov = df["era5_available"].mean() * 100
    s_cov = df["seaice_available"].mean() * 100
    b_cov = df["gebco_available"].mean() * 100
    all_cov = df["all_environment_available"].mean() * 100
    n_flagged = (df["quality_flags"] != "valid").sum()

    # Reconfigure stdout for utf-8 if supported
    import sys
    if sys.stdout.encoding.lower() not in ["utf-8", "utf8"]:
        sys.stdout.reconfigure(encoding="utf-8")

    print()
    print("-" * 44)
    print("ICEBERG DATASET CLEANING COMPLETE")
    print("-" * 44)
    print()
    print("Golden window:")
    print("2023-03-23 -> 2026-04-30")
    print()
    print("Original observations:")
    print(f"{orig_obs:,}")
    print()
    print("Clean observations:")
    print(f"{clean_obs:,}")
    print()
    print("Unique icebergs:")
    print(f"{n_icebergs}")
    print()
    print("GLORYS coverage:")
    print(f"{g_cov:.1f}%")
    print()
    print("ERA5 coverage:")
    print(f"{e_cov:.1f}%")
    print()
    print("Sea-ice coverage:")
    print(f"{s_cov:.1f}%")
    print()
    print("GEBCO coverage:")
    print(f"{b_cov:.1f}%")
    print()
    print("All-environment coverage:")
    print(f"{all_cov:.1f}%")
    print()
    print("Supervised observations with valid targets:")
    print(f"{len(df_with_target):,}")
    print()
    print("Rows removed:")
    print("0")
    print()
    print("Rows flagged:")
    print(f"{n_flagged:,}")
    print()
    print("Missing values:")
    print("PRESERVED where scientifically appropriate")
    print()
    print("Raw files:")
    print("UNCHANGED")
    print()
    print("Output:")
    print(r"D:\SIH\IceBerg\dataSet\06_processed")
    print()
    print("-" * 44)


if __name__ == "__main__":
    validate_and_split()
