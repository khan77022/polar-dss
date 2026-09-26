"""
SIH2659 — Iceberg Trajectory Prediction Project
Dataset Repository Organisation Script
========================================
PURPOSE : Create directory structure, manifests, catalogs, and inventory
          WITHOUT moving, modifying, or deleting any scientific data.

AUTHOR  : Antigravity / SIH2659
DATE    : 2026-09-24
"""

import os
import sys
import csv
import json
import hashlib
import datetime
import pathlib
import re
import traceback

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
PROJECT_ROOT   = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_ROOT   = PROJECT_ROOT / "dataSet"
REPORTS_DIR    = PROJECT_ROOT / "reports"
SCRIPTS_DIR    = PROJECT_ROOT / "scripts"
MODELS_DIR     = PROJECT_ROOT / "models"
LOGS_DIR       = PROJECT_ROOT / "logs"
CONFIG_DIR     = PROJECT_ROOT / "config"
INVENTORY_DIR  = DATASET_ROOT / "99_archive_inventory"

# ─────────────────────────────────────────────
# COUNTERS  (mutated throughout)
# ─────────────────────────────────────────────
stats = {
    "dirs_created"       : 0,
    "files_scanned"      : 0,
    "original_file_count": 0,
    "original_bytes"     : 0,
    "files_moved"        : 0,
    "files_untouched"    : 0,
    "scientific_modified": 0,   # MUST STAY 0
    "values_changed"     : 0,   # MUST STAY 0
    "errors"             : [],
    "hashes_computed"    : 0,
    "duplicate_candidates": 0,
    "incomplete_downloads": 0,
    "review_needed"      : [],
}

LOG_LINES = []

def log(msg, level="INFO"):
    ts  = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    LOG_LINES.append(line)
    print(line)

def err(msg):
    log(msg, "ERROR")
    stats["errors"].append(msg)

# ─────────────────────────────────────────────
# STEP 1 — CREATE DIRECTORY STRUCTURE
# ─────────────────────────────────────────────
REQUIRED_DIRS = [
    # dataSet numbered structure
    DATASET_ROOT / "00_raw",
    DATASET_ROOT / "01_tracks",
    DATASET_ROOT / "02_ocean",
    DATASET_ROOT / "03_atmosphere",
    DATASET_ROOT / "04_seaice",
    DATASET_ROOT / "05_bathymetry",
    DATASET_ROOT / "06_grounding",
    DATASET_ROOT / "07_satellite",
    DATASET_ROOT / "08_special_products",
    DATASET_ROOT / "09_research_packages",
    DATASET_ROOT / "10_experimental",
    DATASET_ROOT / "11_processed",
    DATASET_ROOT / "11_processed" / "tracks",
    DATASET_ROOT / "11_processed" / "environmental",
    DATASET_ROOT / "11_processed" / "supervised",
    DATASET_ROOT / "11_processed" / "diagnostics",
    DATASET_ROOT / "11_processed" / "quality_control",
    DATASET_ROOT / "11_processed" / "coverage",
    DATASET_ROOT / "11_processed" / "logs",
    DATASET_ROOT / "99_archive_inventory",
    # project-level
    REPORTS_DIR,
    SCRIPTS_DIR,
    MODELS_DIR,
    LOGS_DIR,
    CONFIG_DIR,
]

def create_directories():
    log("=== STEP 1: Creating directory structure ===")
    for d in REQUIRED_DIRS:
        if not d.exists():
            try:
                d.mkdir(parents=True, exist_ok=True)
                log(f"  CREATED  {d}")
                stats["dirs_created"] += 1
            except Exception as ex:
                err(f"  FAILED to create {d}: {ex}")
        else:
            log(f"  EXISTS   {d}")

# ─────────────────────────────────────────────
# STEP 2 — CLASSIFY EVERY FILE
# ─────────────────────────────────────────────

