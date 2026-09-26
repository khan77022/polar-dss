"""
12_save_final_model.py
Part 12: Bundle final production model pipeline, artifacts, and complete metadata.
Produces: models/model_metadata.json
"""

import os
import json
import sys
import datetime
import joblib
import pandas as pd
import numpy as np

MODEL_DIR     = "models"
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")
REPORT_PATH   = os.path.join("reports", "final_model_comparison.csv")
FEAT_PATH     = os.path.join(MODEL_DIR, "rf_features.json")
TXT_TRAIN     = os.path.join("dataSet", "train_icebergs.txt")
TXT_VAL       = os.path.join("dataSet", "validation_icebergs.txt")
TXT_TEST      = os.path.join("dataSet", "test_icebergs.txt")


def save_final_metadata():
    print("=" * 70)
    print("SAVING FINAL MODEL METADATA")
    print("=" * 70)

    # 1. Read Feature List
    with open(FEAT_PATH, "r") as f:
        features = json.load(f)

    # 2. Read Split IDs
    with open(TXT_TRAIN, "r") as f:
        train_ids = [line.strip() for line in f if line.strip()]
    with open(TXT_VAL, "r") as f:
        val_ids = [line.strip() for line in f if line.strip()]
    with open(TXT_TEST, "r") as f:
        test_ids = [line.strip() for line in f if line.strip()]

    # 3. Read Evaluation Metrics
    metrics = {}
    if os.path.exists(REPORT_PATH):
        df_comp = pd.read_csv(REPORT_PATH)
        metrics = df_comp.to_dict(orient="records")

    # 4. Software Versions
    import sklearn
    versions = {
        "python": sys.version,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "scikit_learn": sklearn.__version__,
    }
    try:
        import xgboost
        versions["xgboost"] = xgboost.__version__
    except ImportError:
        versions["xgboost"] = "not installed"

    metadata = {
        "project": "SIH2659 Iceberg Trajectory Prediction",
        "dataset_version": "2024.1_env_matched",
        "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_seed": 42,
        "prediction_task": "Next-step geographic displacement (target_delta_lat, target_delta_lon)",
        "target_variables": ["target_delta_lat", "target_delta_lon"],
        "num_features": len(features),
        "features": features,
        "splits": {
            "train_icebergs_count": len(train_ids),
            "train_icebergs": train_ids,
            "validation_icebergs_count": len(val_ids),
            "validation_icebergs": val_ids,
            "test_icebergs_count": len(test_ids),
            "test_icebergs": test_ids
        },
        "model_files": {
            "random_forest_lat": "models/random_forest_lat.joblib",
            "random_forest_lon": "models/random_forest_lon.joblib",
            "xgboost_lat": "models/xgboost_lat.json",
            "xgboost_lon": "models/xgboost_lon.json",
            "imputer": "models/rf_imputer.joblib",
            "feature_names": "models/rf_features.json"
        },
        "test_evaluation_summary": metrics,
        "environment_versions": versions
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Final model metadata successfully saved to: {METADATA_PATH}")


if __name__ == "__main__":
    save_final_metadata()
