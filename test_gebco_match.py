"""
test_gebco_match.py
Test extracting GEBCO 2024 bathymetry (depth / elevation) for iceberg observations.
"""

import os
import pandas as pd
import numpy as np
import netCDF4 as nc

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataSet")
PARQUET_FILE = os.path.join(DATASET_DIR, "iceberg_tracks_clean.parquet")
GEBCO_FILE = os.path.join(DATASET_DIR, "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc")

# Open GEBCO with netCDF4 for direct array indexing without loading entire 600MB array
ds_gebco = nc.Dataset(GEBCO_FILE)
lat_arr = ds_gebco.variables["lat"][:]
lon_arr = ds_gebco.variables["lon"][:]
elev_var = ds_gebco.variables["elevation"]

print(f"GEBCO Grid: lat {lat_arr.min():.4f} to {lat_arr.max():.4f} (step={lat_arr[1]-lat_arr[0]:.6f})")
print(f"GEBCO Grid: lon {lon_arr.min():.4f} to {lon_arr.max():.4f} (step={lon_arr[1]-lon_arr[0]:.6f})")

# Load sample iceberg tracks
df = pd.read_parquet(PARQUET_FILE)
# Select points within GEBCO bounds [-75, -60]
in_gebco = df[(df["lat"] >= lat_arr.min()) & (df["lat"] <= lat_arr.max())].copy()
print(f"Total iceberg points within GEBCO latitude range [-75, -60]: {len(in_gebco):,} / {len(df):,} ({len(in_gebco)/len(df)*100:.1f}%)")

sample = in_gebco.head(10).copy()

# Vectorized index calculation
lat_min, lat_step = lat_arr[0], lat_arr[1] - lat_arr[0]
lon_min, lon_step = lon_arr[0], lon_arr[1] - lon_arr[0]

lat_indices = np.clip(np.round((sample["lat"].values - lat_min) / lat_step).astype(int), 0, len(lat_arr) - 1)
lon_indices = np.clip(np.round((sample["lon"].values - lon_min) / lon_step).astype(int), 0, len(lon_arr) - 1)

depths = []
for li, lj in zip(lat_indices, lon_indices):
    depths.append(float(elev_var[li, lj]))

sample["ocean_depth_m"] = depths
print("\nSample with GEBCO elevation/depth:")
print(sample[["iceberg_id", "date", "lat", "lon", "speed_kmday", "ocean_depth_m"]].to_string(index=False))

ds_gebco.close()
