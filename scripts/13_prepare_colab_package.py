"""
13_prepare_colab_package.py
Part 14: Package portable datasets, notebook, requirements, and metadata for Google Colab.
Produces: colab_package/ directory
"""

import os
import shutil

PACKAGE_DIR = "colab_package"

FILES_TO_COPY = [
    # Parquet splits & clean dataset
    ("dataSet/ml_dataset_final.parquet", os.path.join(PACKAGE_DIR, "ml_dataset_final.parquet")),
    ("dataSet/train.parquet", os.path.join(PACKAGE_DIR, "train.parquet")),
    ("dataSet/validation.parquet", os.path.join(PACKAGE_DIR, "validation.parquet")),
    ("dataSet/test.parquet", os.path.join(PACKAGE_DIR, "test.parquet")),
    ("dataSet/train_icebergs.txt", os.path.join(PACKAGE_DIR, "train_icebergs.txt")),
    ("dataSet/validation_icebergs.txt", os.path.join(PACKAGE_DIR, "validation_icebergs.txt")),
    ("dataSet/test_icebergs.txt", os.path.join(PACKAGE_DIR, "test_icebergs.txt")),
    # Requirements
    ("requirements_ml.txt", os.path.join(PACKAGE_DIR, "requirements.txt")),
    # Notebook
    ("colab/iceberg_trajectory_training.ipynb", os.path.join(PACKAGE_DIR, "iceberg_trajectory_training.ipynb")),
    # Documentation & metadata
    ("reports/feature_description.md", os.path.join(PACKAGE_DIR, "feature_description.md")),
]


def prepare_colab_package():
    print("=" * 70)
    print("PREPARING PORTABLE GOOGLE COLAB PACKAGE")
    print("=" * 70)

    os.makedirs(PACKAGE_DIR, exist_ok=True)

    copied_count = 0
    total_bytes = 0

    for src, dst in FILES_TO_COPY:
        if os.path.exists(src):
            shutil.copy2(src, dst)
            sz = os.path.getsize(dst)
            total_bytes += sz
            copied_count += 1
            print(f"  Copied: {src} -> {dst} ({sz / 1024:.1f} KB)")
        else:
            print(f"  [WARN] Source file not yet generated: {src}")

    # Also copy feature json if exists
    rf_feat = "models/rf_features.json"
    if os.path.exists(rf_feat):
        shutil.copy2(rf_feat, os.path.join(PACKAGE_DIR, "rf_features.json"))
        copied_count += 1

    print(f"\nPackage prepared in: {PACKAGE_DIR}/")
    print(f"Total files: {copied_count}")
    print(f"Total size : {total_bytes / (1024 * 1024):.2f} MB (portable, without NetCDF/GRIB)")


if __name__ == "__main__":
    prepare_colab_package()
