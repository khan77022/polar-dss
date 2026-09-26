"""
scripts/reextract_env_v2.py
================================================================================
SIH2659 Environmental Extraction v2 - Bug-fixed version of 03_match_environment.py

FIX 1 - ERA5 era5_mwd_deg 100% NaN:
    v1 opened wave GRIB with filter_by_keys={"shortName":"swh"}, which only
    exposes the swh variable. mwd was never read. v2 uses cfgrib.open_datasets()
    to get the sub-dataset that contains BOTH swh and mwd.

FIX 2 - ERA5 era5_swh_m 84.5% NaN:
    v1 indexed swh_vals with t_min_idx from the SURFACE dataset's time array.
    The wave sub-dataset has its own, independent time coordinate. v2 computes
    t_wave_idx from the wave dataset's time array independently.

FIX 3 - Sea ice seaice_conc 29.8% NaN:
    v1 built date_to_file by iterating sorted(glob("*_sh_*.nc")). Because
    "*_multi_*" sorts after "*_amsr2_*", multi files silently overwrote amsr2
    files for the same date. Multi composites mask peripheral pixels that amsr2
    resolves. v2 explicitly prefers amsr2 > multi > other. Also skips
    "(1).nc" duplicate downloads.

FIX 4 - GLORYS 10.4% NaN (coastal land masking):
    v1 discarded obs where the nearest grid cell was NaN (ocean model land mask).
    v2 tries a radial spiral of up to 3 cells to find the nearest valid ocean cell.

FIX 5 - GEBCO path:
    v1 read from dataSet/gebco_2024...nc (root, now cleaned). v2 reads from
    canonical 05_bathymetry/ path.

Output:  dataSet/06_processed/iceberg_env_matched_v2.parquet
Frozen:  iceberg_env_matched_2023_2026.parquet / iceberg_model_ready_v1.parquet
         train.parquet / validation.parquet / test.parquet  (ALL UNTOUCHED)
"""

from pathlib import Path
import sys, logging, warnings
import numpy as np
import pandas as pd
import xarray as xr
import netCDF4 as nc
import cfgrib

warnings.filterwarnings("ignore")

PROJECT_ROOT  = Path(r"D:\SIH\IceBerg").resolve()
DATASET_DIR   = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_DIR / "06_processed"
LOGS_DIR      = PROCESSED_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

TRACKS_GOLDEN     = PROCESSED_DIR / "iceberg_tracks_golden_2023_2026.parquet"
OUTPUT_V2_PARQUET = PROCESSED_DIR / "iceberg_env_matched_v2.parquet"
LOG_FILE          = LOGS_DIR / "reextract_v2.log"

# Canonical organised paths (never the old unorganised root aliases)
GEBCO_PATH    = DATASET_DIR / "05_bathymetry" / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
GLORYS_BASE   = DATASET_DIR / "02_ocean" / "GLORYS12"
ERA5_DIR      = DATASET_DIR / "03_atmosphere" / "ERA5"
ERA5_2026_DIR = DATASET_DIR / "03_atmosphere" / "ERA5_2026"
SEAICE_DIR    = DATASET_DIR / "04_seaice" / "OSI_SAF_AMSR2"

logger = logging.getLogger("reextract_v2")
logger.setLevel(logging.INFO)
logger.handlers.clear()
fh = logging.FileHandler(LOG_FILE, mode="w", encoding="utf-8")
fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(fh)
sh = logging.StreamHandler(sys.stdout)
sh.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(sh)


def safe_float(val):
    if val is None:
        return np.nan
    try:
        if np.ma.is_masked(val):
            return np.nan
    except Exception:
        pass
    try:
        f = float(val)
        return np.nan if np.isnan(f) else f
    except Exception:
        return np.nan


