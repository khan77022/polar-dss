"""
SIH2659 — Repository Integrity Audit
Validates master_inventory.csv against the 5-point critique.
No files are moved, deleted, or modified.
"""
import csv, pathlib, collections, sys

PROJECT_ROOT  = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_ROOT  = PROJECT_ROOT / "dataSet"
INVENTORY_DIR = DATASET_ROOT / "99_archive_inventory"
REPORTS_DIR   = PROJECT_ROOT / "reports"

INVENTORY_CSV = INVENTORY_DIR / "master_inventory.csv"
DUP_CSV       = INVENTORY_DIR / "dataset_duplicate_candidates.csv"
HASHES_CSV    = INVENTORY_DIR / "file_hashes.csv"

SEP = "=" * 65

def load_csv(p):
    return list(csv.DictReader(open(p, encoding="utf-8")))

def main():
    print(SEP)
    print("  SIH2659 REPOSITORY INTEGRITY AUDIT")
    print(SEP)

    if not INVENTORY_CSV.exists():
        print("ERROR: master_inventory.csv not found. Run organize_repository.py first.")
        sys.exit(1)

    rows = load_csv(INVENTORY_CSV)
    print(f"\nInventory rows loaded: {len(rows):,}\n")

    # ─────────────────────────────────────────────────────────────
    # CHECK 1: Self-inventory contamination
    # Any row whose relative_path starts with "99_archive_inventory"
    # should NOT appear — those are generated admin files.
    # ─────────────────────────────────────────────────────────────
    print(SEP)
    print("CHECK 1: Self-inventory contamination")
    print(SEP)
    admin_rows = [r for r in rows if r["relative_path"].startswith("99_archive_inventory")]
    if admin_rows:
        print(f"  FAIL — {len(admin_rows)} admin/generated files found in inventory:")
        for r in admin_rows[:10]:
            print(f"    {r['relative_path']}")
        print("  Fix: re-run organize_repository.py v2 (excludes INVENTORY_DIR from scan)")
    else:
        print(f"  PASS — No generated inventory files in scientific inventory.")

    # ─────────────────────────────────────────────────────────────
    # CHECK 2: Unhashed files — explain each one
    # ─────────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("CHECK 2: Unhashed files breakdown")
    print(SEP)

    all_count   = len(rows)
    hashed_ok   = [r for r in rows
                   if r.get("sha256","") and
                   not r["sha256"].startswith("NOT_") and
                   not r["sha256"].startswith("ERROR:")]
    hashed_set  = {r["relative_path"] for r in hashed_ok}
    not_hashed  = [r for r in rows if r["relative_path"] not in hashed_set]

    by_reason = collections.defaultdict(list)
    for r in not_hashed:
        h   = r.get("sha256","")
        ext = r.get("extension","")
        sz  = int(r.get("size_bytes","0"))
        if h == "NOT_HASHED_TOO_LARGE":
            reason = "SKIPPED_TOO_LARGE(>5GB)"
        elif h == "NOT_HASHED_INCOMPLETE":
            reason = "CRDOWNLOAD"
        elif not h and ext not in (".parquet",".csv",".nc",".grib",
                                   ".zip",".z01",".z02",".z03",".z04",
                                   ".z05",".z06",".z07",".z08"):
            reason = f"NON_PRIORITY_EXT({ext})"
        elif not h:
            reason = f"UNEXPECTEDLY_EMPTY(ext={ext},sz={sz})"
        else:
            reason = f"OTHER({h[:30]})"
        by_reason[reason].append(r)

    print(f"  Total rows          : {all_count:,}")
    print(f"  With valid hash     : {len(hashed_ok):,}")
    print(f"  Without valid hash  : {len(not_hashed):,}")
    print()
    for reason, rlist in sorted(by_reason.items(), key=lambda x: -len(x[1])):
        print(f"  [{len(rlist):>4}]  {reason}")
        for r in rlist[:3]:
            print(f"           {r['filename']}  ({int(r['size_bytes'])/1e9:.3f} GB)")
        if len(rlist) > 3:
            print(f"           ... and {len(rlist)-3} more")

    # Flag unexpected empties (this would be a bug)
    unexpected = by_reason.get("UNEXPECTEDLY_EMPTY(ext=,sz=0)", []) + \
                 [r for k, v in by_reason.items()
                  if k.startswith("UNEXPECTEDLY_EMPTY") for r in v]
    if unexpected:
        print(f"\n  WARN — {len(unexpected)} files have unexpected empty sha256:")
        for r in unexpected[:10]:
            print(f"    {r['relative_path']}  sz={r['size_bytes']}")
    else:
        print(f"\n  All {len(not_hashed)} unhashed files have an explainable reason.")

    # ─────────────────────────────────────────────────────────────
    # CHECK 3: Duplicate candidates — classify by evidence level
    # ─────────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("CHECK 3: Duplicate candidates — evidence classification")
    print(SEP)

    if not DUP_CSV.exists():
        print("  WARN: dataset_duplicate_candidates.csv not found.")
    else:
        dups = load_csv(DUP_CSV)
        print(f"  Total candidate pairs: {len(dups)}")
        print()
        by_status = collections.Counter(r.get("identical","") for r in dups)
        ev_labels = {
            "True"   : "CONFIRMED_EXACT_DUPLICATE",
            "UNKNOWN": "UNVERIFIED (hashes not computed for both)",
            "False"  : "DIFFERENT_CONTENT (same name, different bytes)",
            ""       : "STATUS_MISSING",
        }
        for status, count in by_status.most_common():
            label = ev_labels.get(status, f"OTHER({status})")
            print(f"  {count:>4}  {label}")

        print()
        print("  Confirmed exact duplicates:")
        confirmed = [r for r in dups if r.get("identical","") == "True"]
        if confirmed:
            seen_files = set()
            for r in confirmed:
                fa = pathlib.Path(r["file_a"]).name
                fb = pathlib.Path(r["file_b"]).name
                key = tuple(sorted([fa,fb]))
                if key in seen_files: continue
                seen_files.add(key)
                print(f"    {fa}  ==  {fb}  |  size={int(r['size_a']):,} bytes")
        else:
            print("    None confirmed (all require manual hash verification).")

        print()
        print("  ACTION: DO NOT DELETE anything.")
        print("  NEXT: inspect candidate pairs manually.")
        print("  Recommend: for files >5GB, compute hash separately before deciding.")

    # ─────────────────────────────────────────────────────────────
    # CHECK 4: Every physical file represented exactly once
    # ─────────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("CHECK 4: Physical files vs inventory rows")
    print(SEP)

    inventory_paths = {r["relative_path"] for r in rows}
    physical_paths  = set()
    for p in DATASET_ROOT.rglob("*"):
        if p.is_dir(): continue
        # Exclude admin directory
        try:
            p.relative_to(INVENTORY_DIR)
            continue
        except ValueError:
            pass
        try:
            rel = p.relative_to(DATASET_ROOT).as_posix()
            physical_paths.add(rel)
        except ValueError:
            pass

    in_inv_not_phys = inventory_paths - physical_paths
    in_phys_not_inv = physical_paths - inventory_paths

    print(f"  Physical files (excl. admin): {len(physical_paths):,}")
    print(f"  Inventory rows              : {len(inventory_paths):,}")
    print(f"  In inventory, not on disk   : {len(in_inv_not_phys)}")
    print(f"  On disk, not in inventory   : {len(in_phys_not_inv)}")

    if in_inv_not_phys:
        print("  WARN — inventory references missing files:")
        for p in sorted(in_inv_not_phys)[:10]:
            print(f"    {p}")
    if in_phys_not_inv:
        print("  WARN — untracked files (not in inventory):")
        for p in sorted(in_phys_not_inv)[:10]:
            print(f"    {p}")
    if not in_inv_not_phys and not in_phys_not_inv:
        print("  PASS — inventory exactly matches physical files.")

    # ─────────────────────────────────────────────────────────────
    # CHECK 5: Scripts still resolve input paths
    # ─────────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("CHECK 5: Key production file paths exist on disk")
    print(SEP)

    key_files = {
        "iceberg_tracks_clean.parquet"              : DATASET_ROOT / "iceberg_tracks_clean.parquet",
        "iceberg_tracks_clean.csv"                  : DATASET_ROOT / "iceberg_tracks_clean.csv",
        "iceberg_tracks_golden_2023_2026.parquet"   : DATASET_ROOT / "06_processed/iceberg_tracks_golden_2023_2026.parquet",
        "iceberg_env_matched_2023_2026.parquet"     : DATASET_ROOT / "06_processed/iceberg_env_matched_2023_2026.parquet",
        "train.parquet (06_processed)"              : DATASET_ROOT / "06_processed/train.parquet",
        "validation.parquet (06_processed)"         : DATASET_ROOT / "06_processed/validation.parquet",
        "test.parquet (06_processed)"               : DATASET_ROOT / "06_processed/test.parquet",
        "grounded_iceberg catalog"                  : DATASET_ROOT / "grounded_iceberg_sentinel1_v1p5_20250318_latlon.csv",
        "GLORYS sector_-90_-180"                    : DATASET_ROOT / "SIH/DATA_Copernicus/sector_-90_-180",
        "ERA5 primary"                              : DATASET_ROOT / "ERA5",
        "ERA5_2026"                                 : DATASET_ROOT / "ERA5_2026",
        "Sea ice SH primary"                        : DATASET_ROOT / "SIH/DATA_Sea_ice_drift_concentration",
        "GEBCO root nc"                             : DATASET_ROOT / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc",
        "Sentinel SAFE"                             : DATASET_ROOT / "sentinel",
        "weekly tracks dir"                         : DATASET_ROOT / "icebergtragectory",
    }

    all_ok = True
    for label, path in key_files.items():
        exists = path.exists()
        status = "OK  " if exists else "MISS"
        if not exists: all_ok = False
        print(f"  [{status}] {label}")
    if all_ok:
        print("\n  PASS — All production files/dirs confirmed on disk.")
    else:
        print("\n  FAIL — Some production paths missing. Investigate before proceeding.")

    # ─────────────────────────────────────────────────────────────
    # CHECK 6: Incomplete downloads summary
    # ─────────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("CHECK 6: Incomplete downloads")
    print(SEP)
    incomplete = [r for r in rows if r.get("category","") == "INCOMPLETE_DOWNLOAD"]
    print(f"  Count: {len(incomplete)}")
    for r in incomplete:
        print(f"  {r['filename']}  {int(r['size_bytes'])/1e9:.2f} GB  — DO NOT DELETE")

    # Check RSE2025 z07
    z_rows = [r for r in rows if r.get("dataset_name","") == "DataCode_for_CMwvIB_RSE2025"]
    z_names = {r["filename"] for r in z_rows}
    print(f"\n  RSE2025 volumes present: {sorted(z_names)}")
    z07 = "DataCode_for_CMwvIB_RSE2025.z07"
    print(f"  {z07}: {'FOUND' if z07 in z_names else 'MISSING — likely still downloading'}")

    # ─────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("AUDIT COMPLETE")
    print(SEP)
    print("""
Scientific workflow position:
  [RAW DATA — immutable]           CONFIRMED
  [ORGANIZATION / INVENTORY]       DONE (v1 inventory)
  [INTEGRITY AUDIT]                <-- YOU ARE HERE (this script)
  [DATASET-SPECIFIC METADATA]      next
  [SCIENTIFIC COVERAGE AUDIT]      next
  [ENVIRONMENTAL MATCHING]         future
  [MODEL-READY DATASET]            future
  ...

POLICY:
  - Do NOT delete any duplicate candidates yet
  - Do NOT extend the golden-window dataset yet  
  - Do NOT rebuild train/validation/test splits yet
  - Existing 06_processed/ pipeline is the known-good baseline
  - Next: re-run organize_repository.py v2 to fix self-inventory contamination
""")


if __name__ == "__main__":
    main()
