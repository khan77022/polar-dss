"""
scripts/03_match_environment.py
================================================================================
Master Environmental Matching Pipeline
================================================================================
Matches cleaned Golden Window iceberg observations (2023-03-23 to 2026-04-30)
with:
  1. GLORYS Ocean Reanalysis (uo, vo, thetao, so, zos, mlotst, sithick)
  2. ERA5 Atmospheric Forcing (u10, v10, msl, swh, mwd)
  3. Sea Ice Concentration (ice_conc, raw_ice_conc, status_flag, uncertainty)
  4. GEBCO 2024 Bathymetry (ocean_depth_m)

Computes derived physical features, vectors, relative angles, availability flags,
and strictly leak-free future targets (next-step displacement for same iceberg).

Preserves genuine missing values as NaN (no zero-fill, no silent imputation).

Outputs:
  - dataSet/06_processed/iceberg_env_matched_2023_2026.parquet
  - dataSet/06_processed/logs/matching.log
"""

from pathlib import Path
import sys
import logging
import warnings
import numpy as np
import pandas as pd
import xarray as xr
import netCDF4 as nc

warnings.filterwarnings("ignore", category=UserWarning)

PROJECT_ROOT = Path(r"D:\SIH\IceBerg").resolve()
DATASET_DIR = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_DIR / "06_processed"
LOGS_DIR = PROCESSED_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

TRACKS_GOLDEN_PARQUET = PROCESSED_DIR / "iceberg_tracks_golden_2023_2026.parquet"
MATCHED_OUTPUT_PARQUET = PROCESSED_DIR / "iceberg_env_matched_2023_2026.parquet"
MATCHING_LOG = LOGS_DIR / "matching.log"

# Setup Logger
logger = logging.getLogger("match_environment")
logger.setLevel(logging.INFO)
logger.handlers.clear()

f_handler = logging.FileHandler(MATCHING_LOG, mode="w", encoding="utf-8")
f_format = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
f_handler.setFormatter(f_format)
logger.addHandler(f_handler)

c_handler = logging.StreamHandler(sys.stdout)
c_format = logging.Formatter("%(message)s")
c_handler.setFormatter(c_format)
logger.addHandler(c_handler)


def safe_float(val):
    if val is None or np.ma.is_masked(val):
        return np.nan
    try:
        f = float(val)
        return np.nan if np.isnan(f) else f
    except Exception:
        return np.nan


# ==============================================================================
# 1. GEBCO MATCHING
# ==============================================================================
def match_gebco(df):
    logger.info("--- Matching Pillar: GEBCO 2024 Bathymetry ---")
    gebco_path = DATASET_DIR / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
    if not gebco_path.exists():
        logger.error(f"GEBCO file not found at {gebco_path}")
        df["ocean_depth_m"] = np.nan
        df["gebco_available"] = 0
        return df

    logger.info(f"Opening GEBCO dataset: {gebco_path.name}")
    ds = nc.Dataset(gebco_path)
    elev_var = ds.variables["elevation"]
    
    lat_min = -74.99791667
    lat_max = -60.00208333
    lon_min = -179.99791667
    dlat = 1.0 / 240.0
    dlon = 1.0 / 240.0
    n_lat = elev_var.shape[0]
    n_lon = elev_var.shape[1]

    ocean_depth = np.full(len(df), np.nan, dtype=np.float32)
    gebco_avail = np.zeros(len(df), dtype=np.int8)

    lats = df["lat"].values
    lons = df["lon"].values

    valid_mask = (lats >= -75.0) & (lats <= -60.0) & (lons >= -180.0) & (lons <= 180.0)
    logger.info(f"Observations within GEBCO bounds [-75°, -60°]: {valid_mask.sum():,} / {len(df):,} ({valid_mask.mean()*100:.1f}%)")

    idx_lat = np.clip(np.round((lats[valid_mask] - lat_min) / dlat).astype(int), 0, n_lat - 1)
    idx_lon = np.clip(np.round((lons[valid_mask] - lon_min) / dlon).astype(int), 0, n_lon - 1)

    logger.info("Extracting elevation values from GEBCO grid...")
    elev_data = elev_var[:]
    depth_vals = elev_data[idx_lat, idx_lon]
    
    ocean_depth[valid_mask] = depth_vals
    gebco_avail[valid_mask] = 1

    df["ocean_depth_m"] = ocean_depth
    df["gebco_available"] = gebco_avail
    ds.close()

    logger.info(f"GEBCO matched: {gebco_avail.sum():,} available ({gebco_avail.mean()*100:.1f}%), {len(df) - gebco_avail.sum():,} missing/out-of-bounds")
    return df