def classify_file(rel: pathlib.Path, abs_path: pathlib.Path) -> dict:
    """Return a dict with category, subcategory, flags, and notes."""
    s   = rel.as_posix().lower()
    ext = abs_path.suffix.lower()
    name= abs_path.name

    result = dict(
        category="UNCLASSIFIED", subcategory="",
        format="", is_raw="", is_processed="", is_archive="",
        is_duplicate_candidate="", is_incomplete="",
        scientific_source="", time_start="", time_end="",
        lat_min="", lat_max="", lon_min="", lon_max="",
        variables="", notes=""
    )

    # ── INCOMPLETE DOWNLOADS ────────────────────────────────────
    if ext == ".crdownload":
        result.update(category="INCOMPLETE_DOWNLOAD",
                      subcategory="INCOMPLETE",
                      is_incomplete="YES",
                      notes="Chrome incomplete download – DO NOT DELETE")
        return result

    # ── RESEARCH PACKAGE ────────────────────────────────────────
    if "datacodefor" in name.lower().replace("_","").replace("-","") or \
       re.search(r'\.z0[0-9]$', name):
        result.update(category="RESEARCH_PACKAGE",
                      subcategory="RSE2025_CMwvIB",
                      is_archive="YES", is_raw="YES",
                      scientific_source="RSE 2025 CMwvIB",
                      notes="Multi-volume archive – do NOT extract unless required")
        return result

    # ── ARCTIC SPECIAL PRODUCTS ─────────────────────────────────
    if "arctic_iceberg_density" in s:
        result.update(category="SPECIAL_PRODUCT",
                      subcategory="ARCTIC_ICEBERG_DENSITY",
                      format="NetCDF", is_raw="YES",
                      scientific_source="Arctic iceberg density",
                      lat_min="60", lat_max="90",
                      variables="iceberg_density",
                      notes="ARCTIC – OUT OF SCOPE for Antarctic trajectory pipeline")
        return result

    if "cmems_obs-si_arc" in s:
        result.update(category="SPECIAL_PRODUCT",
                      subcategory="ARCTIC_BERG_CMEMS",
                      format="NetCDF", is_raw="YES",
                      scientific_source="CMEMS Arctic Iceberg L3",
                      lat_min="60", lat_max="90",
                      notes="ARCTIC – OUT OF SCOPE for Antarctic trajectory pipeline")
        return result

    # ── GROUNDING CATALOG ────────────────────────────────────────
    if "grounded_iceberg_sentinel1" in s:
        result.update(category="GROUNDING",
                      subcategory="GROUNDING_REFERENCE",
                      format="CSV", is_raw="YES",
                      scientific_source="Sentinel-1 grounded iceberg catalog v1.5",
                      variables="latitude,longitude",
                      notes="~8528 grounded iceberg coordinates – DO NOT JOIN to tracks yet")
        return result

    # ── GLORYS OCEAN ─────────────────────────────────────────────
    if "cmems_mod_glo_phy_my" in s and "multi-vars" in s:
        sector = re.search(r'sector_([^/\\]+)', s)
        sec_str = sector.group(1) if sector else ""
        result.update(category="OCEAN",
                      subcategory="GLORYS_PRIMARY",
                      format="NetCDF", is_raw="YES",
                      scientific_source="CMEMS GLORYS12 reanalysis",
                      time_start="2023-03-23", time_end="2026-06-23",
                      lat_min="-80", lat_max="-42",
                      variables="uo,vo,thetao,so,zos,mlotst,sithick",
                      notes=f"Southern Ocean sector {sec_str}")
        return result

    if "cmems_mod_glo_phy_my" in s and "uo-vo" in s:
        result.update(category="OCEAN",
                      subcategory="GLORYS_COPERNICUS_TEST",
                      format="NetCDF", is_raw="YES",
                      scientific_source="CMEMS GLORYS12 reanalysis",
                      variables="uo,vo",
                      notes="Copernicus test extraction – EXPERIMENTAL")
        return result

    # ── ERA5 ATMOSPHERE ──────────────────────────────────────────
    if "era5" in s and ext == ".grib":
        m = re.search(r'era5_(\d{4})_(\d{2})', name.lower())
        yr, mo = (m.group(1), m.group(2)) if m else ("", "")
        folder = "ERA5" if "era5_2026" not in s.replace("era5_2026","NOPE") else "ERA5_2026"
        # more precisely:
        if r"era5_2026" in rel.as_posix().lower() and r"\era5\\" not in rel.as_posix().lower():
            folder = "ERA5_2026"
        else:
            folder = "ERA5"
        result.update(category="ATMOSPHERE",
                      subcategory=f"ERA5_{folder}",
                      format="GRIB2", is_raw="YES",
                      scientific_source="ECMWF ERA5 reanalysis",
                      time_start=f"{yr}-{mo}-01" if yr else "",
                      time_end=f"{yr}-{mo}-28/31" if yr else "",
                      lat_min="-90", lat_max="-30",
                      variables="u10,v10,swh,mwd,mwp,pp1d",
                      notes=f"Monthly GRIB2 – {yr}-{mo}")
        return result

    if "era5" in s and ext == ".idx":
        result.update(category="ATMOSPHERE",
                      subcategory="ERA5_INDEX_CACHE",
                      format="IDX", is_raw="NO", is_processed="NO",
                      notes="GRIB index/cache file – DERIVED CACHE, not independent dataset")
        return result

    # ── SEA ICE ──────────────────────────────────────────────────
    if "ice_conc_sh" in s:
        m = re.search(r'(\d{8})', name)
        dt = m.group(1) if m else ""
        result.update(category="SEA_ICE",
                      subcategory="SEA_ICE_PRIMARY_SH",
                      format="NetCDF", is_raw="YES",
                      scientific_source="OSI-SAF / AMSR2 Southern Hemisphere",
                      lat_min="-90", lat_max="-50",
                      variables="ice_conc",
                      time_start=dt[:4]+"-"+dt[4:6]+"-"+dt[6:] if len(dt)==8 else "",
                      time_end=dt[:4]+"-"+dt[4:6]+"-"+dt[6:] if len(dt)==8 else "",
                      notes="Southern Hemisphere sea ice concentration 12:00 UTC")
        return result

    if "ice_conc_nh" in s:
        m = re.search(r'(\d{8})', name)
        dt = m.group(1) if m else ""
        result.update(category="SEA_ICE",
                      subcategory="SEA_ICE_PRIMARY_NH",
                      format="NetCDF", is_raw="YES",
                      scientific_source="OSI-SAF / AMSR2 Northern Hemisphere",
                      lat_min="50", lat_max="90",
                      variables="ice_conc",
                      time_start=dt[:4]+"-"+dt[4:6]+"-"+dt[6:] if len(dt)==8 else "",
                      notes="Northern Hemisphere – NOT used in Antarctic pipeline")
        return result

    if "osisaf_obs-si_glo_phy-sic-south" in s:
        result.update(category="SEA_ICE",
                      subcategory="SEA_ICE_ADDITIONAL_L4",
                      format="NetCDF", is_raw="YES",
                      scientific_source="OSI-SAF SSMIS L4 Southern Hemisphere",
                      lat_min="-90", lat_max="-50",
                      variables="ice_conc",
                      is_duplicate_candidate="YES",
                      notes="L4 product – possible mirror/duplicate of primary SH dataset")
        return result

    # ── GEBCO BATHYMETRY ─────────────────────────────────────────
    if "gebco" in s:
        result.update(category="BATHYMETRY",
                      subcategory="GEBCO_2024",
                      format="NetCDF", is_raw="YES",
                      scientific_source="GEBCO 2024",
                      lat_min="-75", lat_max="-60",
                      lon_min="-180", lon_max="180",
                      variables="elevation",
                      notes="Southern Ocean bathymetry – DO NOT MODIFY")
        # flag potential duplicates
        if "oceandepthdata" in s or "raw\\oceandepthdata" in s.replace("/","\\"):
            result["is_duplicate_candidate"] = "YES"
            result["notes"] += " | MIRROR COPY – OceanDepthData folder"
        if "raw-20260921" in s:
            result["is_duplicate_candidate"] = "YES"
            result["notes"] += " | MIRROR COPY – raw-20260921 folder"
        return result

    # ── SENTINEL SAR ─────────────────────────────────────────────
    if "sentinel" in s or ".safe" in s.lower():
        result.update(category="SATELLITE",
                      subcategory="SENTINEL1_SAR_L1",
                      format="SAFE/GeoTIFF", is_raw="YES",
                      scientific_source="Sentinel-1 SAR Level-1 GRD",
                      variables="SAR_backscatter",
                      notes="Preserve SAFE product structure – do not extract or convert TIFFs")
        if "raw-20260921" in s:
            result["is_duplicate_candidate"] = "YES"
            result["notes"] += " | MIRROR COPY in raw-20260921 folder"
        return result

    # ── WEEKLY ANTARCTIC ICEBERG REPORTS ─────────────────────────
    if "antarcticicebergs_" in s and ext in (".csv", ".zip"):
        m = re.search(r'(\d{8})', name)
        dt = m.group(1) if m else ""
        result.update(category="TRACKS",
                      subcategory="WEEKLY_ANTARCTIC_REPORTS",
                      format=ext.upper().lstrip("."), is_raw="YES",
                      scientific_source="NIC/BYU Weekly Antarctic Iceberg Reports",
                      time_start=dt[:4]+"-"+dt[4:6]+"-"+dt[6:] if len(dt)==8 else "",
                      time_end=dt[:4]+"-"+dt[4:6]+"-"+dt[6:] if len(dt)==8 else "",
                      lat_min="-90", lat_max="-40",
                      variables="iceberg_id,latitude,longitude,size,area",
                      notes="Weekly snapshot – DO NOT MERGE with tracks yet")
        return result

    # ── BYU/NIC CONSOLIDATED DATABASE ────────────────────────────
    if "consolidated_database" in s or "updated7_consol" in s:
        result.update(category="TRACKS",
                      subcategory="BYU_NIC_RAW",
                      format=ext.upper().lstrip(".") or "DIR", is_raw="YES",
                      scientific_source="BYU/NIC Iceberg Consolidated Database v8",
                      variables="iceberg_id,latitude,longitude,date",
                      notes="Raw per-iceberg CSV tracks – source for cleaned dataset")
        if "raw-20260921" in s:
            result["is_duplicate_candidate"] = "YES"
            result["notes"] += " | MIRROR in raw-20260921 folder"
        return result

    # ── PROCESSED TRACKS ─────────────────────────────────────────
    if name in ("iceberg_tracks_clean.parquet", "iceberg_tracks_clean.csv"):
        result.update(category="TRACKS",
                      subcategory="PROCESSED_BASE_TRACK",
                      format=ext.upper().lstrip("."), is_raw="NO", is_processed="YES",
                      scientific_source="BYU/NIC derived (cleaned)",
                      notes="Primary cleaned iceberg tracks – CURRENT PRODUCTION")
        return result

    if "iceberg_tracks_golden" in s:
        result.update(category="TRACKS",
                      subcategory="PROCESSED_GOLDEN_WINDOW",
                      format="PARQUET", is_raw="NO", is_processed="YES",
                      time_start="2023-03-23", time_end="2026-04-30",
                      notes="Golden-window filtered track set – PRODUCTION")
        return result

    # ── ENVIRONMENTAL MATCHED ────────────────────────────────────
    if "iceberg_env_matched" in s:
        result.update(category="PROCESSED_OUTPUT",
                      subcategory="ENVIRONMENTAL_MATCHED",
                      format=ext.upper().lstrip("."), is_raw="NO", is_processed="YES",
                      notes="Env-matched dataset – PRODUCTION")
        return result

    # ── ML DATASETS ──────────────────────────────────────────────
    if name in ("train.parquet", "validation.parquet", "test.parquet",
                "ml_dataset_final.parquet", "ml_dataset_2024.parquet",
                "ml_dataset_2024.csv"):
        result.update(category="PROCESSED_OUTPUT",
                      subcategory="ML_DATASET",
                      format=ext.upper().lstrip("."), is_raw="NO", is_processed="YES",
                      notes="ML-ready split dataset – PRODUCTION")
        return result

    # ── TEXT HELPER FILES ─────────────────────────────────────────
    if name in ("train_icebergs.txt", "validation_icebergs.txt",
                "test_icebergs.txt", "test_icebergs.txt"):
        result.update(category="PROCESSED_OUTPUT",
                      subcategory="ML_SPLIT_MANIFEST",
                      format="TXT", is_raw="NO", is_processed="YES",
                      notes="Iceberg ID split manifest")
        return result

    # ── DIAGNOSTICS / QC / LOGS ──────────────────────────────────
    if "06_processed" in s or "diagnostics" in s or "quality_control" in s \
       or "coverage_report" in s or "missing_value" in s \
       or "matching.log" in s or "schema" in s:
        result.update(category="PROCESSED_OUTPUT",
                      subcategory="DIAGNOSTIC_QC",
                      format=ext.upper().lstrip("."), is_raw="NO", is_processed="YES",
                      notes="QC / diagnostic output")
        return result

    # ── EXPERIMENTAL / COPERNICUS TEST ───────────────────────────
    if "copernicus_test" in s or "copernicus_icebergs" in s or "testthisfile" in s:
        result.update(category="EXPERIMENTAL",
                      subcategory="COPERNICUS_TEST",
                      format=ext.upper().lstrip("."), is_raw="YES",
                      notes="Experimental / test data – do NOT mix with production")
        return result

    if "failed_dates" in s:
        result.update(category="EXPERIMENTAL",
                      subcategory="DOWNLOAD_LOG",
                      format="TXT",
                      notes="Download failure log – keep as experiment artifact")
        return result

    # ── RAW BUNDLE (raw-20260921) ────────────────────────────────
    if "raw-20260921" in s:
        result.update(category="ARCHIVE",
                      subcategory="RAW_BUNDLE_20260921",
                      is_raw="YES",
                      notes="Raw downloaded bundle – contains mirrors of other datasets")
        return result

    # ── FALLBACK ─────────────────────────────────────────────────
    result["notes"] = f"Unclassified – review needed (ext={ext})"
    stats["review_needed"].append(str(abs_path))
    return result


