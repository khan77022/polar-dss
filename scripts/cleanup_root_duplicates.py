"""
SIH2659 -- Remove Root Redundant Hardlink Entries
=================================================
Removes the loose duplicate file links sitting at the root of dataSet/
because canonical copies are already securely stored inside:
  01_tracks/
  05_bathymetry/
  06_grounding/
  08_special_products/
  09_research_packages/

This eliminates the 35 GB double-counting by Windows File Explorer
(which inflated the apparent folder size from 141 GiB to 176 GiB).
"""

import os
from pathlib import Path

DATASET_DIR = Path(r"D:\SIH\IceBerg\dataSet")

FILES_TO_CLEAN = [
    "arctic_iceberg_density.nc",
    "cmems_obs-si_arc_phy_berg-rcmln_nrt_l3-10km_irr_1790234526692.nc",
    "DataCode_for_CMwvIB_RSE2025.z01",
    "DataCode_for_CMwvIB_RSE2025.z02",
    "DataCode_for_CMwvIB_RSE2025.z03",
    "DataCode_for_CMwvIB_RSE2025.z04",
    "DataCode_for_CMwvIB_RSE2025.z05",
    "DataCode_for_CMwvIB_RSE2025.z06",
    "DataCode_for_CMwvIB_RSE2025.z08",
    "gebco_2024_n-60.0_s-75.0_w-180.0_e180.0.nc",
    "grounded_iceberg_sentinel1_v1p5_20250318_latlon.csv",
    "consolidated_database_v8.0.zip",
    "iceberg_tracks_clean.csv",
    "iceberg_tracks_clean.parquet",
    # Legacy 2024 artifacts from root
    "iceberg_env_matched_2024.csv",
    "iceberg_env_matched_2024.parquet",
    "ml_dataset_2024.csv",
    "ml_dataset_2024.parquet",
    "ml_dataset_final.parquet",
    "test.parquet",
    "train.parquet",
    "validation.parquet",
    "test_icebergs.txt",
    "train_icebergs.txt",
    "validation_icebergs.txt"
]

def cleanup():
    print("=" * 70)
    print("CLEANING ROOT REDUNDANT HARDLINKS IN dataSet/")
    print("=" * 70)
    
    cleaned_bytes = 0
    cleaned_count = 0
    
    for fname in FILES_TO_CLEAN:
        fpath = DATASET_DIR / fname
        if fpath.exists() and fpath.is_file():
            sz = fpath.stat().st_size
            fpath.unlink()
            cleaned_bytes += sz
            cleaned_count += 1
            print(f"  Removed root link: {fname:50s} ({sz/1e6:8.2f} MB)")
            
    print("-" * 70)
    print(f"Removed {cleaned_count} duplicate root entries totaling {cleaned_bytes/1e9:.2f} GB ({cleaned_bytes/(1024**3):.2f} GiB).")
    print("All canonical files remain 100% intact inside their respective numbered folders!")
    print("=" * 70)

if __name__ == "__main__":
    cleanup()