# ==============================================================================
# 2. GLORYS OCEAN REANALYSIS MATCHING
# ==============================================================================
def match_glorys(df):
    logger.info("--- Matching Pillar: GLORYS Ocean Reanalysis ---")
    glorys_base = DATASET_DIR / "SIH" / "DATA_Copernicus"
    
    sectors = {
        "sector_-90_-180": (-180.0, -90.0),
        "sector_-90_0": (-90.0, 0.0),
        "sector_0_90": (0.0, 90.0),
        "sector_90_180": (90.0, 180.0)
    }

    glorys_cols = ["glorys_uo_ms", "glorys_vo_ms", "glorys_thetao", "glorys_so", "glorys_zos", "glorys_mlotst", "glorys_sithick"]
    for c in glorys_cols:
        df[c] = np.nan
    df["glorys_available"] = 0

    d_start = pd.Timestamp("2023-03-23")

    for sec_name, (lon_min_b, lon_max_b) in sectors.items():
        sec_dir = glorys_base / sec_name
        nc_files = list(sec_dir.glob("*.nc"))
        if not nc_files:
            continue
        nc_path = nc_files[0]
        logger.info(f"Processing GLORYS Sector [{sec_name}]: {nc_path.name}")

        ds = nc.Dataset(nc_path)
        lat_arr = ds.variables["latitude"][:]
        lon_arr = ds.variables["longitude"][:]
        time_var = ds.variables["time"]
        n_times = len(time_var)

        lat_min_g = float(lat_arr.min())
        lat_max_g = float(lat_arr.max())
        lon_min_g = float(lon_arr.min())
        dlat = float(np.abs(np.diff(lat_arr[:5]).mean()))
        dlon = float(np.abs(np.diff(lon_arr[:5]).mean()))
        n_lat = len(lat_arr)
        n_lon = len(lon_arr)

        if lon_max_b == 180.0:
            mask_sec = (df["lon"] >= lon_min_b) & (df["lon"] <= lon_max_b)
        else:
            mask_sec = (df["lon"] >= lon_min_b) & (df["lon"] < lon_max_b)

        mask_sec &= (df["lat"] >= lat_min_g) & (df["lat"] <= lat_max_g)
        sec_indices = df[mask_sec].index

        logger.info(f"  Observations in sector domain: {len(sec_indices):,}")
        if len(sec_indices) == 0:
            ds.close()
            continue

        # Extract variables using direct netCDF4 slicing
        uo_var = ds.variables["uo"]
        vo_var = ds.variables["vo"]
        th_var = ds.variables["thetao"]
        so_var = ds.variables["so"]
        zo_var = ds.variables["zos"]
        ml_var = ds.variables["mlotst"]
        si_var = ds.variables["sithick"]

        for idx in sec_indices:
            row = df.loc[idx]
            dt = row["date"]
            t_idx = (dt - d_start).days
            if t_idx < 0 or t_idx >= n_times:
                continue

            i_lat = int(np.clip(np.round((row["lat"] - lat_min_g) / dlat), 0, n_lat - 1))
            i_lon = int(np.clip(np.round((row["lon"] - lon_min_g) / dlon), 0, n_lon - 1))

            # 4D: (time, depth, latitude, longitude)
            uo = safe_float(uo_var[t_idx, 0, i_lat, i_lon])
            vo = safe_float(vo_var[t_idx, 0, i_lat, i_lon])
            th = safe_float(th_var[t_idx, 0, i_lat, i_lon])
            so = safe_float(so_var[t_idx, 0, i_lat, i_lon])

            # 3D: (time, latitude, longitude)
            zo = safe_float(zo_var[t_idx, i_lat, i_lon])
            ml = safe_float(ml_var[t_idx, i_lat, i_lon])
            si = safe_float(si_var[t_idx, i_lat, i_lon])

            if not np.isnan(uo) and not np.isnan(vo):
                df.at[idx, "glorys_uo_ms"] = uo
                df.at[idx, "glorys_vo_ms"] = vo
                df.at[idx, "glorys_thetao"] = th
                df.at[idx, "glorys_so"] = so
                df.at[idx, "glorys_zos"] = zo
                df.at[idx, "glorys_mlotst"] = ml
                df.at[idx, "glorys_sithick"] = si
                df.at[idx, "glorys_available"] = 1

        ds.close()

    valid_curr = (df["glorys_available"] == 1)
    df["glorys_current_speed_ms"] = np.where(
        valid_curr,
        np.sqrt(df["glorys_uo_ms"]**2 + df["glorys_vo_ms"]**2),
        np.nan
    )
    df["glorys_current_dir_deg"] = np.where(
        valid_curr,
        (np.degrees(np.arctan2(df["glorys_uo_ms"], df["glorys_vo_ms"])) + 360.0) % 360.0,
        np.nan
    )

    avail_count = df["glorys_available"].sum()
    logger.info(f"GLORYS matched: {avail_count:,} available ({avail_count / len(df)*100:.1f}%), {len(df) - avail_count:,} missing")
    return df