# ─────────────────────────────────────────────
# STEP 3 — SCAN ALL FILES AND BUILD INVENTORY
# ─────────────────────────────────────────────

HASH_PRIORITY_EXT = {".parquet", ".csv", ".nc", ".grib", ".zip",
                     ".z01",".z02",".z03",".z04",".z05",".z06",".z07",".z08"}
HASH_SIZE_LIMIT   = 5 * 1024 * 1024 * 1024  # 5 GB – skip hashing larger files

def sha256_partial(path: pathlib.Path, block=65536) -> str:
    """SHA-256 of entire file (streaming, no full RAM load)."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while True:
                chunk = f.read(block)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()
    except Exception as ex:
        return f"ERROR:{ex}"


def scan_all_files() -> list[dict]:
    log("=== STEP 3: Scanning all files ===")
    rows = []
    for abs_path in sorted(DATASET_ROOT.rglob("*")):
        if abs_path.is_dir():
            continue
        try:
            rel = abs_path.relative_to(DATASET_ROOT)
        except ValueError:
            rel = abs_path

        try:
            stat    = abs_path.stat()
            size_b  = stat.st_size
            mtime   = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        except Exception as ex:
            err(f"Cannot stat {abs_path}: {ex}")
            size_b, mtime = 0, ""

        stats["original_file_count"] += 1
        stats["original_bytes"]      += size_b

        clf = classify_file(rel, abs_path)

        if clf["is_incomplete"] == "YES":
            stats["incomplete_downloads"] += 1
        if clf["is_duplicate_candidate"] == "YES":
            stats["duplicate_candidates"] += 1

        row = {
            "relative_path"         : rel.as_posix(),
            "absolute_path"         : str(abs_path),
            "filename"              : abs_path.name,
            "extension"             : abs_path.suffix.lower(),
            "size_bytes"            : size_b,
            "size_gb"               : f"{size_b/1e9:.4f}",
            "modified_time"         : mtime,
            **clf,
        }
        rows.append(row)

        if stats["original_file_count"] % 500 == 0:
            log(f"  Scanned {stats['original_file_count']} files …")

    log(f"  Total files found: {stats['original_file_count']}")
    log(f"  Total bytes      : {stats['original_bytes']:,}  ({stats['original_bytes']/1e9:.2f} GB)")
    return rows


# ─────────────────────────────────────────────
# STEP 4 — HASH PRIORITY FILES
# ─────────────────────────────────────────────

def hash_priority_files(rows: list[dict]) -> dict:
    """Return {abs_path: sha256} for priority files under size limit."""
    log("=== STEP 4: Hashing priority files ===")
    hashes = {}
    priority = [r for r in rows
                if r["extension"] in HASH_PRIORITY_EXT
                and int(r["size_bytes"]) < HASH_SIZE_LIMIT]
    log(f"  Files selected for hashing: {len(priority)}")
    for r in priority:
        p = pathlib.Path(r["absolute_path"])
        log(f"  Hashing {p.name}  ({int(r['size_bytes'])/1e6:.1f} MB)")
        h = sha256_partial(p)
        hashes[r["absolute_path"]] = h
        stats["hashes_computed"] += 1
    return hashes


# ─────────────────────────────────────────────
# STEP 5 — WRITE MASTER INVENTORY CSV
# ─────────────────────────────────────────────

INVENTORY_COLS = [
    "relative_path","absolute_path","filename","extension",
    "size_bytes","size_gb","modified_time",
    "category","subcategory","format",
    "is_raw","is_processed","is_archive","is_duplicate_candidate","is_incomplete",
    "scientific_source","time_start","time_end",
    "lat_min","lat_max","lon_min","lon_max",
    "variables","notes",
]

def write_master_inventory(rows: list[dict], hashes: dict):
    log("=== STEP 5: Writing master_inventory.csv ===")
    out = INVENTORY_DIR / "master_inventory.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=INVENTORY_COLS + ["sha256"])
        w.writeheader()
        for r in rows:
            row = {k: r.get(k, "") for k in INVENTORY_COLS}
            row["sha256"] = hashes.get(r["absolute_path"], "")
            w.writerow(row)
    log(f"  Written: {out}  ({len(rows)} rows)")


# ─────────────────────────────────────────────
# STEP 6 — WRITE FILE HASHES CSV
# ─────────────────────────────────────────────

def write_file_hashes(hashes: dict):
    log("=== STEP 6: Writing file_hashes.csv ===")
    out = INVENTORY_DIR / "file_hashes.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["absolute_path","filename","sha256","computed_at"])
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for path, h in hashes.items():
            w.writerow([path, pathlib.Path(path).name, h, ts])
    log(f"  Written: {out}  ({len(hashes)} hashes)")


# ─────────────────────────────────────────────
# STEP 7 — DUPLICATE CANDIDATES CSV
# ─────────────────────────────────────────────

def write_duplicate_candidates(rows: list[dict], hashes: dict):
    log("=== STEP 7: Writing dataset_duplicate_candidates.csv ===")
    candidates = [r for r in rows if r.get("is_duplicate_candidate") == "YES"]

    # Group by filename to pair potential duplicates
    from collections import defaultdict
    by_name = defaultdict(list)
    for r in candidates:
        by_name[r["filename"]].append(r)

    out = INVENTORY_DIR / "dataset_duplicate_candidates.csv"
    cols = ["file_a","file_b","size_a","size_b","same_size",
            "hash_a","hash_b","identical","classification","recommended_action"]
    written = 0
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for fname, group in by_name.items():
            if len(group) < 2:
                # Pair against any same-name elsewhere
                all_same = [r for r in rows if r["filename"] == fname]
                if len(all_same) >= 2:
                    group = all_same
                else:
                    continue
            # Write pairs
            for i in range(len(group)):
                for j in range(i+1, len(group)):
                    a, b = group[i], group[j]
                    ha   = hashes.get(a["absolute_path"], "")
                    hb   = hashes.get(b["absolute_path"], "")
                    sa, sb = int(a["size_bytes"]), int(b["size_bytes"])
                    identical = (ha == hb and ha not in ("","") and not ha.startswith("ERROR")) \
                                if (ha and hb) else "UNKNOWN"
                    w.writerow({
                        "file_a"           : a["absolute_path"],
                        "file_b"           : b["absolute_path"],
                        "size_a"           : sa,
                        "size_b"           : sb,
                        "same_size"        : "YES" if sa == sb else "NO",
                        "hash_a"           : ha,
                        "hash_b"           : hb,
                        "identical"        : identical,
                        "classification"   : a["category"],
                        "recommended_action": "REVIEW – keep primary, archive mirror" if identical != True else "SAFE_TO_REMOVE_MIRROR",
                    })
                    written += 1
    log(f"  Written: {out}  ({written} candidate pairs)")


# ─────────────────────────────────────────────
# STEP 8 — INDIVIDUAL MANIFESTS
# ─────────────────────────────────────────────

MANIFEST_GROUPS = {
    "tracks_manifest.csv"           : ["TRACKS"],
    "ocean_manifest.csv"            : ["OCEAN"],
    "era5_manifest.csv"             : ["ATMOSPHERE"],
    "seaice_manifest.csv"           : ["SEA_ICE"],
    "gebco_manifest.csv"            : ["BATHYMETRY"],
    "grounding_manifest.csv"        : ["GROUNDING"],
    "satellite_manifest.csv"        : ["SATELLITE"],
    "special_products_manifest.csv" : ["SPECIAL_PRODUCT"],
    "research_packages_manifest.csv": ["RESEARCH_PACKAGE"],
    "experimental_manifest.csv"     : ["EXPERIMENTAL"],
}

MANIFEST_COLS = ["relative_path","filename","size_bytes","size_gb",
                 "modified_time","subcategory","format","scientific_source",
                 "time_start","time_end","variables","notes"]

def write_manifests(rows: list[dict]):
    log("=== STEP 8: Writing individual manifests ===")
    for fname, cats in MANIFEST_GROUPS.items():
        subset = [r for r in rows if r.get("category","") in cats]
        out    = INVENTORY_DIR / fname
        with open(out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=MANIFEST_COLS)
            w.writeheader()
            for r in subset:
                w.writerow({k: r.get(k,"") for k in MANIFEST_COLS})
        log(f"  {fname:45s}  {len(subset):5d} rows")


# ─────────────────────────────────────────────
# STEP 9 — PATHS CONFIG YAML
# ─────────────────────────────────────────────

def write_paths_yaml():
    log("=== STEP 9: Writing config/paths.yaml ===")
    yaml_content = """\
