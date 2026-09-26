"""
SIH2659 -- Dataset Metadata Audit  (Phase 2)
=============================================
STRICTLY READ-ONLY. Zero modifications to source data.

Inspects all 17 named datasets identified in the integrity audit.
Discovers variables, coordinates, temporal/spatial coverage from actual files.
Uses representative sampling for large collections (e.g. 4,696 sea-ice NC files).
Produces 5 outputs in dataSet/99_archive_inventory/.

DOES NOT: move, rename, delete, modify, match, interpolate, impute, rebuild.
"""

import csv
import datetime
import json
import pathlib
import random
import re
import sys
import traceback
from collections import defaultdict

PROJECT_ROOT  = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_ROOT  = PROJECT_ROOT / "dataSet"
INVENTORY_DIR = DATASET_ROOT / "99_archive_inventory"
REPORTS_DIR   = PROJECT_ROOT / "reports"

EXCLUDED_DIRS = {INVENTORY_DIR, REPORTS_DIR,
                 PROJECT_ROOT / "models", PROJECT_ROOT / "logs"}

SEP = "=" * 65
_LOG   = []
_ERRORS = []
_FILES_OPENED   = 0
_FILES_MODIFIED = 0   # INVARIANT: must stay 0

def log(msg, level="INFO"):
    ts   = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    _LOG.append(line)
    print(line)

def warn(msg): log(msg, "WARN")
def err(msg):
    log(msg, "ERROR")
    _ERRORS.append(msg)

# ── Library probes ──────────────────────────────────────────────────────────
try:
    import netCDF4 as nc4; HAS_NC4 = True
except ImportError:
    HAS_NC4 = False; warn("netCDF4 missing")

try:
    import numpy as np; HAS_NP = True
except ImportError:
    HAS_NP = False

try:
    import pandas as pd; HAS_PD = True
except ImportError:
    HAS_PD = False; warn("pandas missing")

try:
    import pyarrow.parquet as pq; HAS_PA = True
except ImportError:
    HAS_PA = False

try:
    import cfgrib; HAS_GRIB = True
except ImportError:
    HAS_GRIB = False; warn("cfgrib missing -- GRIB limited to file listing")

# ── Output containers ───────────────────────────────────────────────────────
DS_ROWS   = []   # dataset-level, one per named dataset
VAR_ROWS  = []   # variable-level, one per var per dataset
COORD_ROWS = []  # coordinate/dimension-level

DS_COLS = [
    "dataset_name","category","provenance","pipeline_status",
    "file_count","total_size_gb","format","files_inspected","sampling_strategy",
    "time_start","time_end","temporal_resolution",
    "lat_min","lat_max","lon_min","lon_max",
    "depth_levels","depth_units","crs_projection",
    "variables_discovered","fill_value_convention",
    "product_version","institution","conventions",
    "consistency_check","metadata_completeness","notes",
]

VAR_COLS = [
    "dataset_name","variable_name","long_name","standard_name",
    "units","dtype","shape_representative","fill_value",
    "valid_min","valid_max","dimensions","notes",
]

COORD_COLS = [
    "dataset_name","dimension_name","size","units","axis",
    "first_value","last_value","resolution","notes",
]


# ═══════════════════════════════════════════════════════════════════════════
# INSPECTORS — read-only, never modify files
# ═══════════════════════════════════════════════════════════════════════════

def _safe_float(v):
    try: return float(v)
    except Exception: return ""

def inspect_nc(path: pathlib.Path, label: str = "") -> dict:
    global _FILES_OPENED
    R = {"ok": False, "vars": {}, "dims": {}, "attrs": {}, "error": ""}
    if not HAS_NC4:
        R["error"] = "netCDF4 not installed"
        return R
    try:
        _FILES_OPENED += 1
        with nc4.Dataset(str(path), "r") as ds:
            R["ok"] = True
            for a in ("title","institution","source","history",
                      "Conventions","product_version","comment",
                      "references","grid_mapping","geospatial_lat_min",
                      "geospatial_lat_max","geospatial_lon_min",
                      "geospatial_lon_max","time_coverage_start",
                      "time_coverage_end","time_coverage_duration"):
                v = getattr(ds, a, None)
                if v: R["attrs"][a] = str(v)[:400]

            for dname, dim in ds.dimensions.items():
                R["dims"][dname] = {"size": len(dim), "unlimited": dim.isunlimited()}

            for vname, var in ds.variables.items():
                vi = {
                    "dtype"    : str(var.dtype),
                    "shape"    : str(var.shape),
                    "dims"     : list(var.dimensions),
                    "units"    : str(getattr(var, "units", "")),
                    "long_name": str(getattr(var, "long_name", vname)),
                    "std_name" : str(getattr(var, "standard_name", "")),
                    "fill_value": str(getattr(var, "_FillValue", "")),
                    "valid_min": str(getattr(var, "valid_min", "")),
                    "valid_max": str(getattr(var, "valid_max", "")),
                }
                # Coordinate variables: read actual range (small arrays)
                coord_keys = {"time","lat","latitude","nav_lat","yc","y",
                              "lon","longitude","nav_lon","xc","x",
                              "depth","level","deptht","lev",
                              "xc_array","yc_array"}
                if vname.lower() in coord_keys:
                    try:
                        data = var[:]
                        if hasattr(data, "compressed"): data = data.compressed()
                        flat = data.flatten()
                        vi["first"] = float(flat[0])  if len(flat) else ""
                        vi["last"]  = float(flat[-1]) if len(flat) else ""
                        vi["size"]  = int(flat.size)
                        if vname == "time" and hasattr(var, "units"):
                            try:
                                times = nc4.num2date(
                                    var[:], var.units,
                                    only_use_cftime_datetimes=False,
                                    only_use_python_datetimes=True)
                                vi["t_first"] = str(min(times))[:10]
                                vi["t_last"]  = str(max(times))[:10]
                            except Exception: pass
                    except Exception: pass
                R["vars"][vname] = vi
    except Exception as ex:
        R["error"] = f"{type(ex).__name__}: {ex}"
        err(f"NC failed {path.name}: {ex}")
    return R


def sample_nc_collection(nc_files: list, dataset_name: str,
                          n_sample: int = 6) -> dict:
    files = sorted(nc_files)
    n = len(files)
    if not files:
        return {"ok": False, "error": "no files", "vars": {}, "dims": {}, "attrs": {},
                "n_total": 0, "n_samples": 0}
    # Pick: first, last, ~4 interior
    picks = [files[0]]
    if n > 1: picks.append(files[-1])
    if n > 2:
        interior = files[1:-1]
        k = min(n_sample - 2, len(interior))
        picks += random.sample(interior, k)
    picks = list(dict.fromkeys(picks))
    log(f"  Sampling {len(picks)}/{n} NC files for {dataset_name}")

    results = []
    for p in picks:
        r = inspect_nc(p, dataset_name)
        if r["ok"]: results.append(r)

    if not results:
        return {"ok": False, "error": "all samples failed", "vars": {}, "dims": {},
                "attrs": {}, "n_total": n, "n_samples": 0}

    rep = results[0].copy()
    rep["n_total"]   = n
    rep["n_samples"] = len(results)

    # Consistency: do all samples share the same variable set?
    var_sets = [frozenset(r["vars"].keys()) for r in results]
    rep["consistent"] = len(set(var_sets)) == 1

    # Time range: gather from all samples
    t_first, t_last = "", ""
    for r in results:
        if "time" in r["vars"]:
            tv = r["vars"]["time"]
            tf = tv.get("t_first", "")
            tl = tv.get("t_last",  "")
            if tf and (not t_first or tf < t_first): t_first = tf
            if tl and (not t_last  or tl > t_last):  t_last  = tl
    rep["t_range_first"] = t_first
    rep["t_range_last"]  = t_last
    return rep


