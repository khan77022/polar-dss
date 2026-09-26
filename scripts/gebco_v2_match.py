"""
scripts/gebco_v2_match.py
================================================================================
SIH2659 – GEBCO v2 Bathymetry Matching
================================================================================
Produces iceberg_gebco2026_matched_v2.parquet containing, for each of the
25,636 golden observations:

  iceberg_id | date | lat | lon |
  gebco_elevation_v1 | gebco_available_v1 |   ← GEBCO-2024 tile [-75,-60]
  gebco_elevation_v2 | gebco_available_v2     ← GEBCO-2026 tile [-85,-50]

Rules (from spec):
  - Do NOT modify v1 files (byte-for-byte frozen).
  - Do NOT use spatial extrapolation outside actual GEBCO tile bounds.
  - Do NOT use nearest-ocean fallback (any NaN is genuine missing coverage).
  - Preserve missing values as NaN.
  - Use the ice-surface elevation file (NOT the sub-ice topography variant).
  - Sample is nearest-pixel (no interpolation) from the 15 arc-second grids.
  - For v2, prefer the new GEBCO-2026 value; fall back to GEBCO-2024 only
    where the 2026 tile also covers (for cross-validation, both columns kept).

File sources:
  v1: dataSet/05_bathymetry/gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc
      lat_var='lat', lon_var='lon', bounds lat [-75,-60] @ 15 arc-sec
  v2: dataSet/GEBCO_24_Sep_2026_02a17a352b6e/
          gebco_2026_n-50.0_s-85.0_w-180.0_e180.0.nc
      lat_var='lat', lon_var='lon', bounds lat [-85,-50] @ 15 arc-sec
      (sub-ice file retained separately, NOT used here)

Known prior result (v1 pipeline):
  22,867 / 25,636 obs covered (89.2%)
  2,769 outside [-75,-60]:  1,209 south of -75, 1,560 north of -60

Expected v2 improvement:
  25,605 / 25,636 covered (99.9%) — all obs within [-85,-50]
  31 permanently outside both tiles (iceberg a23a, northernmost drift)

Output: dataSet/06_processed/iceberg_gebco2026_matched_v2.parquet
"""

from pathlib import Path
import sys, logging, hashlib
import numpy as np
import pandas as pd
import netCDF4 as nc

PROJECT_ROOT  = Path(r"D:\SIH\IceBerg").resolve()
DATASET_DIR   = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_DIR / "06_processed"
LOGS_DIR      = PROCESSED_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# ── Source files ────────────────────────────────────────────────────────────
GEBCO_V1_PATH = DATASET_DIR / "05_bathymetry" / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
GEBCO_V2_PATH = (DATASET_DIR / "GEBCO_24_Sep_2026_02a17a352b6e"
                 / "gebco_2026_n-50.0_s-85.0_w-180.0_e180.0.nc")
GEBCO_V2_SUBICE = (DATASET_DIR / "GEBCO_24_Sep_2026_02a17a352b6e"
                   / "gebco_2026_sub_ice_n-50.0_s-85.0_w-180.0_e180.0.nc")

# ── Reference observation set (v1 model-ready is the coord reference) ───────
V1_MODEL_READY  = PROCESSED_DIR / "iceberg_model_ready_v1.parquet"
OUTPUT_PARQUET  = PROCESSED_DIR / "iceberg_gebco2026_matched_v2.parquet"
LOG_FILE        = LOGS_DIR / "gebco_v2_match.log"

FILL_VALUE = -32767   # NetCDF fill value in GEBCO int16 grids

