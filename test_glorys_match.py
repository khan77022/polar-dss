"""
test_glorys_match.py
Test extracting GLORYS ocean currents (uo, vo) and physics (bottomT, so)
for iceberg observations in 2024.
"""

import os
import zipfile
import pandas as pd
import numpy as np
import xarray as xr

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataSet")
PARQUET_FILE = os.path.join(DATASET_DIR, "iceberg_tracks_clean.parquet")

# 1. Load 2024 iceberg tracks
df = pd.read_parquet(PARQUET_FILE)
df_2024 = df[(df["date"] >= "2024-01-01") & (df["date"] <= "2024-12-31")].copy()
print(f"Total 2024 iceberg observations: {len(df_2024):,}")
print(df_2024.head())

# 2. Pick one GLORYS file from 002.zip (covers 2024-06-09 to 2024-07-10)
zip_path = os.path.join(DATASET_DIR, "raw-20260921T095550Z-1-002.zip")
nc_name = "raw/glorys/cmems_mod_glo_phy_my_0.083deg_P1D-m_1789836832635.nc"
tmp_file = os.path.join(DATASET_DIR, "_tmp_glorys_test.nc")

with zipfile.ZipFile(zip_path) as zf:
    with open(tmp_file, "wb") as f:
        f.write(zf.read(nc_name))

ds = xr.open_dataset(tmp_file, engine="netcdf4")
print("\nGLORYS Dataset Loaded:")
print(f"Time: {ds['time'].values.min()} to {ds['time'].values.max()}")
print(f"Lat: {float(ds['latitude'].min()):.2f} to {float(ds['latitude'].max()):.2f}")
print(f"Lon: {float(ds['longitude'].min()):.2f} to {float(ds['longitude'].max()):.2f}")

# Filter tracks within this file's time and spatial bounds
t_start = pd.to_datetime(ds["time"].values.min()).tz_localize(None)
t_end = pd.to_datetime(ds["time"].values.max()).tz_localize(None)
sub_tracks = df_2024[(df_2024["date"] >= t_start) & (df_2024["date"] <= t_end)].copy()
print(f"\nIceberg observations in this window: {len(sub_tracks):,}")

# Test nearest-neighbor extraction
lat_coords = ds["latitude"].values
lon_coords = ds["longitude"].values
time_coords = pd.to_datetime(ds["time"].values)

# Build date-to-time-index map
date_to_tidx = {pd.Timestamp(t).strftime("%Y-%m-%d"): i for i, t in enumerate(time_coords)}

# Sample 10 observations to demonstrate extraction
sample = sub_tracks.head(10).copy()

results = []
for idx, row in sample.iterrows():
    d_str = row["date"].strftime("%Y-%m-%d")
    t_idx = date_to_tidx.get(d_str)
    if t_idx is None:
        continue
    
    # Nearest lat/lon index
    lat_idx = int(np.argmin(np.abs(lat_coords - row["lat"])))
    lon_idx = int(np.argmin(np.abs(lon_coords - row["lon"])))
    
    uo_val = float(ds["uo"].values[t_idx, 0, lat_idx, lon_idx])
    vo_val = float(ds["vo"].values[t_idx, 0, lat_idx, lon_idx])
    so_val = float(ds["so"].values[t_idx, 0, lat_idx, lon_idx])
    bt_val = float(ds["bottomT"].values[t_idx, lat_idx, lon_idx])
    
    results.append({
        "iceberg_id": row["iceberg_id"],
        "date": d_str,
        "lat": row["lat"],
        "lon": row["lon"],
        "iceberg_speed_kmday": row["speed_kmday"],
        "iceberg_dir": row["direction"],
        "glorys_uo_ms": round(uo_val, 4) if not np.isnan(uo_val) else None,
        "glorys_vo_ms": round(vo_val, 4) if not np.isnan(vo_val) else None,
        "glorys_current_speed_ms": round(np.sqrt(uo_val**2 + vo_val**2), 4) if not np.isnan(uo_val) else None,
        "glorys_salinity": round(so_val, 3) if not np.isnan(so_val) else None,
        "glorys_bottomT_degC": round(bt_val, 3) if not np.isnan(bt_val) else None
    })

df_res = pd.DataFrame(results)
print("\nExtraction Sample:")
print(df_res.to_string(index=False))

ds.close()
if os.path.exists(tmp_file):
    os.remove(tmp_file)
