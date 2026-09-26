"""
run_ml_pipeline.py
================================================================================
SIH2659: Master Orchestrator for Iceberg Trajectory ML Pipeline
================================================================================
Executes the pipeline stages in strict sequential order:
  01. Inspect Dataset
  02. Prepare Features & Targets (Leakage-Safe)
  03. Clean & Analyze Missingness
  04. Split by Iceberg ID (Train / Val / Test)
  05. Evaluate Baseline Models
  06. Train Random Forest Models
  07. Train XGBoost Models (if installed)
  08. Evaluate All Models on Untouched Test Set
  09. Plot Trajectories (Unseen Icebergs)
  10. Granular Error Analysis
  11. Feature Ablation Experiments
  12. Save Model Metadata & Production Artifacts
  13. Prepare Portable Google Colab Package
"""

import os
import sys
import subprocess
import argparse

PIPELINE_STEPS = [
    ("01_inspect_ml_dataset.py",       "Stage 01: Inspect Dataset & Leakage Check"),
    ("02_prepare_ml_dataset.py",       "Stage 02: Prepare Targets & Causal Features"),
    ("03_clean_ml_dataset.py",         "Stage 03: Clean & Missingness Analysis"),
    ("04_split_by_iceberg.py",         "Stage 04: Iceberg-Level Dataset Splitting"),
    ("05_baseline_models.py",          "Stage 05: Evaluate Baselines"),
    ("06_train_random_forest.py",      "Stage 06: Train Random Forest Models"),
    ("07_train_xgboost.py",            "Stage 07: Train XGBoost Models"),
    ("08_evaluate_models.py",          "Stage 08: Test Set Evaluation & Comparison"),
    ("09_plot_trajectories.py",        "Stage 09: Plot Trajectories for Unseen Icebergs"),
    ("10_error_analysis.py",           "Stage 10: Physical & Environmental Error Analysis"),
    ("11_feature_ablation.py",         "Stage 11: Feature Ablation Experiments"),
    ("12_save_final_model.py",         "Stage 12: Bundle Final Model & Metadata"),
    ("13_prepare_colab_package.py",    "Stage 13: Prepare Colab Portable Package")
]


def run_pipeline(force=False):
    python_exe = sys.executable
    print("=" * 80)
    print("STARTING SIH2659 ICEBERG TRAJECTORY ML PIPELINE")
    print(f"Python interpreter: {python_exe}")
    print("=" * 80)

    for script_name, description in PIPELINE_STEPS:
        script_path = os.path.join("scripts", script_name)

        if not os.path.exists(script_path):
            print(f"\n[ERROR] Required script does not exist: {script_path}")
            sys.exit(1)

        print(f"\n>>> [{description}]")
        print(f"Running: {python_exe} {script_path}")

        try:
            result = subprocess.run(
                [python_exe, script_path],
                check=True,
                text=True,
                capture_output=False
            )
        except subprocess.CalledProcessError as e:
            print("\n" + "!" * 80)
            print(f"[FATAL PIPELINE FAILURE] Stage failed: {script_name}")
            print(f"Exit code: {e.returncode}")
            print("Stopping pipeline safely to prevent cascading errors or invalid state.")
            print("!" * 80)
            sys.exit(e.returncode)
        except Exception as e:
            print(f"\n[FATAL UNEXPECTED ERROR] {e}")
            sys.exit(1)

    print("\n" + "=" * 80)
    print("ALL PIPELINE STAGES COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run complete ML pipeline for iceberg trajectory prediction.")
    parser.add_argument("--force", action="store_true", help="Force retrain models even if already existing.")
    args = parser.parse_args()

    run_pipeline(force=args.force)