logger = logging.getLogger("gebco_v2")
logger.setLevel(logging.INFO)
logger.handlers.clear()
fh = logging.FileHandler(LOG_FILE, mode="w", encoding="utf-8")
fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(fh)
sh = logging.StreamHandler(sys.stdout)
sh.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(sh)


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sample_gebco(nc_path: Path, lat_var: str, lon_var: str,
                 obs_lats: np.ndarray, obs_lons: np.ndarray,
                 lat_bounds: tuple, label: str) -> tuple[np.ndarray, np.ndarray]:
    """
    Nearest-pixel sampling from a GEBCO int16 NetCDF tile.

    Returns (elevation_arr, available_arr):
      elevation_arr: float32 array, NaN where outside tile or fill_value
      available_arr: int8 array, 1 where valid elevation sampled
    """
    logger.info(f"  Opening {label}: {nc_path.name}")
    ds = nc.Dataset(nc_path)
    lat_arr = ds.variables[lat_var][:]
    lon_arr = ds.variables[lon_var][:]
    elev_var = ds.variables["elevation"]

    lat_min = float(lat_arr.min())
    lat_max = float(lat_arr.max())
    lon_min = float(lon_arr.min())
    dlat    = float(np.abs(np.diff(lat_arr[:5]).mean()))
    dlon    = float(np.abs(np.diff(lon_arr[:5]).mean()))
    n_lat   = len(lat_arr)
    n_lon   = len(lon_arr)

    logger.info(f"    Grid: ({n_lat} × {n_lon}), lat [{lat_min:.4f}, {lat_max:.4f}], "
                f"res={dlat*3600:.0f} arc-sec")
    logger.info(f"    Loading elevation tile into memory …")
    elev_data = elev_var[:].astype(np.float32)
    elev_data[elev_data == FILL_VALUE] = np.nan

    # Strict in-bounds mask (no extrapolation)
    lo_bound, hi_bound = lat_bounds
    in_bounds = (obs_lats >= lo_bound) & (obs_lats <= hi_bound) & \
                (obs_lons >= -180.0)   & (obs_lons <= 180.0)

    n_total   = len(obs_lats)
    n_in      = int(in_bounds.sum())
    logger.info(f"    Obs in bounds [{lo_bound},{hi_bound}]: {n_in:,}/{n_total:,} ({n_in/n_total*100:.1f}%)")

    elevation = np.full(n_total, np.nan, dtype=np.float32)
    available = np.zeros(n_total, dtype=np.int8)

    if n_in == 0:
        ds.close()
        return elevation, available

    # Nearest-pixel index computation (lat can be stored N→S or S→N)
    # Both GEBCO tiles store lat ascending (S→N): lat[0] = most southern
    idx_lat = np.clip(
        np.round((obs_lats[in_bounds] - lat_min) / dlat).astype(int),
        0, n_lat - 1
    )
    idx_lon = np.clip(
        np.round((obs_lons[in_bounds] - lon_min) / dlon).astype(int),
        0, n_lon - 1
    )

    sampled = elev_data[idx_lat, idx_lon]
    elevation[in_bounds] = sampled

    # Mark available only where sampled value is not NaN (fill-value-free)
    valid_sample = ~np.isnan(sampled)
    avail_indices = np.where(in_bounds)[0][valid_sample]
    available[avail_indices] = 1

    n_valid   = int(valid_sample.sum())
    n_fill    = int(n_in - n_valid)
    logger.info(f"    Sampled: {n_valid:,} valid, {n_fill:,} hit fill-value within bounds")
    logger.info(f"    Elev range (valid): {float(np.nanmin(sampled)):.0f} to {float(np.nanmax(sampled)):.0f} m")

    ds.close()
    return elevation, available