# =============================================================================
# 1. GEBCO
# =============================================================================
def match_gebco(df):
    logger.info("[1] GEBCO 2024 Bathymetry")
    if not GEBCO_PATH.exists():
        logger.error(f"  GEBCO not found: {GEBCO_PATH}")
        df["ocean_depth_m"] = np.nan
        df["gebco_available"] = 0
        return df

    logger.info(f"  Opening: {GEBCO_PATH}")
    ds = nc.Dataset(GEBCO_PATH)
    elev_var = ds.variables["elevation"]
    lat_min = -74.99791667
    lon_min = -179.99791667
    dlat = 1.0 / 240.0
    dlon = 1.0 / 240.0
    n_lat, n_lon = elev_var.shape

    lats = df["lat"].values
    lons = df["lon"].values
    valid = (lats >= -75.0) & (lats <= -60.0) & (lons >= -180.0) & (lons <= 180.0)
    logger.info(f"  In GEBCO bounds [-75 to -60 deg]: {valid.sum():,}/{len(df):,} ({valid.mean()*100:.1f}%)")

    ocean_depth = np.full(len(df), np.nan, dtype=np.float32)
    gebco_avail = np.zeros(len(df), dtype=np.int8)
    i_lat = np.clip(np.round((lats[valid] - lat_min) / dlat).astype(int), 0, n_lat - 1)
    i_lon = np.clip(np.round((lons[valid] - lon_min) / dlon).astype(int), 0, n_lon - 1)
    elev_data = elev_var[:]
    ocean_depth[valid] = elev_data[i_lat, i_lon]
    gebco_avail[valid] = 1
    df["ocean_depth_m"] = ocean_depth
    df["gebco_available"] = gebco_avail
    ds.close()
    n = int(gebco_avail.sum())
    logger.info(f"  Matched: {n:,} ({n/len(df)*100:.1f}%)")
    return df


# =============================================================================
# 2. GLORYS with nearest-ocean fallback (FIX 4)
# =============================================================================
def match_glorys(df):
    logger.info("[2] GLORYS Ocean Reanalysis (nearest-ocean fallback up to 3 cells)")
    sectors = {
        "sector_-90_-180": (-180.0, -90.0),
        "sector_-90_0":    (-90.0,   0.0),
        "sector_0_90":     (  0.0,  90.0),
        "sector_90_180":   ( 90.0, 180.0),
    }
    gcols = ["glorys_uo_ms","glorys_vo_ms","glorys_thetao",
             "glorys_so","glorys_zos","glorys_mlotst","glorys_sithick"]
    for c in gcols:
        df[c] = np.nan
    df["glorys_available"] = 0

    d_start = pd.Timestamp("2023-03-23")
    RADIUS  = 3

    for sec, (lo_min, lo_max) in sectors.items():
        sec_dir  = GLORYS_BASE / sec
        nc_files = list(sec_dir.glob("*.nc"))
        if not nc_files:
            logger.warning(f"  No NC in {sec_dir}")
            continue
        nc_path = nc_files[0]
        logger.info(f"  {sec}: {nc_path.name}")

        ds       = nc.Dataset(nc_path)
        lat_arr  = ds.variables["latitude"][:]
        lon_arr  = ds.variables["longitude"][:]
        n_times  = len(ds.variables["time"])
        lat_min_g = float(lat_arr.min())
        lon_min_g = float(lon_arr.min())
        dlat = float(np.abs(np.diff(lat_arr[:5]).mean()))
        dlon = float(np.abs(np.diff(lon_arr[:5]).mean()))
        n_lat = len(lat_arr)
        n_lon = len(lon_arr)
        lat_max_g = float(lat_arr.max())

        if lo_max == 180.0:
            mask = (df["lon"] >= lo_min) & (df["lon"] <= lo_max)
        else:
            mask = (df["lon"] >= lo_min) & (df["lon"] <  lo_max)
        mask &= (df["lat"] >= lat_min_g) & (df["lat"] <= lat_max_g)
        idxs = df[mask].index
        logger.info(f"    {len(idxs):,} obs in sector")

        if len(idxs) == 0:
            ds.close()
            continue

        uo_v = ds.variables["uo"]
        vo_v = ds.variables["vo"]
        th_v = ds.variables["thetao"]
        so_v = ds.variables["so"]
        zo_v = ds.variables["zos"]
        ml_v = ds.variables["mlotst"]
        si_v = ds.variables["sithick"]
        fb = 0

        for idx in idxs:
            row   = df.loc[idx]
            t_idx = (row["date"] - d_start).days
            if t_idx < 0 or t_idx >= n_times:
                continue
            b_lat = int(np.clip(np.round((row["lat"] - lat_min_g) / dlat), 0, n_lat - 1))
            b_lon = int(np.clip(np.round((row["lon"] - lon_min_g) / dlon), 0, n_lon - 1))

            found = False
            for rad in range(RADIUS + 1):
                if found:
                    break
                if rad == 0:
                    candidates = [(b_lat, b_lon)]
                else:
                    ring = {
                        (b_lat + di, b_lon + dj)
                        for di in range(-rad, rad + 1)
                        for dj in range(-rad, rad + 1)
                        if max(abs(di), abs(dj)) == rad
                    }
                    candidates = [
                        (int(np.clip(r, 0, n_lat-1)), int(np.clip(c, 0, n_lon-1)))
                        for r, c in ring
                    ]
                for (il, ic) in candidates:
                    uo = safe_float(uo_v[t_idx, 0, il, ic])
                    vo = safe_float(vo_v[t_idx, 0, il, ic])
                    if not np.isnan(uo) and not np.isnan(vo):
                        df.at[idx, "glorys_uo_ms"]    = uo
                        df.at[idx, "glorys_vo_ms"]    = vo
                        df.at[idx, "glorys_thetao"]   = safe_float(th_v[t_idx, 0, il, ic])
                        df.at[idx, "glorys_so"]       = safe_float(so_v[t_idx, 0, il, ic])
                        df.at[idx, "glorys_zos"]      = safe_float(zo_v[t_idx, il, ic])
                        df.at[idx, "glorys_mlotst"]   = safe_float(ml_v[t_idx, il, ic])
                        df.at[idx, "glorys_sithick"]  = safe_float(si_v[t_idx, il, ic])
                        df.at[idx, "glorys_available"] = 1
                        if rad > 0:
                            fb += 1
                        found = True
                        break

        logger.info(f"    Coastal fallback cells used: {fb:,}")
        ds.close()

    vc = df["glorys_available"] == 1
    df["glorys_current_speed_ms"] = np.where(vc,
        np.sqrt(df["glorys_uo_ms"]**2 + df["glorys_vo_ms"]**2), np.nan)
    df["glorys_current_dir_deg"] = np.where(vc,
        (np.degrees(np.arctan2(df["glorys_uo_ms"], df["glorys_vo_ms"])) + 360) % 360, np.nan)
    n = int(df["glorys_available"].sum())
    logger.info(f"  Total GLORYS: {n:,}/{len(df):,} ({n/len(df)*100:.1f}%)")
    return df


