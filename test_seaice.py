"""
test_seaice.py
Inspect Sea Ice variables and test matching on 2024 observations.
"""

import os
import zipfile
import xarray as xr
import pandas as pd
import numpy as np

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataSet")
tmp_file = os.path.join(DATASET_DIR, "_tmp_sic_test.nc")

zp = os.path.join(DATASET_DIR, "raw-20260921T095550Z-1-001.zip")
with zipfile.ZipFile(zp) as zf:
    name = "raw/seaice/osisaf_obs-si_glo_phy-sic-south_nrt_ssmis_l4_P1D-m_1789810830183.nc"
    with open(tmp_file, "wb") as f:
        f.write(zf.read(name))

ds = xr.open_dataset(tmp_file, engine="netcdf4")
print("Sea Ice Dataset Summary:")
print("Data vars:", list(ds.data_vars.keys()))
for v in ds.data_vars:
    var = ds[v]
    print(f"\nVar: {v}")
    print(f"  Shape: {var.shape}")
    print(f"  Attrs: {dict(var.attrs)}")
    # Sample non-nan values
    vals = var.values
    valid = vals[~np.isnan(vals)]
    if len(valid) > 0:
        print(f"  Valid count: {len(valid):,}, Min: {valid.min()}, Max: {valid.max()}, Mean: {valid.mean():.2f}")
    else:
        print("  All values are NaN!")

ds.close()
if os.path.exists(tmp_file):
    os.remove(tmp_file)