# ==============================================================================
# 3. ERA5 ATMOSPHERIC & WAVE MATCHING
# ==============================================================================
def match_era5(df):
    logger.info("--- Matching Pillar: ERA5 Atmospheric Reanalysis ---")
    era5_dir = DATASET_DIR / "ERA5"
    era5_2026_dir = DATASET_DIR / "ERA5_2026"

    era5_cols = ["era5_u10_ms", "era5_v10_ms", "era5_msl_pa", "era5_swh_m", "era5_mwd_deg"]
    for c in era5_cols:
        df[c] = np.nan
    df["era5_available"] = 0

    df["_ym"] = df["date"].dt.strftime("%Y_%m")
    unique_yms = sorted(df["_ym"].unique())

    logger.info(f"Observations span {len(unique_yms)} unique year-month buckets.")

    for ym in unique_yms:
        grib_name = f"era5_{ym}.grib"
        grib_path = era5_dir / grib_name
        if not grib_path.exists():
            grib_path = era5_2026_dir / grib_name
        if not grib_path.exists():
            logger.warning(f"ERA5 file not found for {ym}: {grib_name}")
            continue

        ym_indices = df[df["_ym"] == ym].index
        logger.info(f"Processing ERA5 [{ym}]: {grib_path.name} for {len(ym_indices):,} observations...")

        try:
            ds_surf = xr.open_dataset(
                grib_path,
                engine="cfgrib",
                backend_kwargs={"filter_by_keys": {"typeOfLevel": "surface"}}
            )
            lat_arr = ds_surf["latitude"].values
            lon_arr = ds_surf["longitude"].values
            time_arr = pd.to_datetime(ds_surf["time"].values)
            n_lats = len(lat_arr)
            n_lons = len(lon_arr)

            lat_start = float(lat_arr[0])
            dlat = float(np.abs(np.diff(lat_arr[:5]).mean()))
            lon_start = float(lon_arr[0])
            dlon = float(np.abs(np.diff(lon_arr[:5]).mean()))

            # Load numpy arrays once for fast in-memory indexing
            u10_vals = ds_surf["u10"].values
            v10_vals = ds_surf["v10"].values
            msl_vals = ds_surf["msl"].values

            ds_wave = None
            swh_vals = None
            try:
                ds_wave = xr.open_dataset(
                    grib_path,
                    engine="cfgrib",
                    backend_kwargs={"filter_by_keys": {"shortName": "swh"}}
                )
                w_lat_arr = ds_wave["latitude"].values
                w_lon_arr = ds_wave["longitude"].values
                w_lat_start = float(w_lat_arr[0])
                w_dlat = float(np.abs(np.diff(w_lat_arr[:5]).mean()))
                w_lon_start = float(w_lon_arr[0])
                w_dlon = float(np.abs(np.diff(w_lon_arr[:5]).mean()))
                n_w_lats = len(w_lat_arr)
                n_w_lons = len(w_lon_arr)
                swh_vals = ds_wave["swh"].values
            except Exception:
                pass

            for idx in ym_indices:
                row = df.loc[idx]
                r_date = row["date"]
                r_lat = row["lat"]
                r_lon = row["lon"]

                if r_lat < -80.0 or r_lat > -42.0:
                    continue

                t_diffs = np.abs((time_arr - r_date).total_seconds())
                t_min_idx = int(np.argmin(t_diffs))
                if t_diffs[t_min_idx] > 6.0 * 3600.0:
                    continue

                i_lat = int(np.clip(np.round((lat_start - r_lat) / dlat), 0, n_lats - 1))
                i_lon = int(np.clip(np.round((r_lon - lon_start) / dlon), 0, n_lons - 1))

                u10 = float(u10_vals[t_min_idx, i_lat, i_lon])
                v10 = float(v10_vals[t_min_idx, i_lat, i_lon])
                msl = float(msl_vals[t_min_idx, i_lat, i_lon])

                if not np.isnan(u10) and not np.isnan(v10):
                    df.at[idx, "era5_u10_ms"] = u10
                    df.at[idx, "era5_v10_ms"] = v10
                    df.at[idx, "era5_msl_pa"] = msl
                    df.at[idx, "era5_available"] = 1

                if swh_vals is not None:
                    iw_lat = int(np.clip(np.round((w_lat_start - r_lat) / w_dlat), 0, n_w_lats - 1))
                    iw_lon = int(np.clip(np.round((r_lon - w_lon_start) / w_dlon), 0, n_w_lons - 1))
                    swh = float(swh_vals[t_min_idx, iw_lat, iw_lon])
                    if not np.isnan(swh):
                        df.at[idx, "era5_swh_m"] = swh

            ds_surf.close()
            if ds_wave is not None:
                ds_wave.close()

        except Exception as e:
            logger.error(f"Error reading {grib_name}: {e}")

    df = df.drop(columns=["_ym"])

    valid_wind = (df["era5_available"] == 1)
    df["era5_wind_speed_ms"] = np.where(
        valid_wind,
        np.sqrt(df["era5_u10_ms"]**2 + df["era5_v10_ms"]**2),
        np.nan
    )
    df["era5_wind_dir_deg"] = np.where(
        valid_wind,
        (np.degrees(np.arctan2(-df["era5_u10_ms"], -df["era5_v10_ms"])) + 360.0) % 360.0,
        np.nan
    )

    avail_count = df["era5_available"].sum()
    logger.info(f"ERA5 matched: {avail_count:,} available ({avail_count / len(df)*100:.1f}%), {len(df) - avail_count:,} missing")
    return df