def main():
    logger.info("=" * 70)
    logger.info("  SIH2659 – gebco_v2_match.py: GEBCO-2026 vs GEBCO-2024 Matching")
    logger.info("=" * 70)

    # ── Record SHA-256 of v1 BEFORE doing anything ───────────────────────────
    v1_sha_before = sha256_file(V1_MODEL_READY)
    logger.info(f"v1 model-ready SHA-256 (before): {v1_sha_before}")

    # ── Load observation coordinates from v1 reference ───────────────────────
    logger.info(f"\nLoading observation reference: {V1_MODEL_READY.name}")
    ref_df = pd.read_parquet(V1_MODEL_READY, columns=["iceberg_id","date","lat","lon"])
    logger.info(f"  {len(ref_df):,} observations, {ref_df['iceberg_id'].nunique()} icebergs")
    logger.info(f"  Dates: {ref_df['date'].min().date()} → {ref_df['date'].max().date()}")

    obs_lats = ref_df["lat"].values.astype(np.float64)
    obs_lons = ref_df["lon"].values.astype(np.float64)

    # ── Pre-flight check: known-outside observations ─────────────────────────
    logger.info("\nPre-flight coverage analysis:")
    south_of_v1 = (obs_lats < -75.0).sum()
    north_of_v1 = (obs_lats > -60.0).sum()
    south_of_v2 = (obs_lats < -85.0).sum()
    north_of_v2 = (obs_lats > -50.0).sum()
    logger.info(f"  Outside GEBCO-2024 [-75,-60]: {south_of_v1+north_of_v1:,} "
                f"({south_of_v1:,} south, {north_of_v1:,} north)")
    logger.info(f"  Outside GEBCO-2026 [-85,-50]: {south_of_v2+north_of_v2:,} "
                f"({south_of_v2:,} south, {north_of_v2:,} north)")
    logger.info(f"  Newly recovered:              {(south_of_v1+north_of_v1) - (south_of_v2+north_of_v2):,}")
    logger.info(f"  Permanently outside both:     {south_of_v2+north_of_v2:,}")
    logger.info("  → No extrapolation used. NaN preserved for all out-of-bounds obs.")

    # ── Sample GEBCO v1 ───────────────────────────────────────────────────────
    logger.info("\n[A] Sampling GEBCO-2024 (v1 tile) …")
    elev_v1, avail_v1 = sample_gebco(
        GEBCO_V1_PATH, lat_var="lat", lon_var="lon",
        obs_lats=obs_lats, obs_lons=obs_lons,
        lat_bounds=(-75.0, -60.0), label="GEBCO-2024"
    )

    # ── Sample GEBCO v2 ───────────────────────────────────────────────────────
    logger.info("\n[B] Sampling GEBCO-2026 (ice-surface elevation) …")
    elev_v2, avail_v2 = sample_gebco(
        GEBCO_V2_PATH, lat_var="lat", lon_var="lon",
        obs_lats=obs_lats, obs_lons=obs_lons,
        lat_bounds=(-85.0, -50.0), label="GEBCO-2026"
    )

    # ── Build output parquet ──────────────────────────────────────────────────
    logger.info("\nBuilding output dataframe …")
    out_df = pd.DataFrame({
        "iceberg_id":        ref_df["iceberg_id"].values,
        "date":              ref_df["date"].values,
        "lat":               obs_lats,
        "lon":               obs_lons,
        "gebco_elevation_v1": elev_v1,
        "gebco_available_v1": avail_v1,
        "gebco_elevation_v2": elev_v2,
        "gebco_available_v2": avail_v2,
    })

    # ── Coverage comparison ───────────────────────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("COVERAGE COMPARISON REPORT")
    logger.info("=" * 70)
    n     = len(out_df)
    n_v1  = int(avail_v1.sum())
    n_v2  = int(avail_v2.sum())
    miss_v1 = n - n_v1
    miss_v2 = n - n_v2
    recovered   = int(((avail_v2 == 1) & (avail_v1 == 0)).sum())
    still_miss  = int(((avail_v2 == 0) & (avail_v1 == 0)).sum())

    logger.info(f"  Total observations:            {n:,}")
    logger.info(f"  v1 (GEBCO-2024) covered:       {n_v1:,} ({n_v1/n*100:.1f}%)")
    logger.info(f"  v1 missing:                    {miss_v1:,} ({miss_v1/n*100:.1f}%)")
    logger.info(f"  v2 (GEBCO-2026) covered:       {n_v2:,} ({n_v2/n*100:.1f}%)")
    logger.info(f"  v2 missing:                    {miss_v2:,} ({miss_v2/n*100:.1f}%)")
    logger.info(f"  Newly recovered by v2:         {recovered:,} ({recovered/n*100:.1f}%)")
    logger.info(f"  Still missing in both:         {still_miss:,} ({still_miss/n*100:.1f}%)")
    logger.info(f"  Fallback/extrapolation used:   NONE")

    logger.info("\n  Elevation statistics (v2 valid):")
    ev2 = out_df.loc[out_df["gebco_available_v2"]==1, "gebco_elevation_v2"]
    logger.info(f"    min={ev2.min():.0f} m, max={ev2.max():.0f} m, "
                f"mean={ev2.mean():.1f} m, median={ev2.median():.1f} m")

    logger.info("\n  Coverage by latitude band:")
    bands = [(-90,-85),(-85,-80),(-80,-75),(-75,-70),(-70,-65),(-65,-60),
             (-60,-55),(-55,-50),(-50,-45),(-45,-40)]
    for lo, hi in bands:
        mask = (obs_lats >= lo) & (obs_lats < hi)
        cnt  = int(mask.sum())
        if cnt == 0:
            continue
        cv1  = int((avail_v1[mask] == 1).sum())
        cv2  = int((avail_v2[mask] == 1).sum())
        logger.info(f"    [{lo:4d},{hi:4d}): {cnt:5,} obs  |  v1={cv1:5,} ({cv1/cnt*100:5.1f}%)  "
                    f"v2={cv2:5,} ({cv2/cnt*100:5.1f}%)")

    logger.info("\n  Obs still missing in BOTH tiles (no coverage possible):")
    perm_miss = out_df[(out_df["gebco_available_v1"]==0) & (out_df["gebco_available_v2"]==0)]
    logger.info(f"    Count: {len(perm_miss)}")
    if len(perm_miss) > 0:
        logger.info(f"    Icebergs: {perm_miss['iceberg_id'].unique().tolist()}")
        logger.info(f"    Lat range: {perm_miss['lat'].min():.2f} to {perm_miss['lat'].max():.2f}")
        logger.info(f"    Lon range: {perm_miss['lon'].min():.2f} to {perm_miss['lon'].max():.2f}")
        logger.info(f"    Date range: {perm_miss['date'].min().date()} to {perm_miss['date'].max().date()}")

    logger.info("\n  Coverage by iceberg (v1 vs v2):")
    for iid, grp in out_df.groupby("iceberg_id"):
        gn   = len(grp)
        gc1  = int((grp["gebco_available_v1"]==1).sum())
        gc2  = int((grp["gebco_available_v2"]==1).sum())
        flag = " ← NEW COVERAGE" if gc2 > gc1 else ""
        flag = " ← PARTIAL" if gc2 < gn else flag
        logger.info(f"    {iid:10s}: {gn:4,} obs  v1={gc1:4,} ({gc1/gn*100:5.1f}%)  "
                    f"v2={gc2:4,} ({gc2/gn*100:5.1f}%){flag}")

    # ── Suspicious value check ────────────────────────────────────────────────
    logger.info("\n  Suspicious values (v2 elevation > 0 m, i.e. land/ice sheet):")
    land_v2 = out_df[(out_df["gebco_available_v2"]==1) & (out_df["gebco_elevation_v2"] > 0)]
    logger.info(f"    Positive elevation (land) in v2: {len(land_v2):,} obs")
    if len(land_v2) > 0:
        logger.info(f"      Elev range: {land_v2['gebco_elevation_v2'].min():.0f} to {land_v2['gebco_elevation_v2'].max():.0f} m")

    fill_v2 = out_df[(out_df["gebco_available_v2"]==1) & (out_df["gebco_elevation_v2"].isna())]
    logger.info(f"    Fill-value NaN within claimed available: {len(fill_v2):,} obs (should be 0)")

    # ── Save ──────────────────────────────────────────────────────────────────
    logger.info(f"\nSaving → {OUTPUT_PARQUET}")
    out_df.to_parquet(OUTPUT_PARQUET, index=False)
    mb = OUTPUT_PARQUET.stat().st_size / 1024 / 1024
    logger.info(f"Saved {mb:.2f} MB, {len(out_df):,} rows, {len(out_df.columns)} cols")

    # ── Final v1 integrity check ──────────────────────────────────────────────
    v1_sha_after = sha256_file(V1_MODEL_READY)
    logger.info(f"\nv1 model-ready SHA-256 (after):  {v1_sha_after}")
    if v1_sha_before == v1_sha_after:
        logger.info("v1 BYTE-FOR-BYTE UNCHANGED. ✓")
    else:
        logger.error("v1 SHA-256 MISMATCH — v1 was modified! CRITICAL ERROR.")

    logger.info("=" * 70)
    logger.info("  SUMMARY")
    logger.info("=" * 70)
    logger.info(f"  New GEBCO files:         gebco_2026_n-50.0_s-85.0_w-180.0_e180.0.nc")
    logger.info(f"                           gebco_2026_sub_ice_...  (catalogued, NOT used)")
    logger.info(f"  GEBCO-2026 lat coverage: -85.0 to -50.0 (35-degree extension)")
    logger.info(f"  Resolution:              15 arc-second (same as v1)")
    logger.info(f"  v1 coverage:             {n_v1:,}/{n:,} ({n_v1/n*100:.1f}%)")
    logger.info(f"  v2 coverage:             {n_v2:,}/{n:,} ({n_v2/n*100:.1f}%)")
    logger.info(f"  Newly recovered:         {recovered:,}")
    logger.info(f"  Still missing (a23a):    {still_miss:,} (genuine out-of-coverage)")
    logger.info(f"  Extrapolation used:      NONE")
    logger.info(f"  Fallback used:           NONE")
    logger.info(f"  v1 frozen:               {v1_sha_before == v1_sha_after}")
    logger.info(f"  Output:                  {OUTPUT_PARQUET}")
    logger.info("=" * 70)
    logger.info("DO NOT proceed to iceberg_model_ready_v2 until user approves this output.")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()