# =============================================================================
# 3. ERA5 with mwd + wave time fix (FIX 1+2)
# =============================================================================
def match_era5(df):
    logger.info("[3] ERA5 Atmospheric & Wave (mwd fix + wave time index fix)")
    for c in ["era5_u10_ms","era5_v10_ms","era5_msl_pa","era5_swh_m","era5_mwd_deg"]:
        df[c] = np.nan
    df["era5_available"] = 0

    df["_ym"] = df["date"].dt.strftime("%Y_%m")
    for ym in sorted(df["_ym"].unique()):
        grib_name = f"era5_{ym}.grib"
        grib_path = ERA5_DIR / grib_name
        if not grib_path.exists():
            grib_path = ERA5_2026_DIR / grib_name
        if not grib_path.exists():
            logger.warning(f"  Missing: {grib_name}")
            continue

        ym_indices = df[df["_ym"] == ym].index
        logger.info(f"  [{ym}] {grib_path.name}: {len(ym_indices):,} obs")

        try:
            # Surface dataset
            ds_surf = xr.open_dataset(grib_path, engine="cfgrib",
                backend_kwargs={"filter_by_keys": {"typeOfLevel": "surface"}})
            lat_arr   = ds_surf["latitude"].values
            lon_arr   = ds_surf["longitude"].values
            time_surf = pd.to_datetime(ds_surf["time"].values)
            n_lats, n_lons = len(lat_arr), len(lon_arr)
            lat_start = float(lat_arr[0])
            dlat      = float(np.abs(np.diff(lat_arr[:5]).mean()))
            lon_start = float(lon_arr[0])
            dlon      = float(np.abs(np.diff(lon_arr[:5]).mean()))
            u10_vals  = ds_surf["u10"].values
            v10_vals  = ds_surf["v10"].values
            msl_vals  = ds_surf["msl"].values

            # Wave dataset — own time axis (FIX 1+2)
            swh_vals = mwd_vals = time_wave = None
            w_lat_start = w_dlat = w_lon_start = w_dlon = None
            n_w_lats = n_w_lons = 0
            try:
                all_ds = cfgrib.open_datasets(grib_path)
                for cand in all_ds:
                    if "swh" in cand.data_vars or "mwd" in cand.data_vars:
                        w_lat       = cand["latitude"].values
                        w_lon       = cand["longitude"].values
                        time_wave   = pd.to_datetime(cand["time"].values)
                        w_lat_start = float(w_lat[0])
                        w_dlat      = float(np.abs(np.diff(w_lat[:5]).mean()))
                        w_lon_start = float(w_lon[0])
                        w_dlon      = float(np.abs(np.diff(w_lon[:5]).mean()))
                        n_w_lats    = len(w_lat)
                        n_w_lons    = len(w_lon)
                        if "swh" in cand.data_vars:
                            swh_vals = cand["swh"].values
                        if "mwd" in cand.data_vars:
                            mwd_vals = cand["mwd"].values
                        logger.info(f"    Wave sub-dataset vars={list(cand.data_vars)} "
                                    f"swh_shape={swh_vals.shape if swh_vals is not None else None}")
                        break
            except Exception as ex:
                logger.warning(f"    Wave open failed: {ex}")

            for idx in ym_indices:
                row    = df.loc[idx]
                r_lat  = row["lat"]
                r_lon  = row["lon"]
                r_date = row["date"]
                if r_lat < -80.0 or r_lat > -42.0:
                    continue

                # Surface nearest-time
                td_s = np.abs((time_surf - r_date).total_seconds())
                ti_s = int(np.argmin(td_s))
                if td_s[ti_s] > 6 * 3600:
                    continue
                il = int(np.clip(np.round((lat_start - r_lat) / dlat), 0, n_lats - 1))
                ic = int(np.clip(np.round((r_lon - lon_start) / dlon), 0, n_lons - 1))
                u10 = float(u10_vals[ti_s, il, ic])
                v10 = float(v10_vals[ti_s, il, ic])
                if not np.isnan(u10) and not np.isnan(v10):
                    df.at[idx, "era5_u10_ms"]    = u10
                    df.at[idx, "era5_v10_ms"]    = v10
                    df.at[idx, "era5_msl_pa"]    = float(msl_vals[ti_s, il, ic])
                    df.at[idx, "era5_available"] = 1

                # Wave — independent time index (FIX 2)
                if time_wave is not None:
                    td_w = np.abs((time_wave - r_date).total_seconds())
                    ti_w = int(np.argmin(td_w))
                    if td_w[ti_w] <= 6 * 3600:
                        wl = int(np.clip(np.round((w_lat_start - r_lat) / w_dlat), 0, n_w_lats - 1))
                        wc = int(np.clip(np.round((r_lon - w_lon_start) / w_dlon), 0, n_w_lons - 1))
                        if swh_vals is not None:
                            s = float(swh_vals[ti_w, wl, wc])
                            if not np.isnan(s):
                                df.at[idx, "era5_swh_m"] = s
                        if mwd_vals is not None:  # FIX 1
                            m = float(mwd_vals[ti_w, wl, wc])
                            if not np.isnan(m):
                                df.at[idx, "era5_mwd_deg"] = m

            ds_surf.close()
        except Exception as ex:
            logger.error(f"  Error {grib_name}: {ex}")

    df = df.drop(columns=["_ym"])
    vw = df["era5_available"] == 1
    df["era5_wind_speed_ms"] = np.where(vw,
        np.sqrt(df["era5_u10_ms"]**2 + df["era5_v10_ms"]**2), np.nan)
    df["era5_wind_dir_deg"] = np.where(vw,
        (np.degrees(np.arctan2(-df["era5_u10_ms"], -df["era5_v10_ms"])) + 360) % 360, np.nan)
    n = int(df["era5_available"].sum())
    n_swh = int(df["era5_swh_m"].notna().sum())
    n_mwd = int(df["era5_mwd_deg"].notna().sum())
    logger.info(f"  ERA5: {n:,}/{len(df):,} ({n/len(df)*100:.1f}%)")
    logger.info(f"    swh matched: {n_swh:,} ({n_swh/len(df)*100:.1f}%)")
    logger.info(f"    mwd matched: {n_mwd:,} ({n_mwd/len(df)*100:.1f}%)")
    return df