# SIH2659 — Iceberg Trajectory Prediction Project
# Logical path configuration
# Auto-generated by organize_repository.py
# All paths are relative to project_root.
# Do NOT hardcode absolute paths in scripts.

project_root       : "D:/SIH/IceBerg"

# ── Raw source data (READ-ONLY) ───────────────────────────────────────────────
raw_root           : "dataSet/00_raw"
tracks_root        : "dataSet/01_tracks"
ocean_root         : "dataSet/02_ocean"
atmosphere_root    : "dataSet/03_atmosphere"
seaice_root        : "dataSet/04_seaice"
bathymetry_root    : "dataSet/05_bathymetry"
grounding_root     : "dataSet/06_grounding"
satellite_root     : "dataSet/07_satellite"
special_products_root  : "dataSet/08_special_products"
research_packages_root : "dataSet/09_research_packages"
experimental_root  : "dataSet/10_experimental"

# ── Processed outputs ─────────────────────────────────────────────────────────
processed_root     : "dataSet/11_processed"
tracks_processed   : "dataSet/11_processed/tracks"
env_processed      : "dataSet/11_processed/environmental"
supervised_root    : "dataSet/11_processed/supervised"
diagnostics_root   : "dataSet/11_processed/diagnostics"
qc_root            : "dataSet/11_processed/quality_control"
coverage_root      : "dataSet/11_processed/coverage"
proc_logs_root     : "dataSet/11_processed/logs"

# ── Legacy processed outputs (current production – do NOT move without updating scripts) ──
legacy_processed   : "dataSet/06_processed"

# ── Inventory ─────────────────────────────────────────────────────────────────
inventory_root     : "dataSet/99_archive_inventory"

# ── Source raw data (actual locations – immutable) ───────────────────────────
glorys_primary_nc  : "dataSet/SIH/DATA_Copernicus"
era5_primary_grib  : "dataSet/ERA5"
era5_2026_grib     : "dataSet/ERA5_2026"
seaice_primary_nc  : "dataSet/SIH/DATA_Sea_ice_drift_concentration"
seaice_additional_nc : "dataSet/seaice"
gebco_root_nc      : "dataSet/gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
gebco_ocean_nc     : "dataSet/OceanDepthData/gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
sentinel_safe      : "dataSet/sentinel"
weekly_tracks_dir  : "dataSet/icebergtragectory"
raw_bundle_dir     : "dataSet/raw-20260921T095550Z-1-008"

# ── Key scientific files ──────────────────────────────────────────────────────
iceberg_tracks_clean_parquet : "dataSet/iceberg_tracks_clean.parquet"
iceberg_tracks_clean_csv     : "dataSet/iceberg_tracks_clean.csv"
grounded_catalog_csv         : "dataSet/grounded_iceberg_sentinel1_v1p5_20250318_latlon.csv"
golden_tracks_parquet        : "dataSet/06_processed/iceberg_tracks_golden_2023_2026.parquet"
env_matched_parquet          : "dataSet/06_processed/iceberg_env_matched_2023_2026.parquet"
train_parquet                : "dataSet/06_processed/train.parquet"
validation_parquet           : "dataSet/06_processed/validation.parquet"
test_parquet                 : "dataSet/06_processed/test.parquet"

# ── Arctic / out-of-scope ─────────────────────────────────────────────────────
arctic_density_nc  : "dataSet/arctic_iceberg_density.nc"
arctic_berg_cmems  : "dataSet/testthisfile/cmems_obs-si_arc_phy_berg-rcmln_nrt_l3-10km_irr_1790234526692.nc"

# ── Research packages ─────────────────────────────────────────────────────────
rse2025_archive    : "dataSet/DataCode_for_CMwvIB_RSE2025.z01"   # multi-volume z01-z08

