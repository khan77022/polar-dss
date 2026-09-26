"""
match_env.py
================================================================================
Environmental Data Matching Pipeline for Iceberg Observations
================================================================================
Matches cleaned iceberg observations with:
  1. GLORYS Ocean Currents & Physics:
     - uo: Eastward velocity (m/s)
     - vo: Northward velocity (m/s)
     - current_speed: Total ocean current speed (m/s)
     - current_dir: Ocean current direction (degrees)
     - so: Sea surface salinity (psu / 1e-3)
     - bottomT: Seafloor potential temperature (°C)
  2. Sea Ice Concentration (OSI-SAF SSMIS / AMSR2):
     - seaice_conc: Daily sea-ice concentration (%)
  3. Wind (ERA5 10m surface winds):
     - u10: Eastward 10m wind (m/s)
     - v10: Northward 10m wind (m/s)
     - wind_speed: Total wind speed (m/s)
     - wind_dir: Wind direction (degrees)
  4. Bathymetry (GEBCO 2024):
     - ocean_depth_m: Seafloor elevation/depth (m, negative below sea level)

Output:
  dataSet/iceberg_env_matched_2024.parquet
  dataSet/iceberg_env_matched_2024.csv
"""

import os
import zipfile
import pandas as pd
import numpy as np
import xarray as xr
import netCDF4 as nc

DATASET_DIR   = os.path.join(os.path.dirname(__file__), "dataSet")
PARQUET_TRACKS = os.path.join(DATASET_DIR, "iceberg_tracks_clean.parquet")
GEBCO_FILE    = os.path.join(DATASET_DIR, "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc")
OUT_PARQUET   = os.path.join(DATASET_DIR, "iceberg_env_matched_2024.parquet")
OUT_CSV       = os.path.join(DATASET_DIR, "iceberg_env_matched_2024.csv")

ZIPS = sorted([
    os.path.join(DATASET_DIR, f)
    for f in os.listdir(DATASET_DIR)
    if f.endswith(".zip") and f.startswith("raw-")
])


def load_2024_tracks():
    print("Loading clean iceberg tracks...")
    df = pd.read_parquet(PARQUET_TRACKS)
    # Subset to 2024 where GLORYS ocean reanalysis is complete
    df_2024 = df[(df["date"] >= "2024-01-01") & (df["date"] <= "2024-12-31")].copy()
    df_2024["date_str"] = df_2024["date"].dt.strftime("%Y-%m-%d")
    df_2024 = df_2024.sort_values(["iceberg_id", "date"]).reset_index(drop=True)
    print(f"  Total 2024 observations: {len(df_2024):,} across {df_2024['iceberg_id'].nunique()} icebergs")
    return df_2024


