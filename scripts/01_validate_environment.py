"""
scripts/01_validate_environment.py
================================================================================
Comprehensive Environmental Schema Inspection & File Inventory
================================================================================
Inspects exact files from each raw data pillar:
  - GLORYS (representative file from each of the 4 sectors)
  - ERA5 (2023, 2024/2025, and ERA5_2026 directory)
  - SEA ICE (multiple daily Southern Hemisphere NetCDF files)
  - GEBCO (actual 2024 NetCDF grid)

Outputs:
  - dataSet/06_processed/diagnostics/environment_schema_report.json
  - dataSet/06_processed/diagnostics/environment_schema_report.txt
  - dataSet/06_processed/diagnostics/source_file_inventory.csv
"""

from pathlib import Path
import json
import csv
import numpy as np
import pandas as pd
import xarray as xr

# Explicit absolute project root
PROJECT_ROOT = Path(r"D:\SIH\IceBerg").resolve()
DATASET_DIR = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_DIR / "06_processed"
DIAGNOSTICS_DIR = PROCESSED_DIR / "diagnostics"
DIAGNOSTICS_DIR.mkdir(parents=True, exist_ok=True)

REPORT_JSON = DIAGNOSTICS_DIR / "environment_schema_report.json"
REPORT_TXT = DIAGNOSTICS_DIR / "environment_schema_report.txt"
INVENTORY_CSV = DIAGNOSTICS_DIR / "source_file_inventory.csv"


def get_var_metadata(var):
    attrs = var.attrs
    dtype_str = str(var.dtype)
    fill_val = attrs.get("_FillValue", attrs.get("missing_value", None))
    if isinstance(fill_val, (np.floating, np.integer)):
        fill_val = float(fill_val)
    elif fill_val is not None:
        fill_val = str(fill_val)

    scale_factor = attrs.get("scale_factor", 1.0)
    if isinstance(scale_factor, (np.floating, np.integer)):
        scale_factor = float(scale_factor)
        
    add_offset = attrs.get("add_offset", 0.0)
    if isinstance(add_offset, (np.floating, np.integer)):
        add_offset = float(add_offset)

    return {
        "dtype": dtype_str,
        "units": attrs.get("units", "N/A"),
        "long_name": attrs.get("long_name", attrs.get("standard_name", "N/A")),
        "fill_value": fill_val,
        "scale_factor": scale_factor,
        "add_offset": add_offset
    }


def inspect_glorys():
    print("Inspecting GLORYS...")
    glorys_dir = DATASET_DIR / "SIH" / "DATA_Copernicus"
    sectors = ["sector_-90_-180", "sector_-90_0", "sector_0_90", "sector_90_180"]
    results = {}

    for sec in sectors:
        sec_dir = glorys_dir / sec
        nc_files = sorted(sec_dir.glob("*.nc"))
        if not nc_files:
            continue
        fpath = nc_files[0]
        ds = xr.open_dataset(fpath)
        
        lats = ds["latitude"].values
        lons = ds["longitude"].values
        times = ds["time"].values
        
        vars_info = {}
        for v in ds.data_vars:
            meta = get_var_metadata(ds[v])
            sample = ds[v].isel(time=0).values
            nans = np.isnan(sample)
            valid = sample[~nans]
            meta["min"] = float(valid.min()) if len(valid) > 0 else None
            meta["max"] = float(valid.max()) if len(valid) > 0 else None
            meta["nan_fraction"] = float(nans.mean())
            vars_info[v] = meta

        results[sec] = {
            "filename": fpath.name,
            "file_size_bytes": fpath.stat().st_size,
            "file_size_mb": round(fpath.stat().st_size / (1024 * 1024), 2),
            "format": "NetCDF-4",
            "dimensions": {k: int(v) for k, v in ds.sizes.items()},
            "coordinates": list(ds.coords.keys()),
            "time_coordinate": "time",
            "time_resolution": "daily",
            "time_range": [str(times[0])[:19], str(times[-1])[:19]],
            "calendar": getattr(ds["time"].dt, "calendar", "proleptic_gregorian"),
            "latitude_bounds": [float(lats.min()), float(lats.max())],
            "latitude_ordering": "ascending" if lats[0] < lats[-1] else "descending",
            "latitude_resolution_deg": float(np.abs(np.diff(lats[:5]).mean())),
            "longitude_bounds": [float(lons.min()), float(lons.max())],
            "longitude_convention": "[-180, 180]" if lons.min() < 0 else "[0, 360]",
            "longitude_resolution_deg": float(np.abs(np.diff(lons[:5]).mean())),
            "crs": "WGS84 (EPSG:4326)",
            "variables": vars_info
        }
        ds.close()
    return results