# =============================================================================
# 4. Sea ice — AMSR2 priority, skip duplicate (1) files (FIX 3)
# =============================================================================
def match_sea_ice(df):
    logger.info("[4] Sea Ice Concentration (AMSR2 priority, skip (1) duplicates)")
    all_sh    = [f for f in SEAICE_DIR.glob("*_sh_*.nc")
                 if " (1)" not in f.name and "(1)" not in f.name]
    amsr2_fls = [f for f in all_sh if "_amsr2_" in f.name]
    multi_fls = [f for f in all_sh if "_multi_" in f.name]
    other_fls = [f for f in all_sh if "_amsr2_" not in f.name and "_multi_" not in f.name]
    logger.info(f"  amsr2={len(amsr2_fls)} multi={len(multi_fls)} other={len(other_fls)}")

    def get_date(fname):
        i = fname.rfind("202")
        if i < 0:
            return None
        s = fname[i:i+8]
        return s if len(s) == 8 and s.isdigit() else None

    d2f = {}
    for lst in [other_fls, multi_fls, amsr2_fls]:   # amsr2 last = highest priority
        for f in lst:
            ds_str = get_date(f.name)
            if ds_str:
                d2f[ds_str] = f
    logger.info(f"  Indexed {len(d2f):,} unique dates (AMSR2 preferred)")

    # Snyder polar stereographic (south)
    a    = 6378273.0
    b    = 6356889.44891
    e    = np.sqrt(1.0 - (b / a)**2)
    lt   = np.radians(70.0)
    m_ts = np.cos(lt) / np.sqrt(1.0 - (e * np.sin(lt))**2)
    t_ts = np.tan(np.pi / 4.0 - lt / 2.0) / (
        ((1.0 - e * np.sin(lt)) / (1.0 + e * np.sin(lt))) ** (e / 2.0)
    )

    def ll2xy(la, lo):
        ph  = np.radians(abs(la))
        lm  = np.radians(lo)
        t   = np.tan(np.pi / 4.0 - ph / 2.0) / (
            ((1.0 - e * np.sin(ph)) / (1.0 + e * np.sin(ph))) ** (e / 2.0)
        )
        rho = a * m_ts * t / t_ts
        return rho * np.sin(lm) / 1000.0, rho * np.cos(lm) / 1000.0

    for c in ["seaice_conc","seaice_raw_conc","seaice_uncertainty","seaice_status_flag"]:
        df[c] = np.nan
    df["seaice_available"] = 0

    df["_ds"] = df["date"].dt.strftime("%Y%m%d")
    xc0 = -3950.0; dxc =  10.0; nxc = 790
    yc0 =  4340.0; dyc = -10.0; nyc = 830

    for d_str in df["_ds"].unique():
        fp = d2f.get(d_str)
        if fp is None:
            continue
        didx = df[df["_ds"] == d_str].index
        try:
            ds  = nc.Dataset(fp)
            cv  = ds.variables["ice_conc"]
            rv  = ds.variables.get("raw_ice_conc_values")
            uv  = ds.variables.get("total_uncertainty")
            fv  = ds.variables.get("status_flag")
            for idx in didx:
                gx, gy = ll2xy(df.at[idx, "lat"], df.at[idx, "lon"])
                ix = int(np.clip(np.round((gx - xc0) / dxc), 0, nxc - 1))
                iy = int(np.clip(np.round((gy - yc0) / dyc), 0, nyc - 1))
                c_val = safe_float(cv[0, iy, ix])
                if not np.isnan(c_val):
                    df.at[idx, "seaice_conc"]      = c_val
                    df.at[idx, "seaice_available"]  = 1
                    if rv is not None:
                        df.at[idx, "seaice_raw_conc"]    = safe_float(rv[0, iy, ix])
                    if uv is not None:
                        df.at[idx, "seaice_uncertainty"] = safe_float(uv[0, iy, ix])
                    if fv is not None:
                        df.at[idx, "seaice_status_flag"] = safe_float(fv[0, iy, ix])
            ds.close()
        except Exception as ex:
            logger.error(f"  SeaIce error {fp.name}: {ex}")

    df = df.drop(columns=["_ds"])
    n = int(df["seaice_available"].sum())
    logger.info(f"  Sea ice: {n:,}/{len(df):,} ({n/len(df)*100:.1f}%)")
    return df