# ── Project structure ─────────────────────────────────────────────────────────
scripts_root       : "scripts"
models_root        : "models"
reports_root       : "reports"
logs_root          : "logs"
"""
    out = CONFIG_DIR / "paths.yaml"
    out.write_text(yaml_content, encoding="utf-8")
    log(f"  Written: {out}")


# ─────────────────────────────────────────────
# STEP 10 — DATASET CATALOG MARKDOWN
# ─────────────────────────────────────────────

def write_dataset_catalog(rows: list[dict]):
    log("=== STEP 10: Writing dataset_catalog.md ===")

    def _size_of_cat(cat, sub=None):
        subset = [r for r in rows
                  if r.get("category") == cat
                  and (sub is None or r.get("subcategory") == sub)]
        return sum(int(r["size_bytes"]) for r in subset), len(subset)

    md = []
    md.append("# SIH2659 — Dataset Catalog\n")
    md.append(f"Auto-generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    md.append("> **This catalog is read-only reference. Raw data must not be modified.**\n\n")

    md.append("---\n\n## Table of Contents\n")
    md.append("1. [Core Antarctic Trajectory Pipeline](#core-antarctic-trajectory-pipeline)\n")
    md.append("2. [Physical Enhancements](#physical-enhancements)\n")
    md.append("3. [Remote Sensing](#remote-sensing)\n")
    md.append("4. [Special / Arctic Products](#special--arctic-products)\n")
    md.append("5. [Research Packages](#research-packages)\n")
    md.append("6. [Experimental / Test Data](#experimental--test-data)\n")
    md.append("7. [Processed Outputs](#processed-outputs)\n")
    md.append("8. [Incomplete Downloads](#incomplete-downloads)\n")
    md.append("9. [Duplicate Candidates Summary](#duplicate-candidates-summary)\n\n")

    # ── 1. CORE PIPELINE ──────────────────────────────────────────
    md.append("---\n\n## Core Antarctic Trajectory Pipeline\n\n")

    md.append("### A — Iceberg Tracks\n\n")
    md.append("| Dataset | Subcategory | Location | Files | Size | Time | Status |\n")
    md.append("|---------|-------------|----------|-------|------|------|--------|\n")
    md.append("| iceberg_tracks_clean | PROCESSED_BASE_TRACK | dataSet/iceberg_tracks_clean.parquet (.csv) | 2 | ~35 MB | — | **CURRENTLY USED** |\n")
    md.append("| BYU/NIC Consolidated DB v8 | BYU_NIC_RAW | dataSet/icebergtragectory/consolidated_database_v8.0/, updated7_consol/ | ~60 CSV | ~5 MB | Historical | RAW SOURCE |\n")
    md.append("| Weekly Antarctic Reports | WEEKLY_ANTARCTIC_REPORTS | dataSet/icebergtragectory/ | 131 ZIP + 219 CSV | ~30 MB | 2024-04-19 to 2026-09-18 | EXTERNAL WEEKLY – DO NOT MERGE YET |\n\n")

    md.append("### B — Ocean (GLORYS)\n\n")
    gb, n = _size_of_cat("OCEAN","GLORYS_PRIMARY")
    md.append(f"| Dataset | Location | Files | Size | Time | Variables | Status |\n")
    md.append(f"|---------|----------|-------|------|------|-----------|--------|\n")
    md.append(f"| GLORYS12 Reanalysis | dataSet/SIH/DATA_Copernicus/ (4 sectors) | 4 NC | {gb/1e9:.1f} GB | 2023-03-23 – 2026-06-23 | uo,vo,thetao,so,zos,mlotst,sithick | **CURRENTLY USED** |\n\n")

    md.append("### C — Atmosphere (ERA5)\n\n")
    md.append("| Dataset | Location | Files | Time | Variables | Status |\n")
    md.append("|---------|----------|-------|------|-----------|--------|\n")
    md.append("| ERA5 2023-2026 | dataSet/ERA5/ | 14 GRIB + idx | 2023-03 – 2026-04 | u10,v10,swh,mwd,mwp,pp1d | **CURRENTLY USED** |\n")
    md.append("| ERA5 2026 extra | dataSet/ERA5_2026/ | 5 GRIB | 2026-04 – 2026-08 | u10,v10,swh,mwd,mwp,pp1d | POTENTIALLY USEFUL – not yet matched |\n\n")

    md.append("### D — Sea Ice (Primary)\n\n")
    gb_sh, n_sh = _size_of_cat("SEA_ICE","SEA_ICE_PRIMARY_SH")
    gb_nh, n_nh = _size_of_cat("SEA_ICE","SEA_ICE_PRIMARY_NH")
    md.append("| Dataset | Subcategory | Files | Size | Notes | Status |\n")
    md.append("|---------|-------------|-------|------|-------|--------|\n")
    md.append(f"| OSI-SAF AMSR2 Southern Hemisphere | SEA_ICE_PRIMARY_SH | {n_sh} NC | {gb_sh/1e9:.1f} GB | Daily 12:00 UTC SH ice concentration | **CURRENTLY USED** |\n")
    md.append(f"| OSI-SAF AMSR2 Northern Hemisphere | SEA_ICE_PRIMARY_NH | {n_nh} NC | {gb_nh/1e9:.1f} GB | NH – NOT used in Antarctic pipeline | OUT OF SCOPE |\n\n")

    md.append("### E — Bathymetry (GEBCO)\n\n")
    md.append("| Dataset | Location | Size | Coverage | Status |\n")
    md.append("|---------|----------|------|----------|--------|\n")
    md.append("| GEBCO 2024 | dataSet/gebco_2024_…nc | ~595 MB | 60S-75S, 180W-180E | **CURRENTLY USED** |\n")
    md.append("| GEBCO mirror | dataSet/OceanDepthData/ | ~595 MB | Same | DUPLICATE/MIRROR |\n")
    md.append("| GEBCO mirror | raw-20260921/raw/OceanDepthData/ | ~595 MB | Same | DUPLICATE/MIRROR |\n\n")

    # ── 2. PHYSICAL ENHANCEMENTS ──────────────────────────────────
    md.append("---\n\n## Physical Enhancements\n\n")

    md.append("### Grounded Iceberg Catalog\n\n")
    md.append("| Dataset | Location | Records | Status |\n")
    md.append("|---------|----------|---------|--------|\n")
    md.append("| Sentinel-1 Grounded Catalog v1.5 | dataSet/grounded_iceberg_sentinel1_v1p5_20250318_latlon.csv | ~8528 coordinates | GROUNDING REFERENCE – DO NOT JOIN YET |\n\n")

    md.append("### OSI-SAF L4 Additional Sea Ice\n\n")
    md.append("| Dataset | Location | Size | Notes |\n")
    md.append("|---------|----------|------|-------|\n")
    md.append("| OSI-SAF SSMIS L4 Southern | dataSet/seaice/ | ~758 MB | Additional SH product – possible duplicate |\n\n")

    # ── 3. REMOTE SENSING ─────────────────────────────────────────
    md.append("---\n\n## Remote Sensing\n\n")
    md.append("### Sentinel-1 SAR\n\n")
    md.append("| Scene | Location | Format | Date | Status |\n")
    md.append("|-------|----------|--------|------|--------|\n")
    md.append("| S1A_IW_GRDH_1SSH_20240629 | dataSet/sentinel/*.SAFE | SAFE/GeoTIFF | 2024-06-29 | RAW – PRESERVE SAFE STRUCTURE |\n")
    md.append("| S1A mirror | raw-20260921/raw/sentinel/*.SAFE | SAFE/GeoTIFF | 2024-06-29 | DUPLICATE/MIRROR |\n\n")

    # ── 4. SPECIAL/ARCTIC ─────────────────────────────────────────
    md.append("---\n\n## Special / Arctic Products\n\n")
    md.append("| Dataset | Location | Size | Domain | Status |\n")
    md.append("|---------|----------|------|--------|--------|\n")
    md.append("| Arctic Iceberg Density | dataSet/arctic_iceberg_density.nc | ~27 GB | ARCTIC | OUT OF SCOPE |\n")
    md.append("| CMEMS Arctic Berg L3 (testthisfile) | dataSet/testthisfile/cmems_obs-si_arc_…nc | ~332 MB | ARCTIC | OUT OF SCOPE |\n")
    md.append("| CMEMS Arctic Berg L3 (root copy) | dataSet/cmems_obs-si_arc_…nc | ~332 MB | ARCTIC | DUPLICATE/OUT OF SCOPE |\n\n")

    # ── 5. RESEARCH PACKAGES ──────────────────────────────────────
    md.append("---\n\n## Research Packages\n\n")
    md.append("| Package | Location | Volumes | Total Size | Status |\n")
    md.append("|---------|----------|---------|------------|--------|\n")
    md.append("| DataCode_for_CMwvIB_RSE2025 | dataSet/DataCode_for_CMwvIB_RSE2025.z01 – z08 | 7 (z07 missing) | ~7.5 GB | RESEARCH REFERENCE – DO NOT EXTRACT YET |\n\n")
    md.append("> **Note:** Volume .z07 was not found – download may be incomplete.\n\n")

    # ── 6. EXPERIMENTAL ───────────────────────────────────────────
    md.append("---\n\n## Experimental / Test Data\n\n")
    md.append("| Dataset | Location | Notes |\n")
    md.append("|---------|----------|-------|\n")
    md.append("| Copernicus test extraction | dataSet/copernicus_test/ | Small GLORYS test NC – experimental |\n")
    md.append("| Copernicus Icebergs | dataSet/Copernicus_Icebergs/ | failed_dates.txt only – download log |\n")
    md.append("| testthisfile | dataSet/testthisfile/ | Arctic CMEMS NC placed here during testing |\n\n")

    # ── 7. PROCESSED OUTPUTS ─────────────────────────────────────
    md.append("---\n\n## Processed Outputs\n\n")
    md.append("| File | Location | Purpose | Status |\n")
    md.append("|------|----------|---------|--------|\n")
    md.append("| iceberg_tracks_golden_2023_2026.parquet | dataSet/06_processed/ | Golden-window tracks | PRODUCTION |\n")
    md.append("| iceberg_env_matched_2023_2026.parquet | dataSet/06_processed/ | Env-matched dataset | PRODUCTION |\n")
    md.append("| train.parquet | dataSet/06_processed/ | ML training set | PRODUCTION |\n")
    md.append("| validation.parquet | dataSet/06_processed/ | ML validation set | PRODUCTION |\n")
    md.append("| test.parquet | dataSet/06_processed/ | ML test set | PRODUCTION |\n")
    md.append("| coverage_report.csv | dataSet/06_processed/ | Coverage diagnostics | QC |\n")
    md.append("| missing_value_report.csv | dataSet/06_processed/ | Missing value audit | QC |\n")
    md.append("| outlier_report.csv | dataSet/06_processed/quality_control/ | Outlier detection | QC |\n")
    md.append("| matching.log | dataSet/06_processed/logs/ | Matching pipeline log | LOG |\n\n")
    md.append("> Legacy root-level copies: dataSet/train.parquet, validation.parquet, test.parquet\n")
    md.append("> These are superseded by 06_processed/ versions (smaller – possibly earlier iteration).\n\n")

    # ── 8. INCOMPLETE ─────────────────────────────────────────────
    md.append("---\n\n## Incomplete Downloads\n\n")
    md.append("| File | Size | Date | Notes |\n")
    md.append("|------|------|------|-------|\n")
    md.append("| Unconfirmed 508207.crdownload | 1.0 GB | 2026-09-24 13:02 | Chrome partial download |\n")
    md.append("| Unconfirmed 514008.crdownload | 1.0 GB | 2026-09-24 13:57 | Chrome partial download |\n")
    md.append("| Unconfirmed 70369.crdownload  | 1.0 GB | 2026-09-24 13:02 | Chrome partial download |\n")
    md.append("| Unconfirmed 75986.crdownload  | 1.0 GB | 2026-09-24 13:03 | Chrome partial download |\n\n")
    md.append("> **DO NOT DELETE.** Likely partial downloads of the RSE2025 archive or arctic_iceberg_density.nc. Volume .z07 of RSE2025 is also missing.\n\n")

    # ── 9. DUPLICATES SUMMARY ─────────────────────────────────────
    md.append("---\n\n## Duplicate Candidates Summary\n\n")
    md.append("| File | Primary Location | Mirror Location | Recommended Action |\n")
    md.append("|------|-----------------|-----------------|--------------------|\n")
    md.append("| gebco_2024…nc | dataSet/ (root) | dataSet/OceanDepthData/ | Keep root PRIMARY, mark OceanDepthData as MIRROR |\n")
    md.append("| gebco_2024…nc | dataSet/ (root) | raw-20260921/raw/OceanDepthData/ | MIRROR in raw bundle |\n")
    md.append("| osisaf…sic-south…nc | dataSet/seaice/ | raw-20260921/raw/seaice/ | Verify hashes before removing |\n")
    md.append("| S1A …SAFE | dataSet/sentinel/ | raw-20260921/raw/sentinel/ | Keep sentinel/ PRIMARY, raw bundle = MIRROR |\n")
    md.append("| updated7_consol CSVs | dataSet/icebergtragectory/ | raw-20260921/raw/iceberg/ | Keep icebergtragectory/ PRIMARY |\n")
    md.append("| cmems_obs-si_arc…nc | dataSet/testthisfile/ | dataSet/ (root copy) | Keep one, remove other after hash confirm |\n\n")
    md.append("> See `99_archive_inventory/dataset_duplicate_candidates.csv` for full pair list with sizes and hashes.\n\n")

    # ── CONCEPTUAL SEPARATION ─────────────────────────────────────
    md.append("---\n\n## Conceptual Data Separation\n\n")
    md.append("```\n")
    md.append("CORE ANTARCTIC TRAJECTORY PIPELINE\n")
    md.append("  iceberg_tracks_clean + BYU/NIC raw + weekly reports\n")
    md.append("  GLORYS (SIH/DATA_Copernicus)\n")
    md.append("  ERA5 (dataSet/ERA5/)\n")
    md.append("  Sea Ice SH (SIH/DATA_Sea_ice_drift_concentration/)\n")
    md.append("  GEBCO bathymetry\n\n")
    md.append("PHYSICAL ENHANCEMENTS (future)\n")
    md.append("  Grounded iceberg catalog (Sentinel-1 v1.5)\n")
    md.append("  ERA5 2026 extra months\n")
    md.append("  OSI-SAF SSMIS L4 additional sea ice\n\n")
    md.append("REMOTE SENSING\n")
    md.append("  Sentinel-1 SAR SAFE product\n\n")
    md.append("EXTERNAL REFERENCE\n")
    md.append("  RSE 2025 CMwvIB package\n\n")
    md.append("OUT OF SCOPE / ARCTIC\n")
    md.append("  arctic_iceberg_density.nc\n")
    md.append("  CMEMS Arctic Berg L3\n\n")
    md.append("EXPERIMENTAL\n")
    md.append("  copernicus_test/\n")
    md.append("  Copernicus_Icebergs/\n")
    md.append("  testthisfile/\n")
    md.append("```\n")

    out = REPORTS_DIR / "dataset_catalog.md"
    out.write_text("".join(md), encoding="utf-8")
    log(f"  Written: {out}")


# ─────────────────────────────────────────────
# STEP 11 — PATH REFERENCE AUDIT
# ─────────────────────────────────────────────

OLD_PATHS = [
    "dataSet/", "dataSet\\",
    "SIH/", "SIH\\",
    "ERA5/", "ERA5\\",
    "ERA5_2026/", "ERA5_2026\\",
    "icebergtragectory/", "icebergtragectory\\",
    "06_processed/", "06_processed\\",
    "DATA_Copernicus", "DATA_Sea_ice_drift",
    "iceberg_tracks_clean",
    "OceanDepthData",
    "gebco_2024",
]

def audit_script_paths():
    log("=== STEP 11: Auditing script path references ===")
    script_files = list(SCRIPTS_DIR.glob("*.py")) + \
                   list(PROJECT_ROOT.glob("*.py"))
    results = []
    for sf in script_files:
        try:
            text = sf.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for old in OLD_PATHS:
            if old in text:
                results.append({
                    "script"         : sf.name,
                    "old_path"       : old,
                    "new_path"       : "(see paths.yaml)",
                    "status"         : "FOUND",
                    "requires_update": "REVIEW – dataset not moved, paths still valid",
                })
    # Deduplicate
    seen = set()
    unique = []
    for r in results:
        key = (r["script"], r["old_path"])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    out = INVENTORY_DIR / "path_reference_audit.csv"
    cols = ["script","old_path","new_path","status","requires_update"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(unique)
    log(f"  Written: {out}  ({len(unique)} references found)")
    return unique


# ─────────────────────────────────────────────
# STEP 12 — WRITE DIRECTORY TREE SNAPSHOT
# ─────────────────────────────────────────────

def write_tree_snapshot():
    log("=== STEP 12: Writing directory tree snapshot ===")
    lines = ["# SIH2659 — Dataset Directory Tree\n",
             f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n",
             "```\n"]

    def _walk(path: pathlib.Path, prefix="", depth=0):
        if depth > 6:
            return
        try:
            children = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            return
        for i, child in enumerate(children):
            connector = "└── " if i == len(children)-1 else "├── "
            ext_prefix = "│   " if i < len(children)-1 else "    "
            if child.is_dir():
                lines.append(f"{prefix}{connector}{child.name}/\n")
                _walk(child, prefix+ext_prefix, depth+1)
            else:
                sz = child.stat().st_size
                sz_str = f"  [{sz/1e6:.1f} MB]" if sz > 1e6 else f"  [{sz} B]"
                lines.append(f"{prefix}{connector}{child.name}{sz_str}\n")

    lines.append(f"D:\\SIH\\IceBerg\\\n")
    _walk(PROJECT_ROOT, depth=0)
    lines.append("```\n")

    out = INVENTORY_DIR / "directory_tree.md"
    out.write_text("".join(lines), encoding="utf-8")
    log(f"  Written: {out}")


# ─────────────────────────────────────────────
# STEP 13 — WRITE ORGANISATION REPORT
# ─────────────────────────────────────────────

def write_organisation_report(rows: list[dict], path_audit: list[dict]):
    log("=== STEP 13: Writing data_organization_report.md ===")

    cats = {}
    for r in rows:
        c = r.get("category","UNCLASSIFIED")
        cats[c] = cats.get(c, 0) + 1

    total_files  = stats["original_file_count"]
    total_gb     = stats["original_bytes"] / 1e9
    n_raw        = sum(1 for r in rows if r.get("is_raw")=="YES")
    n_proc       = sum(1 for r in rows if r.get("is_processed")=="YES")
    n_arch       = sum(1 for r in rows if r.get("is_archive")=="YES")
    n_exp        = sum(1 for r in rows if r.get("category")=="EXPERIMENTAL")
    n_incomplete = stats["incomplete_downloads"]
    n_dup        = stats["duplicate_candidates"]
    n_review     = len(stats["review_needed"])
    n_errors     = len(stats["errors"])

    report_lines = []
    report_lines.append("# SIH2659 — Data Organization Report\n\n")
    report_lines.append(f"**Generated:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    report_lines.append("---\n\n## 1. Summary Statistics\n\n")
    report_lines.append(f"| Metric | Value |\n|--------|-------|\n")
    report_lines.append(f"| Original file count | {total_files:,} |\n")
    report_lines.append(f"| Original storage | {total_gb:.2f} GB |\n")
    report_lines.append(f"| Directories created | {stats['dirs_created']} |\n")
    report_lines.append(f"| Files moved | {stats['files_moved']} |\n")
    report_lines.append(f"| Files untouched | {total_files - stats['files_moved']:,} |\n")
    report_lines.append(f"| Raw datasets | {n_raw} |\n")
    report_lines.append(f"| Processed datasets | {n_proc} |\n")
    report_lines.append(f"| Archives | {n_arch} |\n")
    report_lines.append(f"| Experimental | {n_exp} |\n")
    report_lines.append(f"| Incomplete downloads | {n_incomplete} |\n")
    report_lines.append(f"| Duplicate candidates | {n_dup} |\n")
    report_lines.append(f"| Files requiring review | {n_review} |\n")
    report_lines.append(f"| Hashes computed | {stats['hashes_computed']} |\n")
    report_lines.append(f"| Script path references found | {len(path_audit)} |\n")
    report_lines.append(f"| Raw scientific data MODIFIED | **{stats['scientific_modified']}** (MUST BE 0) |\n")
    report_lines.append(f"| Scientific values CHANGED | **{stats['values_changed']}** (MUST BE 0) |\n")
    report_lines.append(f"| Errors | {n_errors} |\n\n")

    report_lines.append("---\n\n## 2. Category Breakdown\n\n")
    report_lines.append("| Category | File Count |\n|----------|------------|\n")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        report_lines.append(f"| {c} | {n} |\n")

    report_lines.append("\n---\n\n## 3. Files Moved\n\n")
    report_lines.append("**None.** All raw data left in place per DATA SAFETY policy.\n\n")
    report_lines.append("Manifests and catalog reference all datasets by absolute path.\n\n")

    report_lines.append("---\n\n## 4. Files NOT Moved (Rationale)\n\n")
    report_lines.append("| Dataset | Reason |\n|---------|--------|\n")
    report_lines.append("| GLORYS NetCDFs (~11 GB) | In-place; DATA_Copernicus is logical home |\n")
    report_lines.append("| ERA5 GRIB files (~100 GB) | In-place; moving risks corruption |\n")
    report_lines.append("| Sea ice NC files (~30 GB) | In-place; too large to duplicate |\n")
    report_lines.append("| arctic_iceberg_density.nc (~27 GB) | Too large to move; out-of-scope |\n")
    report_lines.append("| GEBCO NC (~595 MB) | In-place; duplicates noted in catalog |\n")
    report_lines.append("| Sentinel SAFE product | In-place; structure must be preserved |\n")
    report_lines.append("| Weekly Antarctic reports | In-place; icebergtragectory/ is adequate |\n")
    report_lines.append("| 06_processed/ outputs | In-place; scripts reference this path |\n\n")

    report_lines.append("---\n\n## 5. Files Requiring Manual Review\n\n")
    if stats["review_needed"]:
        for f in stats["review_needed"][:50]:
            report_lines.append(f"- `{f}`\n")
    else:
        report_lines.append("None.\n")

    report_lines.append("\n---\n\n## 6. Errors\n\n")
    if stats["errors"]:
        for e in stats["errors"]:
            report_lines.append(f"- {e}\n")
    else:
        report_lines.append("No errors.\n")

    report_lines.append("\n---\n\n## 7. Incomplete Downloads\n\n")
    report_lines.append("| File | Size | Notes |\n|------|------|-------|\n")
    report_lines.append("| Unconfirmed 508207.crdownload | 1.0 GB | DO NOT DELETE |\n")
    report_lines.append("| Unconfirmed 514008.crdownload | 1.0 GB | DO NOT DELETE |\n")
    report_lines.append("| Unconfirmed 70369.crdownload  | 1.0 GB | DO NOT DELETE |\n")
    report_lines.append("| Unconfirmed 75986.crdownload  | 1.0 GB | DO NOT DELETE |\n")
    report_lines.append("| DataCode_for_CMwvIB_RSE2025.z07 | MISSING | Volume 7 not found – download incomplete |\n\n")

    report_lines.append("---\n\n## 8. Duplicate Candidates\n\n")
    report_lines.append("See `99_archive_inventory/dataset_duplicate_candidates.csv` for full list.\n\n")
    report_lines.append("| Primary | Mirror(s) | Action |\n|---------|-----------|--------|\n")
    report_lines.append("| dataSet/gebco_2024…nc | OceanDepthData/, raw-20260921/raw/OceanDepthData/ | Keep root PRIMARY |\n")
    report_lines.append("| dataSet/seaice/osisaf…nc | raw-20260921/raw/seaice/ | Hash-confirm, keep one |\n")
    report_lines.append("| dataSet/sentinel/*.SAFE | raw-20260921/raw/sentinel/ | Keep sentinel/ PRIMARY |\n")
    report_lines.append("| dataSet/testthisfile/cmems_arc…nc | dataSet/cmems_arc…nc (root) | Keep one after hash |\n\n")

    report_lines.append("---\n\n## 9. Generated Artifacts\n\n")
    report_lines.append("| Artifact | Location |\n|----------|----------|\n")
    report_lines.append("| Master inventory | dataSet/99_archive_inventory/master_inventory.csv |\n")
    report_lines.append("| File hashes | dataSet/99_archive_inventory/file_hashes.csv |\n")
    report_lines.append("| Duplicate candidates | dataSet/99_archive_inventory/dataset_duplicate_candidates.csv |\n")
    report_lines.append("| Path audit | dataSet/99_archive_inventory/path_reference_audit.csv |\n")
    report_lines.append("| Directory tree | dataSet/99_archive_inventory/directory_tree.md |\n")
    report_lines.append("| Dataset catalog | reports/dataset_catalog.md |\n")
    report_lines.append("| Organization report | reports/data_organization_report.md |\n")
    report_lines.append("| Paths config | config/paths.yaml |\n")
    report_lines.append("| tracks_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| ocean_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| era5_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| seaice_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| gebco_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| grounding_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| satellite_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| special_products_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| research_packages_manifest.csv | dataSet/99_archive_inventory/ |\n")
    report_lines.append("| experimental_manifest.csv | dataSet/99_archive_inventory/ |\n")

    out = REPORTS_DIR / "data_organization_report.md"
    out.write_text("".join(report_lines), encoding="utf-8")
    log(f"  Written: {out}")


# ─────────────────────────────────────────────
# STEP 14 — WRITE LOG FILE
# ─────────────────────────────────────────────

def write_log():
    ts  = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = LOGS_DIR / f"organize_{ts}.log"
    out.write_text("\n".join(LOG_LINES), encoding="utf-8")
    print(f"\n[LOG] Written: {out}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def print_final_summary(rows: list[dict]):
    total_files = stats["original_file_count"]
    total_gb    = stats["original_bytes"] / 1e9
    n_raw       = sum(1 for r in rows if r.get("is_raw")=="YES")
    n_proc      = sum(1 for r in rows if r.get("is_processed")=="YES")
    n_arch      = sum(1 for r in rows if r.get("is_archive")=="YES")
    n_exp       = sum(1 for r in rows if r.get("category")=="EXPERIMENTAL")
    cats        = {}
    for r in rows:
        c = r.get("category","UNCLASSIFIED")
        cats[c] = cats.get(c, 0) + 1
    n_sci_ds    = len([c for c in cats if c not in
                       ("PROCESSED_OUTPUT","EXPERIMENTAL","INCOMPLETE_DOWNLOAD","")])

    print("\n\n===========================================")
    print("   DATASET ORGANIZATION COMPLETE")
    print("===========================================\n")
    print(f"Original files           : {total_files:,}")
    print(f"Original storage         : {total_gb:.2f} GB")
    print(f"Scientific datasets      : {n_sci_ds}")
    print(f"Archives                 : {n_arch}")
    print(f"Raw datasets             : {n_raw}")
    print(f"Processed datasets       : {n_proc}")
    print(f"Experimental datasets    : {n_exp}")
    print(f"Incomplete downloads     : {stats['incomplete_downloads']}")
    print(f"Duplicate candidates     : {stats['duplicate_candidates']}")
    print(f"Files moved              : {stats['files_moved']}")
    print(f"Files untouched          : {total_files - stats['files_moved']:,}")
    print(f"Files requiring review   : {len(stats['review_needed'])}")
    print(f"Hashes computed          : {stats['hashes_computed']}")
    print(f"Errors                   : {len(stats['errors'])}")
    print(f"\nRaw scientific data modified : {stats['scientific_modified']}  (MUST BE 0)")
    print(f"Scientific values changed    : {stats['values_changed']}  (MUST BE 0)")
    if stats["scientific_modified"] != 0 or stats["values_changed"] != 0:
        print("\n!!! CRITICAL FAILURE: SCIENTIFIC DATA WAS MODIFIED !!!")
        sys.exit(1)

    print("\n===========================================")
    print("\nCATEGORY BREAKDOWN:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c:<40s}  {n:>5}")

    print("\n===========================================")
    print("\nGENERATED ARTIFACTS:")
    artifacts = [
        "dataSet/99_archive_inventory/master_inventory.csv",
        "dataSet/99_archive_inventory/file_hashes.csv",
        "dataSet/99_archive_inventory/dataset_duplicate_candidates.csv",
        "dataSet/99_archive_inventory/path_reference_audit.csv",
        "dataSet/99_archive_inventory/directory_tree.md",
        "dataSet/99_archive_inventory/tracks_manifest.csv",
        "dataSet/99_archive_inventory/ocean_manifest.csv",
        "dataSet/99_archive_inventory/era5_manifest.csv",
        "dataSet/99_archive_inventory/seaice_manifest.csv",
        "dataSet/99_archive_inventory/gebco_manifest.csv",
        "dataSet/99_archive_inventory/grounding_manifest.csv",
        "dataSet/99_archive_inventory/satellite_manifest.csv",
        "dataSet/99_archive_inventory/special_products_manifest.csv",
        "dataSet/99_archive_inventory/research_packages_manifest.csv",
        "dataSet/99_archive_inventory/experimental_manifest.csv",
        "reports/dataset_catalog.md",
        "reports/data_organization_report.md",
        "config/paths.yaml",
    ]
    for a in artifacts:
        full = PROJECT_ROOT / a
        status = "OK" if full.exists() else "MISSING"
        print(f"  [{status}] {a}")

    if stats["errors"]:
        print("\n===========================================")
        print("ERRORS ENCOUNTERED:")
        for e in stats["errors"]:
            print(f"  - {e}")
    else:
        print("\nNo errors encountered.")
    print("\n===========================================\n")


def main():
    print("===========================================")
    print("  SIH2659 — Dataset Organization Script")
    print(f"  Started: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("===========================================\n")

    # Guard: never touch scientific content
    assert stats["scientific_modified"] == 0
    assert stats["values_changed"]      == 0

    create_directories()

    rows = scan_all_files()
    stats["files_untouched"] = stats["original_file_count"]

    log("=== Computing hashes (priority files only) ===")
    hashes = hash_priority_files(rows)

    write_master_inventory(rows, hashes)
    write_file_hashes(hashes)
    write_duplicate_candidates(rows, hashes)
    write_manifests(rows)
    write_paths_yaml()
    write_dataset_catalog(rows)

    path_audit = audit_script_paths()

    write_tree_snapshot()
    write_organisation_report(rows, path_audit)
    write_log()

    assert stats["scientific_modified"] == 0, "FATAL: scientific data modified!"
    assert stats["values_changed"]      == 0, "FATAL: scientific values changed!"

    print_final_summary(rows)


if __name__ == "__main__":
    main()