# ──────────────────────────────────────────────────────────────
# STEP 1: GLORYS MATCHING
# ──────────────────────────────────────────────────────────────
def match_glorys(df: pd.DataFrame) -> pd.DataFrame:
    print("\n--- 1. Matching GLORYS Ocean Physics ---")
    # Initialize columns
    df["glorys_uo_ms"] = np.nan
    df["glorys_vo_ms"] = np.nan
    df["glorys_so"] = np.nan
    df["glorys_bottomT"] = np.nan

    tmp_nc = os.path.join(DATASET_DIR, "_tmp_glorys_match.nc")

    for zp in ZIPS:
        with zipfile.ZipFile(zp) as zf:
            glorys_entries = [n for n in zf.namelist() if "raw/glorys/" in n and n.endswith(".nc")]
            for nc_name in sorted(glorys_entries):
                # Extract temporary file
                with open(tmp_nc, "wb") as f:
                    f.write(zf.read(nc_name))
                
                try:
                    with xr.open_dataset(tmp_nc, engine="netcdf4") as ds:
                        t_coords = pd.to_datetime(ds["time"].values)
                        t_min_str = t_coords.min().strftime("%Y-%m-%d")
                        t_max_str = t_coords.max().strftime("%Y-%m-%d")

                        # Find matching rows in df
                        mask = (df["date_str"] >= t_min_str) & (df["date_str"] <= t_max_str)
                        sub_indices = df[mask].index

                        if len(sub_indices) == 0:
                            continue

                        print(f"  Processing {os.path.basename(nc_name)}: {t_min_str} -> {t_max_str} ({len(sub_indices)} points)...")

                        lat_coords = ds["latitude"].values
                        lon_coords = ds["longitude"].values
                        date_to_tidx = {t.strftime("%Y-%m-%d"): i for i, t in enumerate(t_coords)}

                        uo_arr = ds["uo"].values  # shape: (T, 1, Lat, Lon)
                        vo_arr = ds["vo"].values
                        so_arr = ds["so"].values
                        bt_arr = ds["bottomT"].values  # shape: (T, Lat, Lon)

                        for idx in sub_indices:
                            row = df.loc[idx]
                            t_idx = date_to_tidx.get(row["date_str"])
                            if t_idx is None:
                                continue

                            # Nearest neighbor index on rectilinear grid
                            lat_idx = int(np.argmin(np.abs(lat_coords - row["lat"])))
                            lon_idx = int(np.argmin(np.abs(lon_coords - row["lon"])))

                            uo_val = float(uo_arr[t_idx, 0, lat_idx, lon_idx])
                            vo_val = float(vo_arr[t_idx, 0, lat_idx, lon_idx])
                            so_val = float(so_arr[t_idx, 0, lat_idx, lon_idx])
                            bt_val = float(bt_arr[t_idx, lat_idx, lon_idx])

                            df.at[idx, "glorys_uo_ms"] = round(uo_val, 4) if not np.isnan(uo_val) else np.nan
                            df.at[idx, "glorys_vo_ms"] = round(vo_val, 4) if not np.isnan(vo_val) else np.nan
                            df.at[idx, "glorys_so"] = round(so_val, 3) if not np.isnan(so_val) else np.nan
                            df.at[idx, "glorys_bottomT"] = round(bt_val, 3) if not np.isnan(bt_val) else np.nan

                finally:
                    if os.path.exists(tmp_nc):
                        try:
                            os.remove(tmp_nc)
                        except Exception:
                            pass

    # Compute total current speed and bearing
    uo = df["glorys_uo_ms"]
    vo = df["glorys_vo_ms"]
    df["glorys_current_speed_ms"] = np.round(np.sqrt(uo**2 + vo**2), 4)
    # Meteorological / oceanographic direction in degrees (towards which current flows)
    df["glorys_current_dir"] = np.round((np.degrees(np.arctan2(uo, vo)) + 360) % 360, 2)
    matched_count = df["glorys_uo_ms"].notna().sum()
    print(f"  GLORYS matching complete: {matched_count:,} / {len(df):,} ({matched_count/len(df)*100:.1f}%) points matched")
    return df