# =============================================================================
# 5. Derived features
# =============================================================================
def add_physical_features(df):
    logger.info("[5] Derived physical features")
    df["current_north_ms"]      = df["glorys_vo_ms"]
    df["current_east_ms"]       = df["glorys_uo_ms"]
    df["current_speed_ms"]      = df["glorys_current_speed_ms"]
    df["current_direction_deg"] = df["glorys_current_dir_deg"]
    df["wind_north_ms"]         = df["era5_v10_ms"]
    df["wind_east_ms"]          = df["era5_u10_ms"]
    df["wind_speed_ms"]         = df["era5_wind_speed_ms"]
    df["wind_direction_deg"]    = df["era5_wind_dir_deg"]

    bv = df["wind_direction_deg"].notna() & df["current_direction_deg"].notna()
    df["wind_relative_to_current_deg"] = np.where(
        bv, (df["wind_direction_deg"] - df["current_direction_deg"] + 360) % 360, np.nan)

    hp  = df["previous_lat"].notna() & (df["dt_days"] > 0)
    dts = df["dt_days"] * 86400.0
    lr  = np.radians(df["lat"])
    df["iceberg_motion_north_ms"] = np.where(hp, df["delta_lat"] * 111139.0 / dts, np.nan)
    df["iceberg_motion_east_ms"]  = np.where(hp, df["delta_lon"] * 111139.0 * np.cos(lr) / dts, np.nan)

    g = df["glorys_available"].astype(int)
    e = df["era5_available"].astype(int)
    s = df["seaice_available"].astype(int)
    b = df["gebco_available"].astype(int)
    df["all_environment_available"]    = ((g==1) & (e==1) & (s==1) & (b==1)).astype(int)
    df["environment_missing_count"]    = 4 - (g + e + s + b)
    df["environment_missing_fraction"] = df["environment_missing_count"] / 4.0

    n = int(df["all_environment_available"].sum())
    logger.info(f"  All 4 pillars: {n:,}/{len(df):,} ({n/len(df)*100:.1f}%)")
    return df