# ==============================================================================
# 4. SEA ICE CONCENTRATION MATCHING
# ==============================================================================
def match_sea_ice(df):
    logger.info("--- Matching Pillar: Sea Ice Concentration ---")
    si_dir = DATASET_DIR / "SIH" / "DATA_Sea_ice_drift_concentration"
    sh_files = sorted(si_dir.glob("*_sh_*.nc"))
    logger.info(f"Found {len(sh_files):,} Southern Hemisphere sea ice files.")

    date_to_file = {}
    for f in sh_files:
        stem = f.name
        idx_date = stem.rfind("202")
        if idx_date != -1:
            dt_str = stem[idx_date:idx_date+8]
            if len(dt_str) == 8 and dt_str.isdigit():
                date_to_file[dt_str] = f

    logger.info(f"Indexed {len(date_to_file):,} distinct sea ice daily dates.")

    # Snyder Polar Stereographic projection parameters
    a = 6378273.0
    b = 6356889.44891
    e = np.sqrt(1.0 - (b/a)**2)
    lat_ts = np.radians(70.0)
    m_ts = np.cos(lat_ts) / np.sqrt(1.0 - (e*np.sin(lat_ts))**2)
    t_ts = np.tan(np.pi/4.0 - lat_ts/2.0) / (((1.0 - e*np.sin(lat_ts)) / (1.0 + e*np.sin(lat_ts)))**(e/2.0))

    def latlon_to_xy(lat_deg, lon_deg):
        phi = np.radians(np.abs(lat_deg))
        lam = np.radians(lon_deg)
        t = np.tan(np.pi/4.0 - phi/2.0) / (((1.0 - e*np.sin(phi)) / (1.0 + e*np.sin(phi)))**(e/2.0))
        rho = a * m_ts * t / t_ts
        x = rho * np.sin(lam) / 1000.0
        y = rho * np.cos(lam) / 1000.0
        return x, y

    si_cols = ["seaice_conc", "seaice_raw_conc", "seaice_uncertainty", "seaice_status_flag"]
    for c in si_cols:
        df[c] = np.nan
    df["seaice_available"] = 0

    df["_date_str"] = df["date"].dt.strftime("%Y%m%d")
    unique_dates = df["_date_str"].unique()

    xc_start = -3950.0
    d_xc = 10.0
    yc_start = 4340.0
    d_yc = -10.0
    n_xc = 790
    n_yc = 830

    matched_count = 0
    for d_str in unique_dates:
        fpath = date_to_file.get(d_str)
        if fpath is None:
            continue

        d_indices = df[df["_date_str"] == d_str].index
        try:
            ds = nc.Dataset(fpath)
            c_var = ds.variables["ice_conc"]
            raw_var = ds.variables.get("raw_ice_conc_values")
            unc_var = ds.variables.get("total_uncertainty")
            flg_var = ds.variables.get("status_flag")

            for idx in d_indices:
                r_lat = df.at[idx, "lat"]
                r_lon = df.at[idx, "lon"]

                gx, gy = latlon_to_xy(r_lat, r_lon)
                ix = int(np.clip(np.round((gx - xc_start) / d_xc), 0, n_xc - 1))
                iy = int(np.clip(np.round((gy - yc_start) / d_yc), 0, n_yc - 1))

                c_val = safe_float(c_var[0, iy, ix])
                if not np.isnan(c_val):
                    df.at[idx, "seaice_conc"] = c_val
                    df.at[idx, "seaice_available"] = 1
                    matched_count += 1
                    if raw_var is not None:
                        df.at[idx, "seaice_raw_conc"] = safe_float(raw_var[0, iy, ix])
                    if unc_var is not None:
                        df.at[idx, "seaice_uncertainty"] = safe_float(unc_var[0, iy, ix])
                    if flg_var is not None:
                        df.at[idx, "seaice_status_flag"] = safe_float(flg_var[0, iy, ix])

            ds.close()
        except Exception as e:
            logger.error(f"Error reading sea ice {fpath.name}: {e}")

    df = df.drop(columns=["_date_str"])
    avail_count = df["seaice_available"].sum()
    logger.info(f"Sea ice matched: {avail_count:,} available ({avail_count / len(df)*100:.1f}%), {len(df) - avail_count:,} missing")
    return df