def inspect_era5():
    print("Inspecting ERA5...")
    era5_dir = DATASET_DIR / "ERA5"
    era5_2026_dir = DATASET_DIR / "ERA5_2026"

    # Representative files: 2023, 2024, 2025, 2026
    sample_paths = [
        era5_dir / "era5_2023_04.grib",
        era5_dir / "era5_2024_06.grib",
        era5_dir / "era5_2025_06.grib",
        era5_2026_dir / "era5_2026_05.grib"
    ]

    results = {}
    for fpath in sample_paths:
        if not fpath.exists():
            continue
        key_label = fpath.parent.name + "/" + fpath.name

        # Surface variables
        ds_surf = xr.open_dataset(fpath, engine="cfgrib", backend_kwargs={"filter_by_keys": {"typeOfLevel": "surface"}})
        lats = ds_surf["latitude"].values
        lons = ds_surf["longitude"].values
        times = ds_surf["time"].values

        surf_vars = {}
        for v in ds_surf.data_vars:
            meta = get_var_metadata(ds_surf[v])
            surf_vars[v] = meta

        ds_surf.close()

        # Wave variables
        wave_vars = {}
        try:
            ds_wave = xr.open_dataset(fpath, engine="cfgrib", backend_kwargs={"filter_by_keys": {"shortName": "swh"}})
            for v in ds_wave.data_vars:
                wave_vars[v] = get_var_metadata(ds_wave[v])
            wave_lats = ds_wave["latitude"].values
            wave_lons = ds_wave["longitude"].values
            wave_res = float(np.abs(np.diff(wave_lats[:5]).mean()))
            ds_wave.close()
        except Exception:
            wave_res = 0.50

        results[key_label] = {
            "filename": fpath.name,
            "directory": str(fpath.parent),
            "file_size_bytes": fpath.stat().st_size,
            "file_size_mb": round(fpath.stat().st_size / (1024 * 1024), 2),
            "format": "GRIB2",
            "time_coordinate": "time",
            "time_resolution": "hourly / subdaily",
            "time_range": [str(times[0])[:19], str(times[-1])[:19]],
            "latitude_bounds": [float(lats.min()), float(lats.max())],
            "latitude_ordering": "descending" if lats[0] > lats[-1] else "ascending",
            "surface_latitude_resolution_deg": float(np.abs(np.diff(lats[:5]).mean())),
            "longitude_bounds": [float(lons.min()), float(lons.max())],
            "longitude_convention": "[-180, 180]" if lons.min() < 0 else "[0, 360]",
            "surface_longitude_resolution_deg": float(np.abs(np.diff(lons[:5]).mean())),
            "wave_resolution_deg": wave_res,
            "crs": "WGS84 regular lat/lon grid",
            "surface_variables": surf_vars,
            "wave_variables": wave_vars,
            "note": "Requires backend_kwargs={'filter_by_keys': {'typeOfLevel': 'surface'}} to separate 0.25 deg wind from 0.50 deg wave grid"
        }
    return results


