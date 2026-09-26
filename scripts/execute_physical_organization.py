"""
SIH2659 -- Physical Repository Organization Execution
======================================================
Moves raw and auxiliary datasets from root dataSet/ into categorized numbered folders:
  00_raw/               <- Google Drive raw zip bundles & incomplete downloads
  01_tracks/            <- BYU/NIC tracks, NIC weekly reports, consolidated database
  02_ocean/             <- GLORYS12 Southern Ocean reanalysis (4 quadrants)
  03_atmosphere/        <- ERA5 and ERA5_2026 GRIB reanalysis files
  04_seaice/            <- OSI-SAF AMSR2 & SSMIS Sea Ice NetCDF files
  05_bathymetry/        <- GEBCO 2024 bathymetry NetCDF & OceanDepthData
  06_grounding/         <- Grounded Iceberg Catalog CSV
  07_satellite/         <- Sentinel-1 SAR GRD SAFE package
  08_special_products/  <- Arctic iceberg density & CMEMS Arctic iceberg L3
  09_research_packages/ <- DataCode for CMwvIB RSE2025 multi-volume archive
  10_experimental/      <- Test files & experimental directories

Creates backward-compatible NTFS junctions and hardlinks so NO legacy script paths break.
Removes redundant empty folders (02_glorys_ocean, 03_era5_atmosphere, 05_gebco_bathymetry).
"""

import os
import shutil
import subprocess
import pathlib

PROJECT_ROOT = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_DIR  = PROJECT_ROOT / "dataSet"

SEP = "=" * 70


def make_junction(link_path: pathlib.Path, target_path: pathlib.Path):
    """Creates an NTFS directory junction link_path -> target_path."""
    if not link_path.exists():
        cmd = f'cmd /c mklink /J "{link_path}" "{target_path}"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"  [JUNCTION] {link_path.name} -> {target_path.relative_to(DATASET_DIR)}")
        else:
            print(f"  [JUNCTION ERROR] {link_path.name}: {res.stderr.strip()}")


def make_hardlink(link_path: pathlib.Path, target_path: pathlib.Path):
    """Creates an NTFS file hardlink link_path -> target_path."""
    if not link_path.exists():
        cmd = f'cmd /c mklink /H "{link_path}" "{target_path}"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"  [HARDLINK] {link_path.name} -> {target_path.relative_to(DATASET_DIR)}")
        else:
            print(f"  [HARDLINK ERROR] {link_path.name}: {res.stderr.strip()}")


