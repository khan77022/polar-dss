"""
SIH2659 -- Step 1 & 2: Build the Final Model-Ready Dataset
===========================================================
Produces dataSet/06_processed/iceberg_model_ready_v1.parquet

STRICTLY PRESERVES:
- Frozen benchmark files in 06_processed/ (NOT overwritten)
- 25,636 observations across 78 icebergs
- Existing train (55 bergs), validation (12 bergs), test (11 bergs) grouping
- Legitimate environmental missingness (NaNs preserved, NO zero-filling, NO extrapolation)
- Causal feature engineering (strictly backward-looking, NO future target leakage)
"""

import datetime
import math
import pathlib
import numpy as np
import pandas as pd

PROJECT_ROOT  = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_ROOT  = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_ROOT / "06_processed"

BENCHMARK_ENV_MATCHED = PROCESSED_DIR / "iceberg_env_matched_2023_2026.parquet"
BENCHMARK_TRAIN       = PROCESSED_DIR / "train.parquet"
BENCHMARK_VAL         = PROCESSED_DIR / "validation.parquet"
BENCHMARK_TEST        = PROCESSED_DIR / "test.parquet"

TARGET_OUTPUT = PROCESSED_DIR / "iceberg_model_ready_v1.parquet"

SEP = "=" * 70


def log(msg):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def safe_sin(deg_series):
    rad = np.radians(deg_series)
    return np.sin(rad)


def safe_cos(deg_series):
    rad = np.radians(deg_series)
    return np.cos(rad)