# ──────────────────────────────────────────────────────────────
# STEP 2: SEA ICE MATCHING
# ──────────────────────────────────────────────────────────────
def match_seaice(df: pd.DataFrame) -> pd.DataFrame:
    print("\n--- 2. Matching Sea Ice Concentration ---")
    df["seaice_conc_pct"] = np.nan
    tmp_nc = os.path.join(DATASET_DIR, "_tmp_seaice_match.nc")

    for zp in ZIPS:
        with zipfile.ZipFile(zp) as zf:
            sic_entries = [n for n in zf.namelist() if "raw/seaice/" in n and n.endswith(".nc")]
            for nc_name in sorted(sic_entries):
                # We prioritize AMSR2 or SSMIS
                with open(tmp_nc, "wb") as f:
                    f.write(zf.read(nc_name))
                
                try:
                    with xr.open_dataset(tmp_nc, engine="netcdf4") as ds:
                        t_coords = pd.to_datetime(ds["time"].values)
                        t_min_str = t_coords.min().strftime("%Y-%m-%d")
                        t_max_str = t_coords.max().strftime("%Y-%m-%d")

                        # Only update rows that don't already have sea ice concentration
                        mask = (df["date_str"] >= t_min_str) & (df["date_str"] <= t_max_str) & (df["seaice_conc_pct"].isna())
                        sub_indices = df[mask].index

                        if len(sub_indices) == 0:
                            continue

                        print(f"  Processing {os.path.basename(nc_name)}: {t_min_str} -> {t_max_str} ({len(sub_indices)} points)...")

                        lat_coords = ds["latitude"].values
                        lon_coords = ds["longitude"].values
                        date_to_tidx = {t.strftime("%Y-%m-%d"): i for i, t in enumerate(t_coords)}

                        sic_var_name = "raw_ice_conc_values" if "raw_ice_conc_values" in ds else list(ds.data_vars.keys())[0]
                        sic_arr = ds[sic_var_name].values

                        for idx in sub_indices:
                            row = df.loc[idx]
                            t_idx = date_to_tidx.get(row["date_str"])
                            if t_idx is None:
                                continue

                            lat_idx = int(np.argmin(np.abs(lat_coords - row["lat"])))
                            lon_idx = int(np.argmin(np.abs(lon_coords - row["lon"])))

                            sic_val = float(sic_arr[t_idx, lat_idx, lon_idx])
                            if not np.isnan(sic_val):
                                # Clip negative noise and values above 100
                                df.at[idx, "seaice_conc_pct"] = round(float(np.clip(sic_val, 0.0, 100.0)), 2)

                finally:
                    if os.path.exists(tmp_nc):
                        try:
                            os.remove(tmp_nc)
                        except Exception:
                            pass

    matched_count = df["seaice_conc_pct"].notna().sum()
    print(f"  Sea Ice matching complete: {matched_count:,} / {len(df):,} ({matched_count/len(df)*100:.1f}%) points matched")
    return df


# ──────────────────────────────────────────────────────────────
# STEP 3: WIND MATCHING (GRIB)
# ──────────────────────────────────────────────────────────────
def match_wind(df: pd.DataFrame) -> pd.DataFrame:
    print("\n--- 3. Matching Wind Data ---")
    df["wind_u10_ms"] = np.nan
    df["wind_v10_ms"] = np.nan
    df["wind_speed_ms"] = np.nan
    df["wind_dir"] = np.nan

    tmp_grib = os.path.join(DATASET_DIR, "_tmp_wind_match.grib")

    for zp in ZIPS:
        with zipfile.ZipFile(zp) as zf:
            grib_entries = [n for n in zf.namelist() if n.endswith(".grib")]
            for grib_name in grib_entries:
                with open(tmp_grib, "wb") as f:
                    f.write(zf.read(grib_name))
                
                try:
                    import cfgrib
                    dss = cfgrib.open_datasets(tmp_grib)
                    for ds in dss:
                        if "u10" in ds and "v10" in ds:
                            t_coords = pd.to_datetime(ds["time"].values)
                            # Daily mean of u10 and v10 over available hours
                            u10_mean = ds["u10"].mean(dim="time").values
                            v10_mean = ds["v10"].mean(dim="time").values
                            lat_coords = ds["latitude"].values
                            lon_coords = ds["longitude"].values

                            target_date = t_coords[0].strftime("%Y-%m-%d")
                            sub_indices = df[df["date_str"] == target_date].index
                            print(f"  Matching wind for date {target_date}: {len(sub_indices)} points...")

                            for idx in sub_indices:
                                row = df.loc[idx]
                                lat_idx = int(np.argmin(np.abs(lat_coords - row["lat"])))
                                lon_idx = int(np.argmin(np.abs(lon_coords - row["lon"])))

                                u10_val = float(u10_mean[lat_idx, lon_idx])
                                v10_val = float(v10_mean[lat_idx, lon_idx])

                                df.at[idx, "wind_u10_ms"] = round(u10_val, 4)
                                df.at[idx, "wind_v10_ms"] = round(v10_val, 4)
                                df.at[idx, "wind_speed_ms"] = round(float(np.sqrt(u10_val**2 + v10_val**2)), 4)
                                df.at[idx, "wind_dir"] = round(float((np.degrees(np.arctan2(u10_val, v10_val)) + 360) % 360), 2)
                        ds.close()
                except Exception as e:
                    print(f"  Wind matching error: {e}")
                finally:
                    if os.path.exists(tmp_grib):
                        try:
                            os.remove(tmp_grib)
                        except Exception:
                            pass

    matched_count = df["wind_u10_ms"].notna().sum()
    print(f"  Wind matching complete: {matched_count:,} points matched")
    return df