def run_organization():
    print(SEP)
    print("EXECUTING PHYSICAL REPOSITORY ORGANIZATION")
    print(SEP)

    # Clean up redundant empty scaffolding folders
    for redundant in ["02_glorys_ocean", "03_era5_atmosphere", "05_gebco_bathymetry", "11_processed"]:
        red_path = DATASET_DIR / redundant
        if red_path.exists() and not any(red_path.iterdir()):
            try:
                red_path.rmdir()
                print(f"Removed redundant empty folder: {redundant}")
            except Exception as e:
                print(f"Could not remove {redundant}: {e}")

    # Ensure canonical folders exist
    target_dirs = {
        "00_raw": DATASET_DIR / "00_raw",
        "01_tracks": DATASET_DIR / "01_tracks",
        "02_ocean": DATASET_DIR / "02_ocean",
        "03_atmosphere": DATASET_DIR / "03_atmosphere",
        "04_seaice": DATASET_DIR / "04_seaice",
        "05_bathymetry": DATASET_DIR / "05_bathymetry",
        "06_grounding": DATASET_DIR / "06_grounding",
        "07_satellite": DATASET_DIR / "07_satellite",
        "08_special_products": DATASET_DIR / "08_special_products",
        "09_research_packages": DATASET_DIR / "09_research_packages",
        "10_experimental": DATASET_DIR / "10_experimental",
    }
    for d in target_dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    # 1. ATMOSPHERE: ERA5 and ERA5_2026
    print("\n1. Organizing Atmosphere (ERA5)...")
    for era in ["ERA5", "ERA5_2026"]:
        src = DATASET_DIR / era
        dst = target_dirs["03_atmosphere"] / era
        if src.exists() and not src.is_symlink() and src.is_dir() and src != dst:
            print(f"  Moving {src.name} -> {dst.relative_to(DATASET_DIR)}...")
            shutil.move(str(src), str(dst))
            make_junction(src, dst)

    # 2. OCEAN: GLORYS (from SIH/DATA_Copernicus), copernicus_test, Copernicus_Icebergs
    print("\n2. Organizing Ocean (GLORYS12)...")
    sih_copernicus = DATASET_DIR / "SIH" / "DATA_Copernicus"
    dst_glorys = target_dirs["02_ocean"] / "GLORYS12"
    if sih_copernicus.exists() and not sih_copernicus.is_symlink() and sih_copernicus.is_dir():
        print(f"  Moving SIH/DATA_Copernicus -> {dst_glorys.relative_to(DATASET_DIR)}...")
        shutil.move(str(sih_copernicus), str(dst_glorys))
        make_junction(sih_copernicus, dst_glorys)

    for cop_extra in ["copernicus_test", "Copernicus_Icebergs"]:
        src = DATASET_DIR / cop_extra
        dst = target_dirs["02_ocean"] / cop_extra
        if src.exists() and not src.is_symlink() and src.is_dir():
            shutil.move(str(src), str(dst))
            make_junction(src, dst)

    # 3. SEA ICE: OSI-SAF AMSR2 (from SIH/DATA_Sea_ice_drift_concentration) and seaice
    print("\n3. Organizing Sea Ice (OSI-SAF)...")
    sih_seaice = DATASET_DIR / "SIH" / "DATA_Sea_ice_drift_concentration"
    dst_seaice = target_dirs["04_seaice"] / "OSI_SAF_AMSR2"
    if sih_seaice.exists() and not sih_seaice.is_symlink() and sih_seaice.is_dir():
        print(f"  Moving SIH/DATA_Sea_ice... -> {dst_seaice.relative_to(DATASET_DIR)}...")
        shutil.move(str(sih_seaice), str(dst_seaice))
        make_junction(sih_seaice, dst_seaice)

    legacy_seaice = DATASET_DIR / "seaice"
    dst_leg_seaice = target_dirs["04_seaice"] / "seaice_legacy"
    if legacy_seaice.exists() and not legacy_seaice.is_symlink() and legacy_seaice.is_dir():
        shutil.move(str(legacy_seaice), str(dst_leg_seaice))
        make_junction(legacy_seaice, dst_leg_seaice)

    # 4. BATHYMETRY: GEBCO 2024 & OceanDepthData
    print("\n4. Organizing Bathymetry (GEBCO)...")
    gebco_file = DATASET_DIR / "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc"
    dst_gebco = target_dirs["05_bathymetry"] / gebco_file.name
    if gebco_file.exists() and not dst_gebco.exists():
        shutil.move(str(gebco_file), str(dst_gebco))
        make_hardlink(gebco_file, dst_gebco)

    ocean_depth_dir = DATASET_DIR / "OceanDepthData"
    dst_odd = target_dirs["05_bathymetry"] / "OceanDepthData"
    if ocean_depth_dir.exists() and not ocean_depth_dir.is_symlink() and ocean_depth_dir.is_dir():
        shutil.move(str(ocean_depth_dir), str(dst_odd))
        make_junction(ocean_depth_dir, dst_odd)

    # 5. GROUNDING: Grounded Iceberg Catalog
    print("\n5. Organizing Grounding Catalog...")
    grounded_file = DATASET_DIR / "grounded_iceberg_sentinel1_v1p5_20250318_latlon.csv"
    dst_grounded = target_dirs["06_grounding"] / grounded_file.name
    if grounded_file.exists() and not dst_grounded.exists():
        shutil.move(str(grounded_file), str(dst_grounded))
        make_hardlink(grounded_file, dst_grounded)

    # 6. SATELLITE: Sentinel-1 SAFE package
    print("\n6. Organizing Satellite (Sentinel-1)...")
    sentinel_dir = DATASET_DIR / "sentinel"
    dst_sentinel = target_dirs["07_satellite"] / "sentinel"
    if sentinel_dir.exists() and not sentinel_dir.is_symlink() and sentinel_dir.is_dir():
        shutil.move(str(sentinel_dir), str(dst_sentinel))
        make_junction(sentinel_dir, dst_sentinel)

    # 7. SPECIAL PRODUCTS: Arctic Iceberg Density & CMEMS Arctic Berg L3
    print("\n7. Organizing Special Products...")
    for sp_name in ["arctic_iceberg_density.nc", "cmems_obs-si_arc_phy_berg-rcmln_nrt_l3-10km_irr_1790234526692.nc"]:
        sp_file = DATASET_DIR / sp_name
        dst_sp = target_dirs["08_special_products"] / sp_name
        if sp_file.exists() and not dst_sp.exists():
            shutil.move(str(sp_file), str(dst_sp))
            make_hardlink(sp_file, dst_sp)

    # 8. RESEARCH PACKAGES: DataCode_for_CMwvIB_RSE2025.*
    print("\n8. Organizing Research Packages...")
    for rf in DATASET_DIR.glob("DataCode_for_CMwvIB_RSE2025.*"):
        dst_rf = target_dirs["09_research_packages"] / rf.name
        if rf.exists() and not dst_rf.exists():
            shutil.move(str(rf), str(dst_rf))
            make_hardlink(rf, dst_rf)

    # 9. RAW ARCHIVES & INCOMPLETE DOWNLOADS: raw-20260921* & *.crdownload
    print("\n9. Organizing Raw Zip Archives...")
    for rz in list(DATASET_DIR.glob("raw-20260921*")) + list(DATASET_DIR.glob("*.crdownload")):
        dst_rz = target_dirs["00_raw"] / rz.name
        if rz.exists() and not dst_rz.exists():
            shutil.move(str(rz), str(dst_rz))

    # 10. EXPERIMENTAL: testthisfile
    print("\n10. Organizing Experimental...")
    test_dir = DATASET_DIR / "testthisfile"
    dst_test = target_dirs["10_experimental"] / "testthisfile"
    if test_dir.exists() and not test_dir.is_symlink() and test_dir.is_dir():
        shutil.move(str(test_dir), str(dst_test))
        make_junction(test_dir, dst_test)

    # 11. TRACKS: BYU/NIC and Weekly reports
    print("\n11. Organizing Tracks...")
    byu_dir = DATASET_DIR / "iceberg"
    dst_byu = target_dirs["01_tracks"] / "byu_nic_csv"
    if byu_dir.exists() and not byu_dir.is_symlink() and byu_dir.is_dir():
        shutil.move(str(byu_dir), str(dst_byu))
        make_junction(byu_dir, dst_byu)

    weekly_dir = DATASET_DIR / "icebergtragectory"
    dst_weekly = target_dirs["01_tracks"] / "nic_weekly_csv"
    if weekly_dir.exists() and not weekly_dir.is_symlink() and weekly_dir.is_dir():
        shutil.move(str(weekly_dir), str(dst_weekly))
        make_junction(weekly_dir, dst_weekly)

    for trk_name in ["consolidated_database_v8.0.zip", "iceberg_tracks_clean.parquet", "iceberg_tracks_clean.csv"]:
        src_trk = DATASET_DIR / trk_name
        dst_trk = target_dirs["01_tracks"] / trk_name
        if src_trk.exists() and not dst_trk.exists():
            shutil.move(str(src_trk), str(dst_trk))
            make_hardlink(src_trk, dst_trk)

    print("\n" + SEP)
    print("ORGANIZATION EXECUTION SUMMARY:")
    print(SEP)
    for name, path in target_dirs.items():
        count = sum(1 for p in path.rglob("*") if p.is_file())
        size_gb = sum(p.stat().st_size for p in path.rglob("*") if p.is_file()) / 1e9
        print(f"  {name:22s} : {count:5d} files  ({size_gb:6.2f} GB)")
    print(SEP)


if __name__ == "__main__":
    run_organization()