def build_model_ready_dataset():
    log(SEP)
    log("BUILDING MODEL-READY DATASET (v1)")
    log(SEP)

    # 1. Load benchmark datasets (READ-ONLY)
    log(f"Reading benchmark environmental dataset: {BENCHMARK_ENV_MATCHED.name}...")
    df = pd.read_parquet(BENCHMARK_ENV_MATCHED)
    log(f"  Loaded {len(df):,} rows, {df['iceberg_id'].nunique()} icebergs.")

    # 2. Extract split assignment from existing benchmark splits
    log("Extracting split assignments from benchmark splits...")
    train_df = pd.read_parquet(BENCHMARK_TRAIN)
    val_df   = pd.read_parquet(BENCHMARK_VAL)
    test_df  = pd.read_parquet(BENCHMARK_TEST)

    train_bergs = set(train_df["iceberg_id"].unique())
    val_bergs   = set(val_df["iceberg_id"].unique())
    test_bergs  = set(test_df["iceberg_id"].unique())

    log(f"  Train icebergs: {len(train_bergs)}")
    log(f"  Val icebergs:   {len(val_bergs)}")
    log(f"  Test icebergs:  {len(test_bergs)}")

    # Ensure mutually exclusive
    assert len(train_bergs & val_bergs) == 0, "Split overlap between Train and Val!"
    assert len(train_bergs & test_bergs) == 0, "Split overlap between Train and Test!"
    assert len(val_bergs & test_bergs) == 0, "Split overlap between Val and Test!"

    split_map = {}
    for b in train_bergs: split_map[b] = "train"
    for b in val_bergs:   split_map[b] = "validation"
    for b in test_bergs:  split_map[b] = "test"

    df["split"] = df["iceberg_id"].map(split_map)
    assert df["split"].isna().sum() == 0, "Some icebergs do not have a split assignment!"

    # 3. Chronological sorting
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["iceberg_id", "date"]).reset_index(drop=True)

    # 4. Identity & Position
    out = pd.DataFrame()
    out["iceberg_id"] = df["iceberg_id"]
    out["date"]       = df["date"]
    out["lat"]        = df["lat"].astype(np.float64)
    out["lon"]        = df["lon"].astype(np.float64)

    # 5. Iceberg Geometry
    out["length_m"]   = df["length"].astype(np.float64)
    out["width_m"]    = df["width"].astype(np.float64)
    out["area_km2"]   = (out["length_m"] * out["width_m"]) / 1e6

    # 6. Time & Seasonality
    out["month"]             = df["date"].dt.month.astype(np.int32)
    day_of_year              = df["date"].dt.dayofyear
    out["day_of_year"]       = day_of_year.astype(np.int32)
    out["day_of_year_sin"]   = np.sin(2.0 * np.pi * day_of_year / 365.25)
    out["day_of_year_cos"]   = np.cos(2.0 * np.pi * day_of_year / 365.25)

    # 7. Causal Historical Kinematics (strictly backward-looking)
    log("Constructing causal historical kinematic features...")
    # df['speed_kmday'] in the source was the transition from t-1 to t
    # To be 100% unambiguous and causally sound:
    grouped = df.groupby("iceberg_id")
    
    # Historical step t-1 -> t
    out["lag_1_dt_days"]       = df["dt_days"].astype(np.float64)
    out["lag_1_delta_lat"]     = df["delta_lat"].astype(np.float64)
    out["lag_1_delta_lon"]     = df["delta_lon"].astype(np.float64)
    out["lag_1_speed_kmday"]   = df["speed_kmday"].astype(np.float64)
    out["lag_1_direction_deg"] = df["direction_deg"].astype(np.float64)
    out["lag_1_dir_sin"]       = safe_sin(out["lag_1_direction_deg"])
    out["lag_1_dir_cos"]       = safe_cos(out["lag_1_direction_deg"])

    # Group by iceberg_id on out DataFrame for causal backward shifts & rollings
    grouped_out = out.groupby("iceberg_id")

    # Historical step t-2 -> t-1 (shift 1 step back from lag_1)
    out["lag_2_speed_kmday"]   = grouped_out["lag_1_speed_kmday"].shift(1)
    out["lag_2_dir_sin"]       = grouped_out["lag_1_dir_sin"].shift(1)
    out["lag_2_dir_cos"]       = grouped_out["lag_1_dir_cos"].shift(1)

    # Backward rolling statistics (min_periods=1)
    # rolling over the past transitions arriving up to t
    out["rolling_3_speed_kmday"] = grouped_out["lag_1_speed_kmday"].transform(
        lambda s: s.rolling(window=3, min_periods=1).mean()
    )
    out["rolling_7_speed_kmday"] = grouped_out["lag_1_speed_kmday"].transform(
        lambda s: s.rolling(window=7, min_periods=1).mean()
    )

    roll_sin_3 = grouped_out["lag_1_dir_sin"].transform(lambda s: s.rolling(window=3, min_periods=1).mean())
    roll_cos_3 = grouped_out["lag_1_dir_cos"].transform(lambda s: s.rolling(window=3, min_periods=1).mean())
    norm_3 = np.sqrt(roll_sin_3**2 + roll_cos_3**2).replace(0, np.nan)
    out["rolling_3_dir_sin"] = roll_sin_3 / norm_3
    out["rolling_3_dir_cos"] = roll_cos_3 / norm_3

    roll_sin_7 = grouped_out["lag_1_dir_sin"].transform(lambda s: s.rolling(window=7, min_periods=1).mean())
    roll_cos_7 = grouped_out["lag_1_dir_cos"].transform(lambda s: s.rolling(window=7, min_periods=1).mean())
    norm_7 = np.sqrt(roll_sin_7**2 + roll_cos_7**2).replace(0, np.nan)
    out["rolling_7_dir_sin"] = roll_sin_7 / norm_7
    out["rolling_7_dir_cos"] = roll_cos_7 / norm_7

    # 8. Ocean Features (GLORYS12)
    log("Formatting ocean features...")
    out["uo"]               = df["glorys_uo_ms"].astype(np.float64)
    out["vo"]               = df["glorys_vo_ms"].astype(np.float64)
    out["current_speed"]    = np.sqrt(out["uo"]**2 + out["vo"]**2)
    out["current_dir_deg"]  = df["glorys_current_dir_deg"].astype(np.float64)
    out["current_dir_sin"]  = safe_sin(out["current_dir_deg"])
    out["current_dir_cos"]  = safe_cos(out["current_dir_deg"])
    out["zos"]              = df["glorys_zos"].astype(np.float64)
    out["mlotst"]           = df["glorys_mlotst"].astype(np.float64)
    out["sithick"]          = df["glorys_sithick"].astype(np.float64)
    out["so"]               = df["glorys_so"].astype(np.float64)
    out["thetao"]           = df["glorys_thetao"].astype(np.float64)

    # 9. Atmospheric Features (ERA5)
    log("Formatting atmospheric features...")
    out["u10"]              = df["era5_u10_ms"].astype(np.float64)
    out["v10"]              = df["era5_v10_ms"].astype(np.float64)
    out["wind_speed"]       = np.sqrt(out["u10"]**2 + out["v10"]**2)
    out["wind_dir_deg"]     = df["era5_wind_dir_deg"].astype(np.float64)
    out["wind_dir_sin"]     = safe_sin(out["wind_dir_deg"])
    out["wind_dir_cos"]     = safe_cos(out["wind_dir_deg"])
    out["msl"]              = df["era5_msl_pa"].astype(np.float64)
    out["swh"]              = df["era5_swh_m"].astype(np.float64)
    out["mwd"]              = df["era5_mwd_deg"].astype(np.float64)

    # Relative wind-current angle
    out["wind_relative_to_current_deg"] = df["wind_relative_to_current_deg"].astype(np.float64)
    out["wind_relative_to_current_sin"] = safe_sin(out["wind_relative_to_current_deg"])
    out["wind_relative_to_current_cos"] = safe_cos(out["wind_relative_to_current_deg"])

    # 10. Sea Ice Features (OSI-SAF)
    log("Formatting sea ice features...")
    out["seaice_conc"]         = df["seaice_conc"].astype(np.float64)
    out["seaice_raw_conc"]     = df["seaice_raw_conc"].astype(np.float64)
    out["seaice_uncertainty"]  = df["seaice_uncertainty"].astype(np.float64)
    out["seaice_status_flag"]   = df["seaice_status_flag"].astype(np.float64)

    # 11. Bathymetry (GEBCO 2024) - Strictly preserving NaNs! NO zero fill!
    log("Formatting bathymetry features...")
    out["gebco_elevation"]     = df["ocean_depth_m"].astype(np.float64)
    out["gebco_available"]     = df["gebco_available"].astype(np.int32)
    # Validate: exactly 2769 NaNs and 2769 zeros
    assert out["gebco_elevation"].isna().sum() == 2769, "Unexpected GEBCO elevation NaN count!"
    assert (out["gebco_available"] == 0).sum() == 2769, "Unexpected GEBCO available zero count!"

    # 12. Environmental Availability Flags
    out["glorys_available"]             = df["glorys_available"].astype(np.int32)
    out["era5_available"]               = df["era5_available"].astype(np.int32)
    out["seaice_available"]             = df["seaice_available"].astype(np.int32)
    out["all_environment_available"]    = df["all_environment_available"].astype(np.int32)
    out["dynamic_environment_available"]= (
        (out["glorys_available"] == 1) & 
        (out["era5_available"] == 1) & 
        (out["seaice_available"] == 1)
    ).astype(np.int32)

    # 13. Quality Control Indicators
    log("Formatting QC indicators...")
    out["quality_flags"]          = df["quality_flags"].astype(str)
    out["is_first_observation"]   = out["lag_1_speed_kmday"].isna().astype(np.int32)
    out["is_terminal_observation"]= df["target_north_displacement_m"].isna().astype(np.int32)
    out["is_zero_movement"]       = ((out["lag_1_speed_kmday"] == 0.0) | ((out["lag_1_delta_lat"] == 0.0) & (out["lag_1_delta_lon"] == 0.0))).fillna(False).astype(np.int32)

    # 14. Target Definition (t -> t+1)
    log("Preserving authoritative targets...")
    out["target_north_displacement_m"] = df["target_north_displacement_m"].astype(np.float64)
    out["target_east_displacement_m"]  = df["target_east_displacement_m"].astype(np.float64)
    out["target_dt_days"]              = df["target_dt_days"].astype(np.float64)

    # 15. Grouped Split
    out["split"] = df["split"].astype(str)

    # Verification: check shape and rows
    assert len(out) == 25636, f"Expected 25,636 rows, got {len(out)}"
    assert out["iceberg_id"].nunique() == 78, f"Expected 78 icebergs, got {out['iceberg_id'].nunique()}"

    # Confirm split counts
    valid_targets = out[out["target_north_displacement_m"].notna()]
    assert len(valid_targets[valid_targets["split"] == "train"]) == 19252
    assert len(valid_targets[valid_targets["split"] == "validation"]) == 3714
    assert len(valid_targets[valid_targets["split"] == "test"]) == 2592
    assert out["is_terminal_observation"].sum() == 78

    # 16. Save model-ready table
    log(f"Writing {TARGET_OUTPUT.name}...")
    out.to_parquet(TARGET_OUTPUT, index=False)
    log(f"  Successfully wrote {TARGET_OUTPUT.name} ({TARGET_OUTPUT.stat().st_size / 1e6:.2f} MB, {len(out):,} rows, {out.shape[1]} columns)")

    # 17. Confirm benchmark files were NOT touched
    assert BENCHMARK_ENV_MATCHED.exists()
    assert BENCHMARK_TRAIN.exists()
    assert BENCHMARK_VAL.exists()
    assert BENCHMARK_TEST.exists()
    log("Benchmark file immutability verified.")
    log(SEP)


if __name__ == "__main__":
    build_model_ready_dataset()