# ==============================================================================
# 5. PHYSICAL DERIVED FEATURES & VECTORS
# ==============================================================================
def add_physical_features(df):
    logger.info("--- Computing Physical Derived Features & Vectors ---")

    df["current_north_ms"] = df["glorys_vo_ms"]
    df["current_east_ms"] = df["glorys_uo_ms"]
    df["current_speed_ms"] = df["glorys_current_speed_ms"]
    df["current_direction_deg"] = df["glorys_current_dir_deg"]

    df["wind_north_ms"] = df["era5_v10_ms"]
    df["wind_east_ms"] = df["era5_u10_ms"]
    df["wind_speed_ms"] = df["era5_wind_speed_ms"]
    df["wind_direction_deg"] = df["era5_wind_dir_deg"]

    both_valid = (df["wind_direction_deg"].notna()) & (df["current_direction_deg"].notna())
    df["wind_relative_to_current_deg"] = np.where(
        both_valid,
        (df["wind_direction_deg"] - df["current_direction_deg"] + 360.0) % 360.0,
        np.nan
    )

    has_prev = df["previous_lat"].notna() & (df["dt_days"] > 0)
    dt_sec = df["dt_days"] * 86400.0
    lat_rad = np.radians(df["lat"])

    df["iceberg_motion_north_ms"] = np.where(
        has_prev,
        (df["delta_lat"] * 111139.0) / dt_sec,
        np.nan
    )
    df["iceberg_motion_east_ms"] = np.where(
        has_prev,
        (df["delta_lon"] * 111139.0 * np.cos(lat_rad)) / dt_sec,
        np.nan
    )

    g_av = df["glorys_available"].astype(int)
    e_av = df["era5_available"].astype(int)
    s_av = df["seaice_available"].astype(int)
    b_av = df["gebco_available"].astype(int)

    df["all_environment_available"] = ((g_av == 1) & (e_av == 1) & (s_av == 1) & (b_av == 1)).astype(int)
    df["environment_missing_count"] = 4 - (g_av + e_av + s_av + b_av)
    df["environment_missing_fraction"] = df["environment_missing_count"] / 4.0

    all_av = df["all_environment_available"].sum()
    logger.info(f"All 4 environmental pillars complete: {all_av:,} / {len(df):,} ({all_av / len(df)*100:.1f}%)")
    return df