# ──────────────────────────────────────────────────────────────
# STEP 4: BATHYMETRY MATCHING (GEBCO)
# ──────────────────────────────────────────────────────────────
def match_gebco(df: pd.DataFrame) -> pd.DataFrame:
    print("\n--- 4. Matching GEBCO 2024 Bathymetry ---")
    df["ocean_depth_m"] = np.nan

    if not os.path.exists(GEBCO_FILE):
        print(f"  GEBCO file not found at {GEBCO_FILE}")
        return df

    ds_gebco = nc.Dataset(GEBCO_FILE)
    lat_arr = ds_gebco.variables["lat"][:]
    lon_arr = ds_gebco.variables["lon"][:]
    elev_var = ds_gebco.variables["elevation"]

    lat_min = float(lat_arr[0])
    lat_max = float(lat_arr[-1])
    lat_step = float(lat_arr[1] - lat_arr[0])

    lon_min = float(lon_arr[0])
    lon_step = float(lon_arr[1] - lon_arr[0])
    n_lons = len(lon_arr)
    n_lats = len(lat_arr)

    # Filter rows inside GEBCO bounds
    in_bounds = (df["lat"] >= min(lat_min, lat_max)) & (df["lat"] <= max(lat_min, lat_max))
    sub_indices = df[in_bounds].index
    print(f"  Extracting bathymetry for {len(sub_indices):,} points within GEBCO bounds...")

    lat_indices = np.clip(np.round((df.loc[sub_indices, "lat"].values - lat_min) / lat_step).astype(int), 0, n_lats - 1)
    lon_indices = np.clip(np.round((df.loc[sub_indices, "lon"].values - lon_min) / lon_step).astype(int), 0, n_lons - 1)

    depth_values = []
    for li, lj in zip(lat_indices, lon_indices):
        depth_values.append(float(elev_var[li, lj]))

    df.loc[sub_indices, "ocean_depth_m"] = depth_values
    ds_gebco.close()

    matched_count = df["ocean_depth_m"].notna().sum()
    print(f"  GEBCO bathymetry matching complete: {matched_count:,} / {len(df):,} ({matched_count/len(df)*100:.1f}%) points matched")
    return df


# ──────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ──────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("ENVIRONMENTAL DATA MATCHING PIPELINE (2024 BENCHMARK)")
    print("=" * 70)

    df = load_2024_tracks()
    df = match_glorys(df)
    df = match_seaice(df)
    df = match_wind(df)
    df = match_gebco(df)

    # Clean temporary helper columns
    df = df.drop(columns=["date_str"])

    print("\n" + "=" * 70)
    print("FINAL SUMMARY OF MATCHED DATASET")
    print("=" * 70)
    print(f"Total Rows: {len(df):,}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nMissing value profile:")
    print(df.isna().sum())

    print(f"\nSaving matched dataset to:")
    print(f"  Parquet: {OUT_PARQUET}")
    df.to_parquet(OUT_PARQUET, index=False)
    print(f"  CSV:     {OUT_CSV}")
    df.to_csv(OUT_CSV, index=False)

    print("\nSample Preview (First 5 Rows):")
    print(df.head().to_string())

    print("\nSample Preview (Rows with ocean currents & depth):")
    valid_sample = df[df["glorys_uo_ms"].notna() & df["ocean_depth_m"].notna()].head(5)
    print(valid_sample[["iceberg_id", "date", "lat", "lon", "speed_kmday", "glorys_current_speed_ms", "seaice_conc_pct", "ocean_depth_m"]].to_string())

    print("\n[SUCCESS] Environmental Matching Pipeline finished successfully!")


if __name__ == "__main__":
    main()