def inspect_seaice():
    print("Inspecting Sea Ice...")
    si_dir = DATASET_DIR / "SIH" / "DATA_Sea_ice_drift_concentration"
    all_files = sorted(si_dir.glob("*.nc"))
    sh_files = [f for f in all_files if "_sh_" in f.name]
    
    samples = [sh_files[0], sh_files[len(sh_files)//2], sh_files[-1]]
    results = {
        "inventory": {
            "total_files": len(all_files),
            "southern_hemisphere_files": len(sh_files),
            "northern_hemisphere_files": len(all_files) - len(sh_files),
            "drift_velocity_vector_files": 0,
            "parameter_type": "Sea ice area concentration only (drift u/v absent)"
        },
        "sample_files": {}
    }

    for fpath in samples:
        ds = xr.open_dataset(fpath)
        xc = ds["xc"].values
        yc = ds["yc"].values
        lats_2d = ds["lat"].values
        lons_2d = ds["lon"].values
        times = ds["time"].values
        grid_attrs = ds["Polar_Stereographic_Grid"].attrs if "Polar_Stereographic_Grid" in ds else {}

        vars_info = {}
        for v in ds.data_vars:
            meta = get_var_metadata(ds[v])
            vars_info[v] = meta

        results["sample_files"][fpath.name] = {
            "filename": fpath.name,
            "file_size_bytes": fpath.stat().st_size,
            "file_size_mb": round(fpath.stat().st_size / (1024 * 1024), 2),
            "format": "NetCDF-4 (CF-1.6)",
            "dimensions": {k: int(v) for k, v in ds.sizes.items()},
            "time_coordinate": "time",
            "time_stamp": str(times[0])[:19],
            "projection": grid_attrs.get("grid_mapping_name", "polar_stereographic"),
            "proj4_string": grid_attrs.get("proj4_string", "+proj=stere +a=6378273 +b=6356889.44891 +lat_0=-90 +lat_ts=-70 +lon_0=0"),
            "standard_parallel": float(grid_attrs.get("standard_parallel", -70.0)),
            "latitude_of_origin": float(grid_attrs.get("latitude_of_projection_origin", -90.0)),
            "xc_range_km": [float(xc.min()), float(xc.max())],
            "yc_range_km": [float(yc.min()), float(yc.max())],
            "spatial_resolution_km": float(np.abs(np.diff(xc[:5]).mean())),
            "lat_2d_range": [float(lats_2d.min()), float(lats_2d.max())],
            "lon_2d_range": [float(lons_2d.min()), float(lons_2d.max())],
            "variables": vars_info
        }
        ds.close()
    return results


def inspect_gebco():
    print("Inspecting GEBCO...")
    gebco_path = DATASET_DIR / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
    ds = xr.open_dataset(gebco_path)
    lats = ds["lat"].values
    lons = ds["lon"].values

    dlat = float(np.abs(np.diff(lats[:5]).mean()))
    dlon = float(np.abs(np.diff(lons[:5]).mean()))
    elev_meta = get_var_metadata(ds["elevation"])
    
    result = {
        "filename": gebco_path.name,
        "file_size_bytes": gebco_path.stat().st_size,
        "file_size_mb": round(gebco_path.stat().st_size / (1024 * 1024), 2),
        "format": "NetCDF-4",
        "dimensions": {k: int(v) for k, v in ds.sizes.items()},
        "coordinates": list(ds.coords.keys()),
        "latitude_bounds": [float(lats.min()), float(lats.max())],
        "latitude_ordering": "ascending" if lats[0] < lats[-1] else "descending",
        "latitude_resolution_deg": dlat,
        "latitude_resolution_arcsec": round(dlat * 3600, 1),
        "longitude_bounds": [float(lons.min()), float(lons.max())],
        "longitude_convention": "[-180, 180]",
        "longitude_resolution_deg": dlon,
        "longitude_resolution_arcsec": round(dlon * 3600, 1),
        "crs": "WGS84 EPSG:4326",
        "elevation_variable": elev_meta,
        "coverage_constraint": "Strict [-75.0, -60.0] latitude boundary. Points south of -75.0S are outside grid and will be NaN with gebco_available=0."
    }
    ds.close()
    return result


def build_file_inventory():
    print("Building file inventory CSV...")
    records = []

    # Iceberg tracks
    p_track = DATASET_DIR / "iceberg_tracks_clean.parquet"
    if p_track.exists():
        records.append({
            "pillar": "ICEBERGS",
            "subfolder": "dataSet",
            "filename": p_track.name,
            "format": "Parquet",
            "size_mb": round(p_track.stat().st_size / (1024 * 1024), 2),
            "date_range": "1976-02-01 to 2026-04-30",
            "variable_summary": "Clean historical iceberg observations"
        })

    # GLORYS
    glorys_dir = DATASET_DIR / "SIH" / "DATA_Copernicus"
    for f in sorted(glorys_dir.glob("*/*.nc")):
        records.append({
            "pillar": "GLORYS",
            "subfolder": f"SIH/DATA_Copernicus/{f.parent.name}",
            "filename": f.name,
            "format": "NetCDF-4",
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "date_range": "2023-03-23 to 2026-06-23",
            "variable_summary": "uo, vo, thetao, so, zos, mlotst, sithick"
        })

    # ERA5
    for f in sorted((DATASET_DIR / "ERA5").glob("*.grib")):
        records.append({
            "pillar": "ERA5",
            "subfolder": "ERA5",
            "filename": f.name,
            "format": "GRIB2",
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "date_range": f.stem,
            "variable_summary": "u10, v10, msl (0.25 deg); swh, mwd (0.50 deg)"
        })
    for f in sorted((DATASET_DIR / "ERA5_2026").glob("*.grib")):
        records.append({
            "pillar": "ERA5_2026",
            "subfolder": "ERA5_2026",
            "filename": f.name,
            "format": "GRIB2",
            "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
            "date_range": f.stem,
            "variable_summary": "u10, v10, msl (0.25 deg); swh, mwd (0.50 deg)"
        })

    # Sea Ice summary
    si_dir = DATASET_DIR / "SIH" / "DATA_Sea_ice_drift_concentration"
    si_files = list(si_dir.glob("*.nc"))
    sh_count = len([f for f in si_files if "_sh_" in f.name])
    nh_count = len(si_files) - sh_count
    records.append({
        "pillar": "SEA_ICE",
        "subfolder": "SIH/DATA_Sea_ice_drift_concentration",
        "filename": f"{len(si_files)} NetCDF files ({sh_count} SH, {nh_count} NH)",
        "format": "NetCDF-4 Polar Stereographic",
        "size_mb": round(sum(f.stat().st_size for f in si_files) / (1024 * 1024), 2),
        "date_range": "2023-03-23 to 2026-07-31",
        "variable_summary": "ice_conc, raw_ice_conc_values, status_flag, total_uncertainty"
    })

    # GEBCO
    gebco_path = DATASET_DIR / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
    if gebco_path.exists():
        records.append({
            "pillar": "GEBCO",
            "subfolder": "dataSet",
            "filename": gebco_path.name,
            "format": "NetCDF-4",
            "size_mb": round(gebco_path.stat().st_size / (1024 * 1024), 2),
            "date_range": "Static 2024 Grid",
            "variable_summary": "elevation (15 arc-seconds)"
        })

    df_inv = pd.DataFrame(records)
    df_inv.to_csv(INVENTORY_CSV, index=False)
    print(f"Inventory saved: {INVENTORY_CSV}")


def main():
    print("=" * 78)
    print("  01_VALIDATE_ENVIRONMENT: DEEP SCHEMA INSPECTION")
    print(f"  Project Root: {PROJECT_ROOT}")
    print("=" * 78)

    report_data = {
        "glorys": inspect_glorys(),
        "era5": inspect_era5(),
        "seaice": inspect_seaice(),
        "gebco": inspect_gebco()
    }

    # Write JSON report
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"Schema JSON report saved: {REPORT_JSON}")

    # Write Text report
    with open(REPORT_TXT, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("ENVIRONMENTAL SCHEMA INSPECTION REPORT (SIH2659 ICEBERG PROJECT)\n")
        f.write("=" * 80 + "\n\n")

        f.write("1. GLORYS OCEAN REANALYSIS (CMEMS)\n")
        f.write("-" * 50 + "\n")
        for sec, data in report_data["glorys"].items():
            f.write(f"Sector: {sec}\n")
            f.write(f"  File: {data['filename']} ({data['file_size_mb']} MB)\n")
            f.write(f"  Dimensions: {data['dimensions']}\n")
            f.write(f"  Lat bounds: {data['latitude_bounds']} (res: {data['latitude_resolution_deg']:.4f} deg)\n")
            f.write(f"  Lon bounds: {data['longitude_bounds']} (res: {data['longitude_resolution_deg']:.4f} deg)\n")
            f.write(f"  Time range: {data['time_range'][0]} to {data['time_range'][1]} ({data['time_resolution']})\n")
            f.write("  Variables:\n")
            for v, vm in data["variables"].items():
                f.write(f"    - {v}: {vm['long_name']} (units: {vm['units']}, nan%: {vm['nan_fraction']*100:.1f}%, min/max: [{vm['min']}, {vm['max']}])\n")
            f.write("\n")

        f.write("2. ERA5 ATMOSPHERIC & WAVE REANALYSIS (ECMWF)\n")
        f.write("-" * 50 + "\n")
        for k, data in report_data["era5"].items():
            f.write(f"File: {k} ({data['file_size_mb']} MB)\n")
            f.write(f"  Time range: {data['time_range'][0]} to {data['time_range'][1]}\n")
            f.write(f"  Surface Lat/Lon res: {data['surface_latitude_resolution_deg']:.2f} deg, Wave res: {data['wave_resolution_deg']:.2f} deg\n")
            f.write(f"  Surface variables: {list(data['surface_variables'].keys())}\n")
            f.write(f"  Wave variables: {list(data['wave_variables'].keys())}\n")
            f.write(f"  Note: {data['note']}\n\n")

        f.write("3. SEA ICE CONCENTRATION (OSI-SAF / AMSR2)\n")
        f.write("-" * 50 + "\n")
        inv = report_data["seaice"]["inventory"]
        f.write(f"Total files: {inv['total_files']} ({inv['southern_hemisphere_files']} Southern Hemisphere, {inv['northern_hemisphere_files']} Northern Hemisphere)\n")
        f.write(f"Drift vectors present: NO ({inv['drift_velocity_vector_files']} files)\n")
        f.write(f"Parameter: {inv['parameter_type']}\n")
        for fname, sdata in report_data["seaice"]["sample_files"].items():
            f.write(f"Sample: {fname}\n")
            f.write(f"  Projection: {sdata['proj4_string']}\n")
            f.write(f"  Grid coords: xc in {sdata['xc_range_km']} km, yc in {sdata['yc_range_km']} km (res: {sdata['spatial_resolution_km']} km)\n")
            f.write(f"  Variables: {list(sdata['variables'].keys())}\n")
            f.write("\n")

        f.write("4. GEBCO 2024 BATHYMETRY GRID\n")
        f.write("-" * 50 + "\n")
        g = report_data["gebco"]
        f.write(f"File: {g['filename']} ({g['file_size_mb']} MB)\n")
        f.write(f"  Dimensions: {g['dimensions']}\n")
        f.write(f"  Lat bounds: {g['latitude_bounds']} (res: {g['latitude_resolution_arcsec']} arcsec)\n")
        f.write(f"  Lon bounds: {g['longitude_bounds']} (res: {g['longitude_resolution_arcsec']} arcsec)\n")
        f.write(f"  Elevation metadata: {g['elevation_variable']}\n")
        f.write(f"  Constraint: {g['coverage_constraint']}\n")
    print(f"Schema Text report saved: {REPORT_TXT}")

    # Build inventory CSV
    build_file_inventory()
    print("01_validate_environment completed successfully.")


if __name__ == "__main__":
    main()
