"""
check_env_dates.py
Catalog all environmental files across ZIPs and check their time ranges,
variables, and overlap with iceberg_tracks_clean.parquet.
"""

import zipfile
import os
import pandas as pd
import numpy as np
import xarray as xr

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataSet")
PARQUET_FILE = os.path.join(DATASET_DIR, "iceberg_tracks_clean.parquet")

ZIPS = sorted([
    os.path.join(DATASET_DIR, f)
    for f in os.listdir(DATASET_DIR)
    if f.endswith(".zip") and f.startswith("raw-")
])

print("--- Iceberg Clean Tracks Date Range ---")
df_tracks = pd.read_parquet(PARQUET_FILE)
print(f"Total track points: {len(df_tracks):,}")
print(f"Date min: {df_tracks['date'].min()} -> max: {df_tracks['date'].max()}")
print(f"Unique icebergs: {df_tracks['iceberg_id'].nunique()}")
print(f"Lat range: {df_tracks['lat'].min():.2f} to {df_tracks['lat'].max():.2f}")
print(f"Lon range: {df_tracks['lon'].min():.2f} to {df_tracks['lon'].max():.2f}")

print("\n--- Scanning Environmental Files across ZIPs ---")
tmp_file = os.path.join(DATASET_DIR, "_tmp_scan.nc")

env_inventory = []

for zp in ZIPS:
    zf_name = os.path.basename(zp)
    with zipfile.ZipFile(zp) as zf:
        for name in sorted(zf.namelist()):
            if not (name.endswith(".nc") or name.endswith(".grib")):
                continue
            fsize_mb = zf.getinfo(name).file_size / 1024 / 1024
            
            # Category
            if "glorys" in name:
                cat = "GLORYS"
            elif "seaice" in name:
                cat = "SEAICE"
            elif "wind" in name:
                cat = "WIND"
            elif "OceanDepthData" in name:
                cat = "GEBCO"
            else:
                cat = "OTHER"

            t_min, t_max, n_times = None, None, 0
            vars_list = []

            try:
                with open(tmp_file, "wb") as f:
                    f.write(zf.read(name))
                
                if name.endswith(".nc"):
                    with xr.open_dataset(tmp_file, engine="netcdf4") as ds:
                        vars_list = list(ds.data_vars.keys())
                        if "time" in ds.coords:
                            t_vals = pd.to_datetime(ds["time"].values)
                            t_min = str(t_vals.min())[:10]
                            t_max = str(t_vals.max())[:10]
                            n_times = len(t_vals)
                elif name.endswith(".grib"):
                    import cfgrib
                    dss = cfgrib.open_datasets(tmp_file)
                    for ds in dss:
                        vars_list.extend(list(ds.data_vars.keys()))
                        if "time" in ds.coords:
                            t_vals = pd.to_datetime(ds["time"].values)
                            t_min = str(t_vals.min())[:10]
                            t_max = str(t_vals.max())[:10]
                            n_times = len(t_vals)
                        ds.close()
            except Exception as e:
                vars_list = [f"ERR: {e}"]
            finally:
                if os.path.exists(tmp_file):
                    try:
                        os.remove(tmp_file)
                    except Exception:
                        pass

            env_inventory.append({
                "zip": zf_name,
                "category": cat,
                "filename": os.path.basename(name),
                "size_mb": round(fsize_mb, 1),
                "n_times": n_times,
                "time_min": t_min,
                "time_max": t_max,
                "vars": ", ".join(vars_list[:5])
            })

df_inv = pd.DataFrame(env_inventory)
print(df_inv.to_string(index=False))

# Check overlap
print("\n--- Overlap Analysis ---")
for cat in ["GLORYS", "SEAICE", "WIND"]:
    sub = df_inv[df_inv["category"] == cat]
    if sub.empty:
        continue
    all_t_min = sub["time_min"].dropna().min()
    all_t_max = sub["time_max"].dropna().max()
    print(f"\n{cat}: Total files={len(sub)}, Date coverage: {all_t_min} -> {all_t_max}")
    if all_t_min and all_t_max:
        in_range = df_tracks[(df_tracks["date"] >= all_t_min) & (df_tracks["date"] <= all_t_max)]
        print(f"  Matching iceberg rows in this date range: {len(in_range):,} / {len(df_tracks):,} ({len(in_range)/len(df_tracks)*100:.1f}%)")
        print(f"  Icebergs active in this range: {in_range['iceberg_id'].nunique()} distinct IDs")