# =============================================================================
# 6. Targets
# =============================================================================
def construct_targets(df):
    logger.info("[6] Leak-free prediction targets")
    df = df.sort_values(["iceberg_id","date"]).reset_index(drop=True)
    g  = df.groupby("iceberg_id")
    tl = g["lat"].shift(-1)
    to = g["lon"].shift(-1)
    td = g["date"].shift(-1)
    df["target_lat"]  = tl
    df["target_lon"]  = to
    df["target_delta_lat"] = tl - df["lat"]
    dln = to - df["lon"]
    df["target_delta_lon"] = (dln + 180) % 360 - 180
    lr  = np.radians(df["lat"])
    df["target_north_displacement_m"] = df["target_delta_lat"] * 111139.0
    df["target_east_displacement_m"]  = df["target_delta_lon"] * 111139.0 * np.cos(lr)
    df["target_dt_days"] = (td - df["date"]).dt.total_seconds() / 86400.0
    ht = df["target_lat"].notna()
    logger.info(f"  With target: {ht.sum():,}, terminal: {(~ht).sum():,}")
    return df


# =============================================================================
# MAIN
# =============================================================================
def main():
    logger.info("=" * 70)
    logger.info("  SIH2659 REEXTRACT_ENV_V2 -- Corrected Environmental Extraction")
    logger.info("=" * 70)

    df = pd.read_parquet(TRACKS_GOLDEN)
    logger.info(f"Loaded: {len(df):,} obs across {df['iceberg_id'].nunique()} icebergs")
    logger.info(f"Dates:  {df['date'].min().date()} to {df['date'].max().date()}")

    df = match_gebco(df)
    df = match_glorys(df)
    df = match_era5(df)
    df = match_sea_ice(df)
    df = add_physical_features(df)
    df = construct_targets(df)

    logger.info("=" * 70)
    logger.info("NaN comparison v1 -> v2:")
    v1 = pd.read_parquet(PROCESSED_DIR / "iceberg_env_matched_2023_2026.parquet")
    for col in ["era5_swh_m","era5_mwd_deg","seaice_conc","glorys_uo_ms","ocean_depth_m"]:
        v1n = v1[col].isna().mean() * 100 if col in v1.columns else float("nan")
        v2n = df[col].isna().mean() * 100  if col in df.columns else float("nan")
        logger.info(f"  {col:30s}: v1={v1n:5.1f}%  v2={v2n:5.1f}%  delta={v1n-v2n:+.1f}%")

    logger.info(f"Saving: {OUTPUT_V2_PARQUET}")
    df.to_parquet(OUTPUT_V2_PARQUET, index=False)
    mb = OUTPUT_V2_PARQUET.stat().st_size / 1024 / 1024
    logger.info(f"Saved {mb:.2f} MB, {len(df):,} rows, {len(df.columns)} cols")
    logger.info("v1 files are UNTOUCHED and FROZEN.")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()