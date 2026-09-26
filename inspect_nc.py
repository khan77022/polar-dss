"""
inspect_nc.py
Inspect the structure of all environmental NetCDF / GRIB files
before doing any matching against iceberg observations.
"""

import zipfile
import io
import os
import xarray as xr
import numpy as np

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataSet")

ZIPS = sorted([
    os.path.join(DATASET_DIR, f)
    for f in os.listdir(DATASET_DIR)
    if f.endswith(".zip") and f.startswith("raw-")
])


def separator(title):
    print()
    print("=" * 60)
    print(title)
    print("=" * 60)


def inspect_nc(ds, label=""):
    """Print full structure of an xarray Dataset."""
    print(f"\n--- {label} ---")
    print(f"Dimensions : {dict(ds.sizes)}")
    print(f"Coordinates: {list(ds.coords)}")

    # Coordinate details
    for c in ds.coords:
        coord = ds.coords[c]
        if coord.size <= 8:
            print(f"  {c}: {coord.values}")
        else:
            try:
                mn = float(np.nanmin(coord.values))
                mx = float(np.nanmax(coord.values))
                print(f"  {c}: shape={coord.shape}, min={mn:.6g}, max={mx:.6g}")
            except Exception:
                print(f"  {c}: shape={coord.shape}, dtype={coord.dtype}, sample={coord.values.flat[0]}")

    print(f"Variables  :")
    for v in ds.data_vars:
        var = ds[v]
        a = var.attrs
        ln = a.get("long_name", a.get("standard_name", "N/A"))
        un = a.get("units", "N/A")
        mn_val, mx_val = "N/A", "N/A"
        if np.issubdtype(var.dtype, np.number) and var.size < 50_000_000:
            try:
                mn_val = float(np.nanmin(var.values))
                mx_val = float(np.nanmax(var.values))
            except Exception:
                pass
        print(f"  {v}")
        print(f"    shape={var.shape}, dtype={var.dtype}")
        print(f"    long_name : {ln}")
        print(f"    units     : {un}")
        print(f"    min/max   : {mn_val} / {mx_val}")

    ds.close()


def find_and_inspect(fragment, label, max_files=1):
    found = 0
    tmp_file = os.path.join(DATASET_DIR, "_tmp_inspect.nc")
    for zip_path in ZIPS:
        with zipfile.ZipFile(zip_path) as zf:
            for name in zf.namelist():
                if fragment in name and name.endswith(".nc"):
                    try:
                        with open(tmp_file, "wb") as f:
                            f.write(zf.read(name))
                        ds = xr.open_dataset(tmp_file, engine="netcdf4")
                        inspect_nc(ds, label=f"{label} | {os.path.basename(name)}")
                    except Exception as e:
                        print(f"  ERROR opening {name}: {e}")
                    finally:
                        if os.path.exists(tmp_file):
                            try:
                                os.remove(tmp_file)
                            except Exception:
                                pass
                    found += 1
                    if found >= max_files:
                        return
    if found == 0:
        print(f"  [NOT FOUND] No file matching '{fragment}' in any zip")


# ──────────────────────────────────────────────────────────
# 1. GLORYS
# ──────────────────────────────────────────────────────────
separator("1. GLORYS  (cmems_mod_glo_phy_my)")
find_and_inspect("cmems_mod_glo_phy_my", "GLORYS", max_files=1)

# ──────────────────────────────────────────────────────────
# 2. SEA ICE  — SSMIS
# ──────────────────────────────────────────────────────────
separator("2. SEA ICE  (OSI-SAF SSMIS)")
find_and_inspect("ssmis", "SEAICE-SSMIS", max_files=1)

# ──────────────────────────────────────────────────────────
# 3. SEA ICE  — AMSR2
# ──────────────────────────────────────────────────────────
separator("3. SEA ICE  (OSI-SAF AMSR2)")
find_and_inspect("amsr2", "SEAICE-AMSR2", max_files=1)

# ──────────────────────────────────────────────────────────
# 4. GEBCO  (standalone file)
# ──────────────────────────────────────────────────────────
separator("4. GEBCO 2024 Bathymetry")
gebco_path = os.path.join(DATASET_DIR, "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc")
if os.path.exists(gebco_path):
    try:
        # Open lazily — file is ~600 MB, don't load into RAM
        ds = xr.open_dataset(gebco_path, engine="netcdf4")
        inspect_nc(ds, label="GEBCO | gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc")
    except Exception as e:
        print(f"  ERROR: {e}")
else:
    print("  GEBCO file not found at expected path")

# ──────────────────────────────────────────────────────────
# 5. WIND  (GRIB)
# ──────────────────────────────────────────────────────────
separator("5. WIND (GRIB)")
grib_found = False
for zip_path in ZIPS:
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if name.endswith(".grib"):
                size_mb = zf.getinfo(name).file_size / 1024 / 1024
                print(f"  Found: {name} ({size_mb:.1f} MB)")
                # Extract to temp file (cfgrib needs a real path)
                tmp_grib = os.path.join(DATASET_DIR, "_tmp_wind.grib")
                with open(tmp_grib, "wb") as f:
                    f.write(zf.read(name))
                try:
                    import cfgrib
                    datasets = cfgrib.open_datasets(tmp_grib)
                    for i, ds in enumerate(datasets):
                        inspect_nc(ds, label=f"WIND dataset[{i}]")
                except Exception as e:
                    print(f"  cfgrib error: {e}")
                    print("  Trying xarray with cfgrib engine...")
                    try:
                        ds = xr.open_dataset(tmp_grib, engine="cfgrib",
                                             backend_kwargs={"indexing_time": "auto"})
                        inspect_nc(ds, label="WIND (cfgrib)")
                    except Exception as e2:
                        print(f"  xr cfgrib error: {e2}")
                finally:
                    if os.path.exists(tmp_grib):
                        os.remove(tmp_grib)
                grib_found = True
if not grib_found:
    print("  No GRIB file found")

print()
print("=" * 60)
print("Inspection complete.")
print("=" * 60)