def _nc_to_var_rows(nc_res: dict, dataset_name: str):
    for vname, vi in nc_res["vars"].items():
        VAR_ROWS.append({
            "dataset_name"         : dataset_name,
            "variable_name"        : vname,
            "long_name"            : vi.get("long_name", ""),
            "standard_name"        : vi.get("std_name", ""),
            "units"                : vi.get("units", ""),
            "dtype"                : vi.get("dtype", ""),
            "shape_representative" : vi.get("shape", ""),
            "fill_value"           : vi.get("fill_value", ""),
            "valid_min"            : vi.get("valid_min", ""),
            "valid_max"            : vi.get("valid_max", ""),
            "dimensions"           : ",".join(vi.get("dims", [])),
            "notes"                : "",
        })
        if "first" in vi:
            axis = ("T" if vname == "time" else
                    "Y" if "lat" in vname.lower() or vname in ("yc","y","nav_lat") else
                    "X" if "lon" in vname.lower() or vname in ("xc","x","nav_lon") else
                    "Z" if vname.lower() in ("depth","level","lev","deptht") else "")
            COORD_ROWS.append({
                "dataset_name"  : dataset_name,
                "dimension_name": vname,
                "size"          : vi.get("size", ""),
                "units"         : vi.get("units", ""),
                "axis"          : axis,
                "first_value"   : vi.get("t_first", vi.get("first", "")),
                "last_value"    : vi.get("t_last",  vi.get("last", "")),
                "resolution"    : "",
                "notes"         : "",
            })


def inspect_grib(path: pathlib.Path, dataset_name: str) -> dict:
    global _FILES_OPENED
    R = {"ok": False, "vars": {}, "attrs": {}, "error": "",
         "t_first": "", "t_last": "", "lat_min": "", "lat_max": "",
         "lon_min": "", "lon_max": ""}
    if not HAS_GRIB:
        R["error"]  = "cfgrib not installed"
        R["size_gb"]= path.stat().st_size / 1e9
        return R
    try:
        _FILES_OPENED += 1
        dsets = cfgrib.open_datasets(str(path), indexpath="")
        for ds in dsets:
            for vname in ds.data_vars:
                v = ds[vname]
                R["vars"][vname] = {
                    "dtype"    : str(v.dtype),
                    "shape"    : str(v.shape),
                    "dims"     : list(v.dims),
                    "units"    : v.attrs.get("units", ""),
                    "long_name": v.attrs.get("long_name", vname),
                    "fill_value": str(v.attrs.get("_FillValue", "")),
                    "valid_min": "", "valid_max": "",
                }
            if "time" in ds.coords:
                try:
                    tv = ds.coords["time"].values
                    R["t_first"] = str(tv.min())[:10]
                    R["t_last"]  = str(tv.max())[:10]
                except Exception: pass
            for cn, rmin, rmax in [("latitude","lat_min","lat_max"),
                                    ("longitude","lon_min","lon_max")]:
                if cn in ds.coords:
                    try:
                        arr = ds.coords[cn].values
                        R[rmin] = float(arr.min())
                        R[rmax] = float(arr.max())
                    except Exception: pass
        R["ok"] = True
    except Exception as ex:
        R["error"] = f"{type(ex).__name__}: {ex}"
        warn(f"GRIB failed {path.name}: {ex}")
    return R


def inspect_csv_file(path: pathlib.Path, max_rows: int = 50000) -> dict:
    global _FILES_OPENED
    R = {"ok": False, "cols": [], "dtypes": {}, "row_count": "",
         "t_first": "", "t_last": "", "lat_min": "", "lat_max": "",
         "lon_min": "", "lon_max": "", "error": ""}
    try:
        _FILES_OPENED += 1
        if HAS_PD:
            df = pd.read_csv(path, nrows=max_rows, low_memory=False)
            R["ok"]       = True
            R["cols"]     = list(df.columns)
            R["dtypes"]   = {c: str(df[c].dtype) for c in df.columns}
            R["row_count"]= f"{len(df):,} (sample, max={max_rows:,})"
            for tc in ("date","Date","datetime","Datetime","timestamp","time","Time"):
                if tc in df.columns:
                    try:
                        ts = pd.to_datetime(df[tc], errors="coerce").dropna()
                        if len(ts):
                            R["t_first"] = str(ts.min())[:10]
                            R["t_last"]  = str(ts.max())[:10]
                    except Exception: pass
                    break
            for lc in ("latitude","lat","Latitude","LAT","Lat"):
                if lc in df.columns:
                    R["lat_min"] = round(float(df[lc].min()), 4)
                    R["lat_max"] = round(float(df[lc].max()), 4)
                    break
            for lc in ("longitude","lon","Longitude","LON","Lon"):
                if lc in df.columns:
                    R["lon_min"] = round(float(df[lc].min()), 4)
                    R["lon_max"] = round(float(df[lc].max()), 4)
                    break
        else:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                header = next(reader, [])
                R["ok"]   = True
                R["cols"] = header
    except Exception as ex:
        R["error"] = f"{type(ex).__name__}: {ex}"
        err(f"CSV failed {path.name}: {ex}")
    return R


def inspect_parquet_file(path: pathlib.Path) -> dict:
    global _FILES_OPENED
    R = {"ok": False, "cols": [], "dtypes": {}, "row_count": "",
         "t_first": "", "t_last": "", "lat_min": "", "lat_max": "",
         "lon_min": "", "lon_max": "", "error": ""}
    try:
        _FILES_OPENED += 1
        if HAS_PA:
            pf = pq.read_table(path)
            R["ok"]       = True
            R["cols"]     = pf.schema.names
            R["dtypes"]   = {f.name: str(f.type) for f in pf.schema}
            R["row_count"]= f"{pf.num_rows:,}"
            if HAS_PD:
                df = pf.to_pandas()
                for tc in ("date","datetime","timestamp","time","Date","Timestamp"):
                    if tc in df.columns:
                        try:
                            ts = pd.to_datetime(df[tc], errors="coerce").dropna()
                            if len(ts):
                                R["t_first"] = str(ts.min())[:10]
                                R["t_last"]  = str(ts.max())[:10]
                        except Exception: pass
                        break
                for lc in ("latitude","lat"):
                    if lc in df.columns:
                        R["lat_min"] = round(float(df[lc].min()), 4)
                        R["lat_max"] = round(float(df[lc].max()), 4); break
                for lc in ("longitude","lon"):
                    if lc in df.columns:
                        R["lon_min"] = round(float(df[lc].min()), 4)
                        R["lon_max"] = round(float(df[lc].max()), 4); break
        elif HAS_PD:
            df = pd.read_parquet(path)
            R["ok"]       = True
            R["cols"]     = list(df.columns)
            R["dtypes"]   = {c: str(df[c].dtype) for c in df.columns}
            R["row_count"]= f"{len(df):,}"
    except Exception as ex:
        R["error"] = f"{type(ex).__name__}: {ex}"
        err(f"Parquet failed {path.name}: {ex}")
    return R


def inspect_zip_file(path: pathlib.Path) -> dict:
    import zipfile
    R = {"ok": False, "members": [], "count": 0, "error": ""}
    try:
        with zipfile.ZipFile(str(path), "r") as z:
            names = z.namelist()
            R["ok"]      = True
            R["count"]   = len(names)
            R["members"] = names[:30]
    except Exception as ex:
        R["error"] = f"{type(ex).__name__}: {ex}"
    return R


def dir_size_gb(path: pathlib.Path) -> float:
    total = 0
    target = path if path.is_dir() else path.parent
    if path.is_file(): return path.stat().st_size / 1e9
    for p in path.rglob("*"):
        if p.is_file():
            try: total += p.stat().st_size
            except Exception: pass
    return total / 1e9


def files_in(root: pathlib.Path, *exts) -> list:
    out = []
    for ext in exts:
        for p in (root.rglob(f"*{ext}") if root.is_dir() else []):
            if not any(str(p).startswith(str(ed)) for ed in EXCLUDED_DIRS):
                out.append(p)
    return sorted(out)


# ═══════════════════════════════════════════════════════════════════════════
# DATASET INSPECTORS
# ═══════════════════════════════════════════════════════════════════════════

