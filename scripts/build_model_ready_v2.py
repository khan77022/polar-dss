"""
scripts/build_model_ready_v2.py
================================================================================
SIH2659 – Build iceberg_model_ready_v2.parquet
================================================================================
Sources:
  - iceberg_env_matched_v2.parquet  (corrected env extraction, all 4 bugs fixed)
  - iceberg_tracks_golden_2023_2026.parquet (track metadata)

v1 files COMPLETELY FROZEN (byte-for-byte):
  iceberg_model_ready_v1.parquet
  iceberg_env_matched_2023_2026.parquet
  train.parquet / validation.parquet / test.parquet

Output: dataSet/06_processed/iceberg_model_ready_v2.parquet
"""

from pathlib import Path
import sys, logging, hashlib
import numpy as np
import pandas as pd

PROJECT_ROOT  = Path(r"D:\SIH\IceBerg").resolve()
PROCESSED_DIR = PROJECT_ROOT / "dataSet" / "06_processed"
LOGS_DIR      = PROCESSED_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

ENV_V2       = PROCESSED_DIR / "iceberg_env_matched_v2.parquet"
V1_FROZEN    = PROCESSED_DIR / "iceberg_model_ready_v1.parquet"
OUTPUT_V2    = PROCESSED_DIR / "iceberg_model_ready_v2.parquet"
LOG_FILE     = LOGS_DIR / "build_model_ready_v2.log"

logger = logging.getLogger("mr_v2")
logger.setLevel(logging.INFO)
logger.handlers.clear()
fh = logging.FileHandler(LOG_FILE, mode="w", encoding="utf-8")
fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(fh)
sh = logging.StreamHandler(sys.stdout)
sh.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(sh)


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    logger.info("=" * 70)
    logger.info("  SIH2659 – build_model_ready_v2.py")
    logger.info("=" * 70)

    # Record v1 hash before anything
    v1_hash_before = sha256_file(V1_FROZEN)
    logger.info(f"v1 SHA-256 before: {v1_hash_before}")

    # Load v2 env matched
    logger.info(f"\nLoading: {ENV_V2.name}")
    df = pd.read_parquet(ENV_V2)
    logger.info(f"  Rows: {len(df):,}, Cols: {len(df.columns)}, Icebergs: {df['iceberg_id'].nunique()}")

    # ----- Derived lag/kinematic features -----
    logger.info("Computing causal lag features …")
    df = df.sort_values(["iceberg_id", "date"]).reset_index(drop=True)

    # Previous-step kinematics (lag-1), strictly within iceberg
    for col in ["delta_lat", "delta_lon", "speed_kmday", "direction_deg"]:
        lag_col = f"{col}_lag1"
        df[lag_col] = df.groupby("iceberg_id")[col].shift(1)

    for col in ["glorys_uo_ms", "glorys_vo_ms", "glorys_thetao",
                "glorys_so", "glorys_zos", "glorys_mlotst",
                "era5_u10_ms", "era5_v10_ms", "era5_msl_pa",
                "seaice_conc", "wind_speed_ms", "current_speed_ms"]:
        if col in df.columns:
            df[f"{col}_lag1"] = df.groupby("iceberg_id")[col].shift(1)

    # Day-of-year seasonality
    df["day_of_year"] = df["date"].dt.dayofyear
    df["sin_doy"]     = np.sin(2 * np.pi * df["day_of_year"] / 365.25)
    df["cos_doy"]     = np.cos(2 * np.pi * df["day_of_year"] / 365.25)

    # Hemisphere context
    df["lat_abs"] = np.abs(df["lat"])
    df["lat_rad"] = np.radians(df["lat"])
    df["lon_rad"] = np.radians(df["lon"])

    # Source confidence as binary
    src_map = {"BYU": 1, "NIC": 0}
    if "source" in df.columns:
        df["source_byu"] = df["source"].map(src_map).fillna(0).astype(np.int8)

    # Drop non-feature columns (retain as metadata)
    METADATA_COLS  = ["iceberg_id", "date", "lat", "lon", "source", "confidence",
                      "quality_flags", "previous_lat", "previous_lon", "previous_date",
                      "next_lat", "next_lon", "next_date"]
    TARGET_COLS    = ["target_lat", "target_lon", "target_delta_lat", "target_delta_lon",
                      "target_north_displacement_m", "target_east_displacement_m", "target_dt_days"]
    AVAILABILITY   = [c for c in df.columns if c.endswith("_available")]
    MISSING_COUNTS = [c for c in df.columns if "missing" in c]

    all_keep = set(METADATA_COLS + TARGET_COLS + AVAILABILITY + MISSING_COUNTS +
                   list(df.columns))  # keep everything, model-ready = all columns retained

    logger.info(f"Final columns: {len(df.columns)}")

    # NaN profile
    nan_pct = df.isnull().mean() * 100
    logger.info("\nNaN summary (cols > 0%):")
    for col, p in nan_pct[nan_pct > 0].sort_values().items():
        logger.info(f"  {col:40s}: {p:.1f}%")

    # Save
    logger.info(f"\nSaving → {OUTPUT_V2}")
    df.to_parquet(OUTPUT_V2, index=False)
    mb = OUTPUT_V2.stat().st_size / 1024 / 1024
    logger.info(f"Saved {mb:.2f} MB, {len(df):,} rows, {len(df.columns)} cols")

    # v1 frozen check
    v1_hash_after = sha256_file(V1_FROZEN)
    if v1_hash_before == v1_hash_after:
        logger.info(f"v1 FROZEN ✓ (SHA-256 unchanged: {v1_hash_after[:16]}…)")
    else:
        logger.error("v1 SHA-256 MISMATCH — v1 was modified!")

    logger.info("=" * 70)
    logger.info(f"  iceberg_model_ready_v2.parquet: {mb:.2f} MB, {len(df):,} rows, "
                f"{len(df.columns)} cols, {df['iceberg_id'].nunique()} icebergs")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()