# ==============================================================================
# 6. TARGET CONSTRUCTION (STRICT LEAK-FREE NEXT DISPLACEMENT)
# ==============================================================================
def construct_targets(df):
    logger.info("--- Constructing Strictly Leak-Free Prediction Targets ---")

    df = df.sort_values(["iceberg_id", "date"]).reset_index(drop=True)

    g = df.groupby("iceberg_id")
    target_lat = g["lat"].shift(-1)
    target_lon = g["lon"].shift(-1)
    target_date = g["date"].shift(-1)

    df["target_lat"] = target_lat
    df["target_lon"] = target_lon
    
    df["target_delta_lat"] = target_lat - df["lat"]
    dlon = target_lon - df["lon"]
    df["target_delta_lon"] = (dlon + 180.0) % 360.0 - 180.0

    lat_rad = np.radians(df["lat"])
    df["target_north_displacement_m"] = df["target_delta_lat"] * 111139.0
    df["target_east_displacement_m"] = df["target_delta_lon"] * 111139.0 * np.cos(lat_rad)

    target_sec = (target_date - df["date"]).dt.total_seconds()
    df["target_dt_days"] = target_sec / 86400.0

    has_target = df["target_lat"].notna()
    logger.info(f"Target assignments: {has_target.sum():,} observations have future target ({len(df) - has_target.sum():,} terminal iceberg observations without target)")
    return df


# ==============================================================================
# MAIN PIPELINE
# ==============================================================================
def main():
    logger.info("=" * 78)
    logger.info("  03_MATCH_ENVIRONMENT: MASTER ENVIRONMENTAL MATCHING PIPELINE")
    logger.info(f"  Project Root: {PROJECT_ROOT}")
    logger.info("=" * 78)

    logger.info(f"Loading cleaned Golden Window tracks: {TRACKS_GOLDEN_PARQUET}")
    df = pd.read_parquet(TRACKS_GOLDEN_PARQUET)
    logger.info(f"Loaded {len(df):,} observations across {df['iceberg_id'].nunique()} icebergs.")

    df = match_gebco(df)
    df = match_glorys(df)
    df = match_era5(df)
    df = match_sea_ice(df)
    df = add_physical_features(df)
    df = construct_targets(df)

    logger.info(f"\nSaving Master Environment Dataset to: {MATCHED_OUTPUT_PARQUET}")
    df.to_parquet(MATCHED_OUTPUT_PARQUET, index=False)
    file_size_mb = MATCHED_OUTPUT_PARQUET.stat().st_size / (1024 * 1024)
    logger.info(f"Saved successfully: {file_size_mb:.2f} MB")
    logger.info("=" * 78)


if __name__ == "__main__":
    main()