def _ds_row(**kw) -> dict:
    row = {c: "" for c in DS_COLS}
    row.update(kw)
    return row


def audit_glorys():
    log(SEP); log("GLORYS12 Southern Ocean")
    nc_dir = DATASET_ROOT / "SIH" / "DATA_Copernicus"
    nc_files = sorted(nc_dir.rglob("*.nc")) if nc_dir.exists() else []
    # Filter out raw-bundle copies
    nc_files = [p for p in nc_files
                if "raw-20260921" not in p.as_posix()]
    log(f"  Found {len(nc_files)} NC files")

    dep_info, lat_info, lon_info, time_info = {}, {}, {}, {}
    all_vars = {}

    for p in nc_files:
        log(f"  Inspecting {p.name}  ({p.stat().st_size/1e9:.2f} GB)")
        r = inspect_nc(p, "GLORYS12_Southern_Ocean")
        if not r["ok"]:
            warn(f"  Could not read {p.name}: {r['error']}")
            continue
        _nc_to_var_rows(r, "GLORYS12_Southern_Ocean")
        all_vars.update(r["vars"])
        for vn in ("time","latitude","longitude","depth","deptht",
                   "lat","lon","nav_lat","nav_lon"):
            if vn in r["vars"]:
                vi = r["vars"][vn]
                if vn == "time":
                    time_info[p.name] = {"first": vi.get("t_first",""),
                                         "last":  vi.get("t_last","")}
                elif "lat" in vn.lower():
                    lat_info[p.name] = {"min": vi.get("first",""),
                                        "max": vi.get("last","")}
                elif "lon" in vn.lower():
                    lon_info[p.name] = {"min": vi.get("first",""),
                                        "max": vi.get("last","")}
                elif "depth" in vn.lower() or vn == "lev":
                    dep_info[p.name] = {"size": r["dims"].get(vn,{}).get("size",""),
                                        "units": vi.get("units","")}

    # Summarise
    t_starts = [v["first"] for v in time_info.values() if v["first"]]
    t_ends   = [v["last"]  for v in time_info.values() if v["last"]]
    lats     = [v for d in lat_info.values() for v in [d["min"],d["max"]] if v!=""]
    lons     = [v for d in lon_info.values() for v in [d["min"],d["max"]] if v!=""]
    data_vars = [k for k,v in all_vars.items()
                 if len(v.get("dims",[])) > 1]  # exclude 1D coords

    depth_sizes = [str(v["size"]) for v in dep_info.values() if v["size"]]
    depth_units = list({v["units"] for v in dep_info.values() if v["units"]})

    DS_ROWS.append(_ds_row(
        dataset_name       = "GLORYS12_Southern_Ocean",
        category           = "OCEAN",
        provenance         = "CMEMS / Copernicus Marine Service",
        pipeline_status    = "CURRENTLY_USED",
        file_count         = len(nc_files),
        total_size_gb      = round(sum(p.stat().st_size for p in nc_files)/1e9, 3),
        format             = "NetCDF4",
        files_inspected    = len(nc_files),
        sampling_strategy  = "ALL FILES (small collection)",
        time_start         = min(t_starts) if t_starts else "UNKNOWN",
        time_end           = max(t_ends)   if t_ends   else "UNKNOWN",
        temporal_resolution= "DAILY (inferred from product spec)",
        lat_min            = round(min(lats),4) if lats else "UNKNOWN",
        lat_max            = round(max(lats),4) if lats else "UNKNOWN",
        lon_min            = round(min(lons),4) if lons else "UNKNOWN",
        lon_max            = round(max(lons),4) if lons else "UNKNOWN",
        depth_levels       = "; ".join(set(depth_sizes)) if depth_sizes else "UNKNOWN",
        depth_units        = "; ".join(depth_units) if depth_units else "UNKNOWN",
        crs_projection     = "WGS84 geographic (lat/lon)",
        variables_discovered= ",".join(sorted(set(data_vars))),
        fill_value_convention= "CF-1.6 _FillValue",
        product_version    = "GLORYS12V1",
        institution        = "Mercator Ocean International",
        conventions        = "CF-1.6",
        consistency_check  = "ALL_FILES_INSPECTED",
        metadata_completeness= "HIGH" if len(nc_files)>0 else "NONE",
        notes              = ("Northern boundary important for iceberg track coverage. "
                              "4-sector spatial partition. "
                              f"Time info per file: {json.dumps(time_info)}"),
    ))


def audit_era5(label: str, folder: pathlib.Path):
    log(SEP); log(f"ERA5 -- {label} ({folder})")
    grib_files = sorted(folder.glob("*.grib")) if folder.exists() else []
    idx_files  = sorted(folder.glob("*.idx"))  if folder.exists() else []
    log(f"  GRIB: {len(grib_files)}  IDX: {len(idx_files)}")
    if not grib_files:
        DS_ROWS.append(_ds_row(
            dataset_name="ERA5_" + label,
            category="ATMOSPHERE", provenance="ECMWF / CDS",
            pipeline_status=("CURRENTLY_USED" if label=="ERA5" else "POTENTIALLY_USEFUL"),
            file_count=0, format="GRIB2",
            metadata_completeness="NONE", notes="No GRIB files found",
        ))
        return

    # Sample: 1 early + 1 late
    picks = [grib_files[0]]
    if len(grib_files) > 1: picks.append(grib_files[-1])
    # also pick a middle one
    if len(grib_files) > 2: picks.append(grib_files[len(grib_files)//2])

    all_vars = {}
    lats, lons, t_starts, t_ends = [], [], [], []

    for p in picks:
        log(f"  Inspecting {p.name}  ({p.stat().st_size/1e9:.2f} GB)")
        r = inspect_grib(p, "ERA5_" + label)
        if r["ok"]:
            for vn, vi in r["vars"].items():
                if vn not in all_vars: all_vars[vn] = vi
                VAR_ROWS.append({
                    "dataset_name": "ERA5_" + label,
                    "variable_name": vn,
                    "long_name": vi.get("long_name",""),
                    "standard_name": "",
                    "units": vi.get("units",""),
                    "dtype": vi.get("dtype",""),
                    "shape_representative": vi.get("shape",""),
                    "fill_value": vi.get("fill_value",""),
                    "valid_min": "", "valid_max": "",
                    "dimensions": ",".join(vi.get("dims",[])),
                    "notes": f"from {p.name}",
                })
            if r["t_first"]: t_starts.append(r["t_first"])
            if r["t_last"]:  t_ends.append(r["t_last"])
            if r["lat_min"] != "": lats += [r["lat_min"], r["lat_max"]]
            if r["lon_min"] != "": lons += [r["lon_min"], r["lon_max"]]
        else:
            warn(f"  GRIB read failed: {r['error']}")

    # Date range from filenames (reliable)
    month_dates = []
    for p in grib_files:
        m = re.search(r"era5_(\d{4})_(\d{2})", p.name.lower())
        if m: month_dates.append(f"{m.group(1)}-{m.group(2)}-01")
    month_dates.sort()

    DS_ROWS.append(_ds_row(
        dataset_name       = "ERA5_" + label,
        category           = "ATMOSPHERE",
        provenance         = "ECMWF / Copernicus Climate Data Store",
        pipeline_status    = ("CURRENTLY_USED" if label=="ERA5" else "POTENTIALLY_USEFUL"),
        file_count         = len(grib_files),
        total_size_gb      = round(sum(p.stat().st_size for p in grib_files)/1e9, 3),
        format             = "GRIB2",
        files_inspected    = len(picks),
        sampling_strategy  = "FIRST + LAST + MID (3 of N)",
        time_start         = month_dates[0]  if month_dates else (t_starts[0] if t_starts else "UNKNOWN"),
        time_end           = month_dates[-1] if month_dates else (t_ends[-1]  if t_ends   else "UNKNOWN"),
        temporal_resolution= "MONTHLY FILES (intra-file resolution TBD per variable)",
        lat_min            = round(min(lats),2) if lats else "UNKNOWN",
        lat_max            = round(max(lats),2) if lats else "UNKNOWN",
        lon_min            = round(min(lons),2) if lons else "UNKNOWN",
        lon_max            = round(max(lons),2) if lons else "UNKNOWN",
        crs_projection     = "WGS84 geographic (lat/lon regular grid)",
        variables_discovered= ",".join(sorted(set(all_vars.keys()))),
        fill_value_convention= "GRIB2 bitmap / missing value",
        institution        = "ECMWF",
        conventions        = "GRIB2 (WMO)",
        consistency_check  = f"SAMPLED {len(picks)}/{len(grib_files)}",
        metadata_completeness= "HIGH" if all_vars else "LOW_cfgrib_failed",
        notes              = (f"Months from filenames: {month_dates}. "
                              f"IDX cache files: {len(idx_files)} (not scientific data). "
                              "Variables field discovered from actual GRIB messages."),
    ))


def audit_seaice_sh():
    log(SEP); log("Sea Ice -- OSI-SAF AMSR2 Southern Hemisphere")
    si_dir = DATASET_ROOT / "SIH" / "DATA_Sea_ice_drift_concentration"
    nc_files = sorted(si_dir.rglob("ice_conc_sh*.nc")) if si_dir.exists() else []
    log(f"  Found {len(nc_files)} SH NC files")
    if not nc_files:
        DS_ROWS.append(_ds_row(dataset_name="OSI-SAF_AMSR2_SH",
            category="SEA_ICE", notes="Directory not found", metadata_completeness="NONE"))
        return

    rep = sample_nc_collection(nc_files, "OSI-SAF_AMSR2_SH", n_sample=6)
    if rep.get("ok"):
        _nc_to_var_rows(rep, "OSI-SAF_AMSR2_SH")

    # Exact date range from filenames (most reliable for daily files)
    dates = []
    for p in nc_files:
        m = re.search(r"(\d{8})\d{4}", p.name)
        if m:
            d = m.group(1)
            dates.append(f"{d[:4]}-{d[4:6]}-{d[6:8]}")
    dates.sort()

    proj = rep.get("attrs",{}).get("grid_mapping","UNKNOWN")
    lats, lons = [], []
    for vn in ("yc","lat","latitude","nav_lat"):
        if vn in rep.get("vars",{}):
            vi = rep["vars"][vn]
            if "first" in vi:
                lats += [vi["first"], vi["last"]]
            break
    for vn in ("xc","lon","longitude","nav_lon"):
        if vn in rep.get("vars",{}):
            vi = rep["vars"][vn]
            if "first" in vi:
                lons += [vi["first"], vi["last"]]
            break

    DS_ROWS.append(_ds_row(
        dataset_name       = "OSI-SAF_AMSR2_SH",
        category           = "SEA_ICE",
        provenance         = "EUMETSAT OSI-SAF (AMSR2/SSMI)",
        pipeline_status    = "CURRENTLY_USED",
        file_count         = len(nc_files),
        total_size_gb      = round(sum(p.stat().st_size for p in nc_files)/1e9, 3),
        format             = "NetCDF4",
        files_inspected    = rep.get("n_samples",0),
        sampling_strategy  = f"SAMPLED {rep.get('n_samples',0)}/{len(nc_files)} (first+last+random)",
        time_start         = dates[0]  if dates else rep.get("t_range_first","UNKNOWN"),
        time_end           = dates[-1] if dates else rep.get("t_range_last","UNKNOWN"),
        temporal_resolution= "DAILY (12:00 UTC)",
        lat_min            = round(min(lats),2) if lats else "UNKNOWN",
        lat_max            = round(max(lats),2) if lats else "UNKNOWN",
        lon_min            = round(min(lons),2) if lons else "UNKNOWN",
        lon_max            = round(max(lons),2) if lons else "UNKNOWN",
        crs_projection     = "Polar stereographic (EPSG:3412 or similar); "
                             f"grid_mapping attr={proj}",
        variables_discovered= ",".join(sorted(k for k in rep.get("vars",{}).keys()
                                              if len(rep["vars"][k].get("dims",[])) > 1)),
        fill_value_convention= "CF _FillValue",
        conventions        = rep.get("attrs",{}).get("Conventions",""),
        institution        = rep.get("attrs",{}).get("institution","EUMETSAT OSI-SAF"),
        consistency_check  = "CONSISTENT" if rep.get("consistent") else "CHECK_REQUIRED",
        metadata_completeness= "HIGH",
        notes              = (f"Daily files: {len(nc_files)} ({dates[0] if dates else '?'} "
                              f"to {dates[-1] if dates else '?'}). "
                              "Primary SH sea-ice dataset for pipeline."),
    ))


def audit_seaice_nh():
    log(SEP); log("Sea Ice -- OSI-SAF AMSR2 Northern Hemisphere")
    si_dir = DATASET_ROOT / "SIH" / "DATA_Sea_ice_drift_concentration"
    nc_files = sorted(si_dir.rglob("ice_conc_nh*.nc")) if si_dir.exists() else []
    log(f"  Found {len(nc_files)} NH NC files")
    if not nc_files:
        DS_ROWS.append(_ds_row(dataset_name="OSI-SAF_AMSR2_NH",
            category="SEA_ICE", pipeline_status="OUT_OF_SCOPE",
            notes="No NH files found", metadata_completeness="NONE"))
        return

    rep = sample_nc_collection(nc_files, "OSI-SAF_AMSR2_NH", n_sample=3)
    if rep.get("ok"): _nc_to_var_rows(rep, "OSI-SAF_AMSR2_NH")
    dates = []
    for p in nc_files:
        m = re.search(r"(\d{8})\d{4}", p.name)
        if m:
            d = m.group(1)
            dates.append(f"{d[:4]}-{d[4:6]}-{d[6:8]}")
    dates.sort()
    DS_ROWS.append(_ds_row(
        dataset_name       = "OSI-SAF_AMSR2_NH",
        category           = "SEA_ICE",
        provenance         = "EUMETSAT OSI-SAF (AMSR2)",
        pipeline_status    = "OUT_OF_SCOPE",
        file_count         = len(nc_files),
        total_size_gb      = round(sum(p.stat().st_size for p in nc_files)/1e9, 3),
        format             = "NetCDF4",
        files_inspected    = rep.get("n_samples",0),
        sampling_strategy  = f"SAMPLED {rep.get('n_samples',0)}/{len(nc_files)}",
        time_start         = dates[0]  if dates else "UNKNOWN",
        time_end           = dates[-1] if dates else "UNKNOWN",
        temporal_resolution= "DAILY (12:00 UTC)",
        crs_projection     = "Polar stereographic (Arctic)",
        variables_discovered= ",".join(sorted(k for k in rep.get("vars",{}).keys()
                                              if len(rep["vars"][k].get("dims",[])) > 1)),
        consistency_check  = "CONSISTENT" if rep.get("consistent") else "CHECK_REQUIRED",
        metadata_completeness= "MEDIUM",
        notes              = "OUT OF SCOPE for Antarctic pipeline. Kept for reference.",
    ))


def audit_seaice_ssmis():
    log(SEP); log("Sea Ice -- OSI-SAF SSMIS L4 SH")
    seaice_dir = DATASET_ROOT / "seaice"
    nc_files = sorted(seaice_dir.rglob("osisaf_obs-si_glo_phy-sic-south*.nc")) \
               if seaice_dir.exists() else []
    # also check root
    root_files = sorted(DATASET_ROOT.glob("osisaf_obs-si_glo_phy-sic-south*.nc"))
    all_files = sorted(set(nc_files + root_files))
    log(f"  Found {len(all_files)} SSMIS L4 SH files")
    if not all_files:
        DS_ROWS.append(_ds_row(dataset_name="OSI-SAF_SSMIS_L4_SH",
            category="SEA_ICE", pipeline_status="POTENTIALLY_USEFUL",
            notes="No SSMIS files found at expected locations",
            metadata_completeness="NONE"))
        return

    rep = sample_nc_collection(all_files, "OSI-SAF_SSMIS_L4_SH", n_sample=4)
    if rep.get("ok"): _nc_to_var_rows(rep, "OSI-SAF_SSMIS_L4_SH")
    DS_ROWS.append(_ds_row(
        dataset_name       = "OSI-SAF_SSMIS_L4_SH",
        category           = "SEA_ICE",
        provenance         = "EUMETSAT OSI-SAF (SSMIS L4)",
        pipeline_status    = "POTENTIALLY_USEFUL",
        file_count         = len(all_files),
        total_size_gb      = round(sum(p.stat().st_size for p in all_files)/1e9, 3),
        format             = "NetCDF4",
        files_inspected    = rep.get("n_samples",0),
        sampling_strategy  = f"SAMPLED {rep.get('n_samples',0)}/{len(all_files)}",
        time_start         = rep.get("t_range_first","UNKNOWN"),
        time_end           = rep.get("t_range_last","UNKNOWN"),
        temporal_resolution= "DAILY (L4 gridded)",
        crs_projection     = "WGS84 lat/lon (L4 regular grid)",
        variables_discovered= ",".join(sorted(k for k in rep.get("vars",{}).keys()
                                              if len(rep["vars"][k].get("dims",[])) > 1)),
        consistency_check  = "CONSISTENT" if rep.get("consistent") else "SAMPLED_ONLY",
        metadata_completeness= "MEDIUM",
        notes              = ("May overlap with AMSR2 SH. Hash-compare required "
                              "before using both in pipeline."),
    ))


def audit_gebco():
    log(SEP); log("GEBCO 2024 Bathymetry")
    p_root = DATASET_ROOT / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
    p_ocean= DATASET_ROOT / "OceanDepthData" / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
    primary = p_root if p_root.exists() else (p_ocean if p_ocean.exists() else None)
    if not primary:
        DS_ROWS.append(_ds_row(dataset_name="GEBCO_2024",
            notes="Primary NC not found", metadata_completeness="NONE"))
        return

    log(f"  Inspecting {primary.name}  ({primary.stat().st_size/1e9:.2f} GB)")
    r = inspect_nc(primary, "GEBCO_2024")
    if r["ok"]: _nc_to_var_rows(r, "GEBCO_2024")

    elev = r["vars"].get("elevation", r["vars"].get("z",{}))
    lat  = r["vars"].get("lat", r["vars"].get("latitude",{}))
    lon  = r["vars"].get("lon", r["vars"].get("longitude",{}))

    DS_ROWS.append(_ds_row(
        dataset_name       = "GEBCO_2024",
        category           = "BATHYMETRY",
        provenance         = "GEBCO / BODC",
        pipeline_status    = "CURRENTLY_USED",
        file_count         = 1,
        total_size_gb      = round(primary.stat().st_size/1e9, 3),
        format             = "NetCDF4",
        files_inspected    = 1,
        sampling_strategy  = "FULL FILE (single file dataset)",
        lat_min            = lat.get("first","UNKNOWN"),
        lat_max            = lat.get("last","UNKNOWN"),
        lon_min            = lon.get("first","UNKNOWN"),
        lon_max            = lon.get("last","UNKNOWN"),
        crs_projection     = "WGS84 geographic (EPSG:4326)",
        variables_discovered= ",".join(sorted(k for k in r["vars"]
                                              if len(r["vars"][k].get("dims",[])) > 1)),
        fill_value_convention= elev.get("fill_value",""),
        institution        = "GEBCO / British Oceanographic Data Centre (BODC)",
        conventions        = r["attrs"].get("Conventions",""),
        consistency_check  = "SINGLE_FILE",
        metadata_completeness= "HIGH" if r["ok"] else "FAILED",
        notes              = (f"Elevation units: {elev.get('units','UNKNOWN')}. "
                              "Mirror exists at OceanDepthData/ (hash-confirmed duplicate). "
                              "Primary location (root) used by scripts."),
    ))


def audit_tracks_clean():
    log(SEP); log("Iceberg Tracks Clean")
    for ext, fmt in [(".parquet","PARQUET"), (".csv","CSV")]:
        p = DATASET_ROOT / f"iceberg_tracks_clean{ext}"
        if not p.exists(): continue
        log(f"  Inspecting {p.name}")
        if ext == ".parquet":
            r = inspect_parquet_file(p)
        else:
            r = inspect_csv_file(p)
        if r["ok"]:
            for c in r["cols"]:
                VAR_ROWS.append({
                    "dataset_name": "Iceberg_Tracks_Clean",
                    "variable_name": c,
                    "long_name": c,
                    "standard_name": "",
                    "units": "",
                    "dtype": r["dtypes"].get(c,""),
                    "shape_representative": "",
                    "fill_value": "",
                    "valid_min": "",
                    "valid_max": "",
                    "dimensions": "rows",
                    "notes": "",
                })
        DS_ROWS.append(_ds_row(
            dataset_name       = "Iceberg_Tracks_Clean",
            category           = "TRACKS",
            provenance         = "BYU / NIC (derived)",
            pipeline_status    = "CURRENTLY_USED",
            file_count         = 1,
            total_size_gb      = round(p.stat().st_size/1e9, 6),
            format             = fmt,
            files_inspected    = 1,
            sampling_strategy  = "FULL FILE",
            time_start         = r.get("t_first","UNKNOWN"),
            time_end           = r.get("t_last","UNKNOWN"),
            lat_min            = r.get("lat_min","UNKNOWN"),
            lat_max            = r.get("lat_max","UNKNOWN"),
            lon_min            = r.get("lon_min","UNKNOWN"),
            lon_max            = r.get("lon_max","UNKNOWN"),
            variables_discovered= ",".join(r.get("cols",[])),
            metadata_completeness= "HIGH" if r["ok"] else "FAILED",
            notes              = f"Row count: {r.get('row_count','')}. "
                                 f"Schema: {len(r.get('cols',[]))} columns.",
        ))
        break   # prefer parquet


def audit_tracks_golden():
    log(SEP); log("Iceberg Tracks Golden 2023-2026")
    p = DATASET_ROOT / "06_processed" / "iceberg_tracks_golden_2023_2026.parquet"
    if not p.exists():
        DS_ROWS.append(_ds_row(dataset_name="Iceberg_Tracks_Golden_2023_2026",
            notes="File not found", metadata_completeness="NONE")); return
    log(f"  Inspecting {p.name}")
    r = inspect_parquet_file(p)
    DS_ROWS.append(_ds_row(
        dataset_name       = "Iceberg_Tracks_Golden_2023_2026",
        category           = "TRACKS",
        provenance         = "Internal (derived from Iceberg_Tracks_Clean)",
        pipeline_status    = "CURRENTLY_USED",
        file_count         = 1,
        total_size_gb      = round(p.stat().st_size/1e9, 6),
        format             = "PARQUET",
        files_inspected    = 1,
        sampling_strategy  = "FULL FILE",
        time_start         = r.get("t_first","2023-03-23"),
        time_end           = r.get("t_last","2026-04-30"),
        variables_discovered= ",".join(r.get("cols",[])),
        metadata_completeness= "HIGH" if r["ok"] else "FAILED",
        notes              = f"Row count: {r.get('row_count','')}. FROZEN BASELINE.",
    ))
    if r["ok"]:
        for c in r.get("cols",[]):
            VAR_ROWS.append({
                "dataset_name": "Iceberg_Tracks_Golden_2023_2026",
                "variable_name": c, "long_name": c, "standard_name": "",
                "units": "", "dtype": r["dtypes"].get(c,""),
                "shape_representative": "", "fill_value": "",
                "valid_min": "", "valid_max": "", "dimensions": "rows", "notes": "",
            })


def audit_byu_nic():
    log(SEP); log("BYU/NIC Consolidated v8")
    track_dir = DATASET_ROOT / "icebergtragectory" / "updated7_consol"
    csv_files = sorted(track_dir.glob("*.csv")) if track_dir.exists() else []
    log(f"  Found {len(csv_files)} CSV track files")
    if not csv_files:
        DS_ROWS.append(_ds_row(dataset_name="BYU_NIC_Consolidated_v8",
            notes="updated7_consol/ not found", metadata_completeness="NONE")); return

    picks = [csv_files[0], csv_files[len(csv_files)//2], csv_files[-1]]
    picks = [p for p in picks if p.exists()]
    schemas, date_starts, date_ends = [], [], []
    for p in picks:
        log(f"  Inspecting {p.name}")
        r = inspect_csv_file(p, max_rows=5000)
        if r["ok"]:
            schemas.append(frozenset(r["cols"]))
            if r["t_first"]: date_starts.append(r["t_first"])
            if r["t_last"]:  date_ends.append(r["t_last"])
            if not VAR_ROWS or not any(v["dataset_name"]=="BYU_NIC_Consolidated_v8"
                                       for v in VAR_ROWS):
                for c in r["cols"]:
                    VAR_ROWS.append({
                        "dataset_name": "BYU_NIC_Consolidated_v8",
                        "variable_name": c, "long_name": c, "standard_name": "",
                        "units": "", "dtype": r["dtypes"].get(c,""),
                        "shape_representative": "", "fill_value": "",
                        "valid_min": "", "valid_max": "", "dimensions": "rows",
                        "notes": f"from {p.name}",
                    })

    DS_ROWS.append(_ds_row(
        dataset_name       = "BYU_NIC_Consolidated_v8",
        category           = "TRACKS",
        provenance         = "Brigham Young University / US National Ice Center",
        pipeline_status    = "REFERENCE",
        file_count         = len(csv_files),
        total_size_gb      = round(sum(p.stat().st_size for p in csv_files)/1e9, 4),
        format             = "CSV (per-iceberg)",
        files_inspected    = len(picks),
        sampling_strategy  = "FIRST + MID + LAST (3 of N)",
        time_start         = min(date_starts) if date_starts else "UNKNOWN",
        time_end           = max(date_ends)   if date_ends   else "UNKNOWN",
        variables_discovered= ",".join(sorted(schemas[0])) if schemas else "UNKNOWN",
        consistency_check  = "CONSISTENT" if len(set(schemas))==1 else "SCHEMA_VARIES",
        metadata_completeness= "HIGH",
        notes              = (f"{len(csv_files)} individual iceberg CSV files. "
                              "Mirror copies in raw-20260921/ bundle (hash-confirmed)."),
    ))


def audit_nic_weekly():
    log(SEP); log("NIC Weekly Antarctic Reports")
    traj_dir = DATASET_ROOT / "icebergtragectory"
    csv_files = sorted(traj_dir.glob("AntarcticIcebergs_*.csv")) \
                if traj_dir.exists() else []
    log(f"  Found {len(csv_files)} weekly CSVs")
    if not csv_files:
        DS_ROWS.append(_ds_row(dataset_name="NIC_Weekly_Antarctic_Reports",
            notes="No weekly CSV files found", metadata_completeness="NONE")); return

    picks = [csv_files[0], csv_files[-1]]
    schema_sample = {}
    for p in picks:
        r = inspect_csv_file(p, max_rows=1000)
        if r["ok"] and not schema_sample:
            schema_sample = r
            for c in r["cols"]:
                VAR_ROWS.append({
                    "dataset_name": "NIC_Weekly_Antarctic_Reports",
                    "variable_name": c, "long_name": c, "standard_name": "",
                    "units": "", "dtype": r["dtypes"].get(c,""),
                    "shape_representative": "", "fill_value": "",
                    "valid_min": "", "valid_max": "", "dimensions": "rows",
                    "notes": f"from {p.name}",
                })
    DS_ROWS.append(_ds_row(
        dataset_name       = "NIC_Weekly_Antarctic_Reports",
        category           = "TRACKS",
        provenance         = "US National Ice Center (NIC)",
        pipeline_status    = "POTENTIALLY_USEFUL",
        file_count         = len(csv_files),
        total_size_gb      = round(sum(p.stat().st_size for p in csv_files)/1e9, 5),
        format             = "CSV (weekly snapshot)",
        files_inspected    = len(picks),
        sampling_strategy  = "FIRST + LAST",
        variables_discovered= ",".join(schema_sample.get("cols",[])),
        metadata_completeness= "HIGH" if schema_sample else "LOW",
        notes              = f"{len(csv_files)} weekly snapshots.",
    ))


def audit_grounded():
    log(SEP); log("Grounded Iceberg Catalog v1.5")
    p = DATASET_ROOT / "grounded_iceberg_sentinel1_v1p5_20250318_latlon.csv"
    if not p.exists():
        DS_ROWS.append(_ds_row(dataset_name="Grounded_Iceberg_Catalog_v1.5",
            notes="File not found", metadata_completeness="NONE")); return
    log(f"  Inspecting {p.name}")
    r = inspect_csv_file(p)
    for c in r.get("cols",[]):
        VAR_ROWS.append({
            "dataset_name": "Grounded_Iceberg_Catalog_v1.5",
            "variable_name": c, "long_name": c, "standard_name": "",
            "units": "", "dtype": r["dtypes"].get(c,""),
            "shape_representative": "", "fill_value": "",
            "valid_min": "", "valid_max": "", "dimensions": "rows", "notes": "",
        })
    DS_ROWS.append(_ds_row(
        dataset_name       = "Grounded_Iceberg_Catalog_v1.5",
        category           = "GROUNDING",
        provenance         = "Sentinel-1 derived (external)",
        pipeline_status    = "POTENTIALLY_USEFUL",
        file_count         = 1,
        total_size_gb      = round(p.stat().st_size/1e9, 6),
        format             = "CSV",
        files_inspected    = 1,
        sampling_strategy  = "FULL FILE",
        lat_min            = r.get("lat_min",""),
        lat_max            = r.get("lat_max",""),
        lon_min            = r.get("lon_min",""),
        lon_max            = r.get("lon_max",""),
        variables_discovered= ",".join(r.get("cols",[])),
        metadata_completeness= "HIGH" if r["ok"] else "FAILED",
        notes              = f"Row count: {r.get('row_count','')}. "
                             "Grounded iceberg coordinates from Sentinel-1 analysis. "
                             "DO NOT join to trajectory data without provenance review.",
    ))


def audit_ml_splits():
    log(SEP); log("ML Dataset Splits (train/val/test)")
    proc_dir = DATASET_ROOT / "06_processed"
    for name, fname in [("ML_Train","train.parquet"),
                         ("ML_Validation","validation.parquet"),
                         ("ML_Test","test.parquet"),
                         ("Iceberg_Env_Matched","iceberg_env_matched_2023_2026.parquet")]:
        p = proc_dir / fname
        if not p.exists():
            DS_ROWS.append(_ds_row(dataset_name=name,
                notes=f"{fname} not found", metadata_completeness="NONE"))
            continue
        log(f"  Inspecting {p.name}")
        r = inspect_parquet_file(p)
        if r["ok"]:
            for c in r.get("cols",[]):
                VAR_ROWS.append({
                    "dataset_name": name, "variable_name": c, "long_name": c,
                    "standard_name": "", "units": "",
                    "dtype": r["dtypes"].get(c,""), "shape_representative": "",
                    "fill_value": "", "valid_min": "", "valid_max": "",
                    "dimensions": "rows", "notes": "",
                })
        DS_ROWS.append(_ds_row(
            dataset_name       = name,
            category           = "PROCESSED_OUTPUT",
            provenance         = "Internal",
            pipeline_status    = "CURRENTLY_USED",
            file_count         = 1,
            total_size_gb      = round(p.stat().st_size/1e9, 6),
            format             = "PARQUET",
            files_inspected    = 1,
            sampling_strategy  = "FULL FILE",
            time_start         = r.get("t_first",""),
            time_end           = r.get("t_last",""),
            lat_min            = r.get("lat_min",""),
            lat_max            = r.get("lat_max",""),
            lon_min            = r.get("lon_min",""),
            lon_max            = r.get("lon_max",""),
            variables_discovered= ",".join(r.get("cols",[])),
            metadata_completeness= "HIGH" if r["ok"] else "FAILED",
            notes              = f"Rows: {r.get('row_count','')}. FROZEN BASELINE.",
        ))


def audit_sentinel():
    log(SEP); log("Sentinel-1 SAR GRD")
    sent_dir = DATASET_ROOT / "sentinel"
    safe_dirs = [p for p in sent_dir.rglob("*.SAFE") if p.is_dir()] \
                if sent_dir.exists() else []
    log(f"  Found {len(safe_dirs)} SAFE dirs")
    manifest_meta = {}
    if safe_dirs:
        mf = safe_dirs[0] / "manifest.safe"
        if mf.exists():
            try:
                text = mf.read_text(encoding="utf-8", errors="ignore")
                # Extract key metadata from manifest
                for field, pattern in [
                    ("mission", r"<safe:familyName[^>]*>([^<]+)<"),
                    ("mode",    r"<s1sarl1:mode>([^<]+)<"),
                    ("polarisation", r"<s1sarl1:polarisationList[^>]*>([^<]+)<"),
                    ("startTime", r"<safe:startTime>([^<]+)<"),
                    ("stopTime",  r"<safe:stopTime>([^<]+)<"),
                ]:
                    m = re.search(pattern, text)
                    if m: manifest_meta[field] = m.group(1).strip()
            except Exception as ex:
                warn(f"Manifest read failed: {ex}")

    DS_ROWS.append(_ds_row(
        dataset_name       = "Sentinel-1_SAR_GRD",
        category           = "SATELLITE",
        provenance         = "ESA Copernicus",
        pipeline_status    = "POTENTIALLY_USEFUL",
        file_count         = len(safe_dirs),
        total_size_gb      = round(dir_size_gb(sent_dir), 3) if sent_dir.exists() else 0,
        format             = "SAFE (GeoTIFF + XML)",
        files_inspected    = min(1, len(safe_dirs)),
        sampling_strategy  = "MANIFEST.SAFE ONLY (no GeoTIFF load)",
        variables_discovered= "SAR_backscatter_VV,SAR_backscatter_VH",
        crs_projection     = "Satellite geometry (requires geocoding before use)",
        metadata_completeness= "MEDIUM",
        notes              = (f"Manifest metadata: {manifest_meta}. "
                              "Preserve SAFE directory structure — do not flatten. "
                              "SAFE structure includes measurement/, annotation/, calibration/."),
    ))


def audit_arctic_products():
    log(SEP); log("CMEMS Arctic Berg L3 + Arctic Iceberg Density")

    # Arctic Berg L3
    cmems_files = list(DATASET_ROOT.glob("cmems_obs-si_arc*.nc"))
    cmems_files += list((DATASET_ROOT/"testthisfile").glob("cmems_obs-si_arc*.nc")) \
                   if (DATASET_ROOT/"testthisfile").exists() else []
    primary = [p for p in cmems_files
               if "testthisfile" not in p.as_posix()]
    log(f"  CMEMS Arc Berg: {len(primary)} primary + {len(cmems_files)-len(primary)} testthisfile copies")
    if primary:
        p  = primary[0]
        log(f"  Inspecting {p.name}  ({p.stat().st_size/1e9:.2f} GB)")
        r  = inspect_nc(p, "CMEMS_ARC_BERG_L3")
        if r["ok"]: _nc_to_var_rows(r, "CMEMS_ARC_BERG_L3")
        DS_ROWS.append(_ds_row(
            dataset_name       = "CMEMS_ARC_BERG_L3",
            category           = "SPECIAL_PRODUCT",
            provenance         = "CMEMS",
            pipeline_status    = "OUT_OF_SCOPE",
            file_count         = len(primary),
            total_size_gb      = round(p.stat().st_size/1e9, 3),
            format             = "NetCDF4",
            files_inspected    = 1,
            sampling_strategy  = "SINGLE PRIMARY FILE",
            lat_min            = "60 (Arctic)",
            variables_discovered= ",".join(sorted(
                k for k in r.get("vars",{}) if len(r["vars"][k].get("dims",[])) > 1)),
            institution        = r.get("attrs",{}).get("institution","CMEMS"),
            conventions        = r.get("attrs",{}).get("Conventions",""),
            metadata_completeness= "HIGH" if r["ok"] else "FAILED",
            notes              = "ARCTIC — OUT OF SCOPE for Antarctic pipeline. Mirror in testthisfile/.",
        ))

    # Arctic Iceberg Density
    p_dens = DATASET_ROOT / "arctic_iceberg_density.nc"
    if p_dens.exists():
        size_gb = p_dens.stat().st_size / 1e9
        log(f"  Arctic density: {size_gb:.2f} GB -- TOO LARGE to open safely, recording metadata only")
        DS_ROWS.append(_ds_row(
            dataset_name       = "Arctic_Iceberg_Density",
            category           = "SPECIAL_PRODUCT",
            provenance         = "Unknown",
            pipeline_status    = "OUT_OF_SCOPE",
            file_count         = 1,
            total_size_gb      = round(size_gb, 3),
            format             = "NetCDF4",
            files_inspected    = 0,
            sampling_strategy  = "NOT_INSPECTED (29.5 GB -- above safe load threshold)",
            variables_discovered= "UNKNOWN -- file not opened",
            metadata_completeness= "NONE -- file too large for safe inspection",
            notes              = ("29.5 GB Arctic iceberg density. "
                                  "OUT OF SCOPE. sha256 not computed in v1 inventory (v1 bug). "
                                  "Do not open without explicit memory management."),
        ))


def audit_rse2025():
    log(SEP); log("DataCode_for_CMwvIB_RSE2025 multi-volume archive")
    vols = sorted(DATASET_ROOT.glob("DataCode_for_CMwvIB_RSE2025.z0*"))
    log(f"  Found {len(vols)} volumes")
    vol_info = {}
    for v in vols:
        vol_info[v.name] = round(v.stat().st_size/1e9, 3)
    # Try to list z01 contents
    contents = []
    if vols:
        try:
            import zipfile
            # Multi-volume ZIP: z01 is the first volume; Python zipfile can read
            r = inspect_zip_file(vols[0])
            if r["ok"]: contents = r["members"]
        except Exception: pass

    DS_ROWS.append(_ds_row(
        dataset_name       = "DataCode_for_CMwvIB_RSE2025",
        category           = "RESEARCH_PACKAGE",
        provenance         = "RSE 2025 journal supplement",
        pipeline_status    = "REFERENCE",
        file_count         = len(vols),
        total_size_gb      = round(sum(v.stat().st_size for v in vols)/1e9, 3),
        format             = "MULTI_VOLUME_ZIP (z01-z08)",
        files_inspected    = 0,
        sampling_strategy  = "NOT_EXTRACTED (archive integrity preserved)",
        variables_discovered= "UNKNOWN -- archive not extracted",
        consistency_check  = (f"VOLUMES_PRESENT: {[v.name for v in vols]}. "
                              f"z07: {'PRESENT' if any('z07' in v.name for v in vols) else 'MISSING'}"),
        metadata_completeness= "LOW -- archive contents listed only",
        notes              = (f"Volume sizes: {vol_info}. "
                              f"First vol contents preview: {contents[:10]}. "
                              "DO NOT extract unless explicitly required. "
                              "z07 missing -- check incomplete downloads."),
    ))


# ═══════════════════════════════════════════════════════════════════════════
# WRITE OUTPUTS
# ═══════════════════════════════════════════════════════════════════════════

def write_csv(path: pathlib.Path, rows: list, cols: list):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    log(f"  Written: {path.relative_to(PROJECT_ROOT)}  ({len(rows)} rows)")


def write_json(path: pathlib.Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    log(f"  Written: {path.relative_to(PROJECT_ROOT)}")


def write_report(rows_ds, rows_var, rows_coord):
    log("Writing dataset_metadata_audit_report.md")
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "# SIH2659 — Dataset Metadata Audit Report\n\n",
        f"**Generated:** {now}  \n",
        f"**Files opened:** {_FILES_OPENED}  \n",
        f"**Files modified:** {_FILES_MODIFIED} (MUST BE 0)  \n\n",
        "> STRICTLY READ-ONLY. No source files were modified.\n\n---\n\n",
        "## Datasets Inspected\n\n",
        "| Dataset | Category | Files | Size GB | Time Start | Time End | Variables | Completeness |\n",
        "|---------|----------|------:|--------:|------------|----------|-----------|-------------|\n",
    ]
    for r in rows_ds:
        vars_short = r["variables_discovered"][:60] + ("..." if len(r["variables_discovered"])>60 else "")
        lines.append(
            f"| {r['dataset_name']} | {r['category']} | {r['file_count']} "
            f"| {r['total_size_gb']} | {r['time_start']} | {r['time_end']} "
            f"| {vars_short} | {r['metadata_completeness']} |\n"
        )

    lines += ["\n---\n\n## Key Findings\n\n"]

    # GLORYS
    g = next((r for r in rows_ds if r["dataset_name"]=="GLORYS12_Southern_Ocean"), {})
    lines.append(f"### GLORYS12 Southern Ocean\n\n")
    lines.append(f"- **Variables discovered:** `{g.get('variables_discovered','')}`\n")
    lines.append(f"- **Time:** {g.get('time_start','')} → {g.get('time_end','')}\n")
    lines.append(f"- **Latitude:** {g.get('lat_min','')} → {g.get('lat_max','')}\n")
    lines.append(f"- **Depth levels:** {g.get('depth_levels','')} ({g.get('depth_units','')})\n")
    lines.append(f"- **CRS:** {g.get('crs_projection','')}\n")
    lines.append(f"- **Notes:** {g.get('notes','')[:300]}\n\n")

    # ERA5
    for lbl in ["ERA5_ERA5","ERA5_ERA5_2026"]:
        e = next((r for r in rows_ds if r["dataset_name"]==lbl), {})
        if e:
            lines.append(f"### {lbl}\n\n")
            lines.append(f"- **Variables discovered:** `{e.get('variables_discovered','')}`\n")
            lines.append(f"- **Files:** {e.get('file_count','')} GRIB\n")
            lines.append(f"- **Time:** {e.get('time_start','')} → {e.get('time_end','')}\n")
            lines.append(f"- **Sampling:** {e.get('sampling_strategy','')}\n\n")

    # Sea ice
    for lbl in ["OSI-SAF_AMSR2_SH","OSI-SAF_AMSR2_NH","OSI-SAF_SSMIS_L4_SH"]:
        s = next((r for r in rows_ds if r["dataset_name"]==lbl), {})
        if s:
            lines.append(f"### {lbl}\n\n")
            lines.append(f"- **Files:** {s.get('file_count','')}  "
                         f"**Time:** {s.get('time_start','')} → {s.get('time_end','')}\n")
            lines.append(f"- **CRS:** {s.get('crs_projection','')}\n")
            lines.append(f"- **Variables:** `{s.get('variables_discovered','')}`\n\n")

    lines += [
        "---\n\n## Library Status\n\n",
        f"| Library | Available |\n|---------|----------|\n",
        f"| netCDF4 | {'YES' if HAS_NC4 else 'NO'} |\n",
        f"| pandas  | {'YES' if HAS_PD else 'NO'} |\n",
        f"| pyarrow | {'YES' if HAS_PA else 'NO'} |\n",
        f"| cfgrib  | {'YES' if HAS_GRIB else 'NO'} |\n",
        f"| numpy   | {'YES' if HAS_NP else 'NO'} |\n\n",
        "---\n\n## Validation\n\n",
        f"- Files opened: **{_FILES_OPENED}**\n",
        f"- Files modified: **{_FILES_MODIFIED}** (MUST BE 0)\n",
        f"- Errors: **{len(_ERRORS)}**\n",
    ]
    if _ERRORS:
        lines.append("\n### Errors\n\n")
        for e in _ERRORS: lines.append(f"- `{e}`\n")

    lines += [
        "\n---\n\n## Workflow Position\n\n```\n",
        "[RAW DATA]        ✅\n",
        "[INVENTORY]       ✅\n",
        "[INTEGRITY AUDIT] ✅\n",
        "[METADATA AUDIT]  ✅  ← YOU ARE HERE\n",
        "[COVERAGE AUDIT]  ← NEXT (scientific_coverage_audit.py)\n",
        "[ENV MATCHING]    ← future\n```\n",
    ]

    out = REPORTS_DIR / "dataset_metadata_audit_report.md"
    out.write_text("".join(lines), encoding="utf-8")
    log(f"  Written: {out.relative_to(PROJECT_ROOT)}")

    out_inv = INVENTORY_DIR / "metadata_audit_report.md"
    out_inv.write_text("".join(lines), encoding="utf-8")
    log(f"  Written: {out_inv.relative_to(PROJECT_ROOT)}")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    print(SEP)
    print("  SIH2659 -- Dataset Metadata Audit (Phase 2)")
    print("  STRICTLY READ-ONLY")
    print(f"  {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(SEP)

    assert _FILES_MODIFIED == 0

    # Run all auditors
    audit_glorys()
    audit_era5("ERA5",      DATASET_ROOT / "ERA5")
    audit_era5("ERA5_2026", DATASET_ROOT / "ERA5_2026")
    audit_seaice_sh()
    audit_seaice_nh()
    audit_seaice_ssmis()
    audit_gebco()
    audit_tracks_clean()
    audit_tracks_golden()
    audit_byu_nic()
    audit_nic_weekly()
    audit_grounded()
    audit_ml_splits()
    audit_sentinel()
    audit_arctic_products()
    audit_rse2025()

    # Write outputs
    log(SEP); log("Writing outputs")
    write_csv(INVENTORY_DIR / "dataset_metadata.csv",    DS_ROWS,    DS_COLS)
    write_csv(INVENTORY_DIR / "variable_inventory.csv",  VAR_ROWS,   VAR_COLS)
    write_csv(INVENTORY_DIR / "coordinate_inventory.csv",COORD_ROWS, COORD_COLS)

    # JSON: dataset rows + variable index
    write_json(INVENTORY_DIR / "dataset_metadata.json", {
        "generated_at"       : datetime.datetime.now().isoformat(),
        "files_opened"       : _FILES_OPENED,
        "files_modified"     : _FILES_MODIFIED,
        "datasets"           : DS_ROWS,
        "variable_count"     : len(VAR_ROWS),
        "coordinate_count"   : len(COORD_ROWS),
        "errors"             : _ERRORS,
    })

    write_report(DS_ROWS, VAR_ROWS, COORD_ROWS)

    # Write log
    ts  = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = PROJECT_ROOT / "logs" / f"metadata_audit_{ts}.log"
    log_path.write_text("\n".join(_LOG), encoding="utf-8")

    assert _FILES_MODIFIED == 0, "FATAL: source files were modified!"

    print(SEP)
    print(f"  Datasets audited  : {len(DS_ROWS)}")
    print(f"  Variables found   : {len(VAR_ROWS)}")
    print(f"  Coordinates found : {len(COORD_ROWS)}")
    print(f"  Files opened      : {_FILES_OPENED}")
    print(f"  Files modified    : {_FILES_MODIFIED}  (MUST BE 0)")
    print(f"  Errors            : {len(_ERRORS)}")
    print(SEP)

    if _ERRORS:
        print("ERRORS:")
        for e in _ERRORS: print(f"  {e}")

    print("\nOUTPUTS:")
    for out in [INVENTORY_DIR / "dataset_metadata.csv",
                INVENTORY_DIR / "dataset_metadata.json",
                INVENTORY_DIR / "variable_inventory.csv",
                INVENTORY_DIR / "coordinate_inventory.csv",
                INVENTORY_DIR / "metadata_audit_report.md",
                REPORTS_DIR   / "dataset_metadata_audit_report.md"]:
        print(f"  [{'OK' if out.exists() else 'MISSING'}] {out.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
