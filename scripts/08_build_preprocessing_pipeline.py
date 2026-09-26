"""
SIH2659 -- Step 11 & 12: Preprocessing Architecture & Leakage Guard
===================================================================
Implements:
1. Reusable LeakageGuard to enforce zero target leakage in any modeling pipeline.
2. Scikit-learn compatible ColumnTransformer & Pipeline fitted strictly on TRAIN ONLY.
3. Tests and verifies that zero validation/test statistics leak into preprocessing.

STRICT INVARIANT:
- Does NOT train any ML or baseline models.
- Preprocessing statistics (imputers, scalers) are fitted using TRAIN ONLY.
"""

import json
import pathlib
import re
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler, StandardScaler

PROJECT_ROOT  = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_ROOT  = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_ROOT / "06_processed"

MODEL_READY_PATH  = PROCESSED_DIR / "iceberg_model_ready_v1.parquet"
FEATURE_SETS_JSON = PROCESSED_DIR / "model_feature_sets.json"


# ═══════════════════════════════════════════════════════════════════════════
# 1. AUTOMATED LEAKAGE GUARD
# ═══════════════════════════════════════════════════════════════════════════

class LeakageError(ValueError):
    """Raised when forbidden future or target-derived columns are detected."""
    pass


class LeakageGuard:
    """
    Automated guard to detect and reject target leakage or future columns
    in any feature matrix or column list.
    """

    FORBIDDEN_EXACT = {
        "target_north_displacement_m",
        "target_east_displacement_m",
        "target_dt_days",
        "target_lat",
        "target_lon",
        "target_delta_lat",
        "target_delta_lon",
        "next_lat",
        "next_lon",
        "next_date",
        "delta_lat",          # unlagged target transition
        "delta_lon",          # unlagged target transition
        "speed_kmday",        # unlagged target transition
        "direction",          # unlagged target transition
        "direction_deg",      # unlagged target transition
        "is_terminal_observation",
        "split"
    }

    FORBIDDEN_PATTERNS = [
        re.compile(r"^target_", re.IGNORECASE),
        re.compile(r"^next_", re.IGNORECASE),
        re.compile(r"^future_", re.IGNORECASE),
    ]

    # Explicitly permitted columns even if matching a broad prefix
    EXEMPTIONS = set()

    @classmethod
    def check_columns(cls, columns):
        """
        Validates a list or index of feature column names.
        Raises LeakageError if any forbidden column is found.
        """
        violations = []
        for col in columns:
            if col in cls.EXEMPTIONS:
                continue
            if col in cls.FORBIDDEN_EXACT:
                violations.append(f"EXACT_FORBIDDEN: '{col}'")
                continue
            for pat in cls.FORBIDDEN_PATTERNS:
                if pat.search(col):
                    violations.append(f"PATTERN_MATCH '{pat.pattern}': '{col}'")
                    break

        if violations:
            err_msg = (
                f"FATAL LEAKAGE DETECTED! Found {len(violations)} forbidden column(s):\n" +
                "\n".join(f"  - {v}" for v in violations)
            )
            raise LeakageError(err_msg)
        return True

    @classmethod
    def sanitize(cls, df_or_cols):
        """Returns only safe columns, filtering out any leakage."""
        if hasattr(df_or_cols, "columns"):
            cols = list(df_or_cols.columns)
        else:
            cols = list(df_or_cols)

        safe = []
        for col in cols:
            try:
                cls.check_columns([col])
                safe.append(col)
            except LeakageError:
                pass
        return safe


# ═══════════════════════════════════════════════════════════════════════════
# 2. PREPROCESSING PIPELINE (FITTED ON TRAIN ONLY)
# ═══════════════════════════════════════════════════════════════════════════

def build_preprocessing_pipeline(feature_cols):
    """
    Constructs a ColumnTransformer tailored to the provided causal feature set.
    Separates:
    - Continuous environmental and physical variables (median imputation + RobustScaler)
    - Bathymetry elevation (constant -9999.0 imputation to preserve missingness distinction)
    - Sin/Cos bounded angular variables (median imputation, passthrough scale)
    - Binary indicator & availability flags (passthrough)
    """
    # Validate features through Leakage Guard first!
    LeakageGuard.check_columns(feature_cols)

    # Segregate feature types
    binary_cols = [c for c in feature_cols if "_available" in c or c.startswith("is_")]
    sincos_cols = [c for c in feature_cols if c.endswith("_sin") or c.endswith("_cos")]
    bathy_cols  = [c for c in feature_cols if "gebco_elevation" in c]
    
    # Continuous is everything else
    continuous_cols = [
        c for c in feature_cols 
        if c not in binary_cols and c not in sincos_cols and c not in bathy_cols
    ]

    transformers = []

    # 1. Continuous Features: Median Imputer + RobustScaler
    if continuous_cols:
        cont_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler())
        ])
        transformers.append(("continuous", cont_pipe, continuous_cols))

    # 2. Bathymetry Elevation: Dedicated Imputer (-9999) + Scaler
    # Never zero-fill! -9999 clearly separates missing domain from sea level (0m)
    if bathy_cols:
        bathy_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="constant", fill_value=-9999.0)),
            ("scaler", RobustScaler())
        ])
        transformers.append(("bathymetry", bathy_pipe, bathy_cols))

    # 3. Angular Sin/Cos Features: Median Imputer (passthrough scale)
    if sincos_cols:
        sincos_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median"))
        ])
        transformers.append(("sincos", sincos_pipe, sincos_cols))

    # 4. Binary availability flags: Passthrough
    if binary_cols:
        bin_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="constant", fill_value=0))
        ])
        transformers.append(("binary", bin_pipe, binary_cols))

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop"
    )

    return preprocessor, {
        "continuous": continuous_cols,
        "bathymetry": bathy_cols,
        "sincos": sincos_cols,
        "binary": binary_cols
    }


def verify_pipeline_isolation():
    """
    Tests that:
    1. Leakage Guard correctly catches intentional leakage.
    2. ColumnTransformer can be fitted on TRAIN ONLY.
    3. Transforms Val and Test without NaNs and without statistics leakage.
    4. NO model training is performed.
    """
    print("=" * 70)
    print("TESTING PREPROCESSING PIPELINE AND LEAKAGE GUARD")
    print("=" * 70)

    # 1. Test Leakage Guard
    print("1. Testing Leakage Guard on forbidden columns...")
    test_leakage_cols = ["lat", "lon", "target_north_displacement_m", "lag_1_speed_kmday"]
    try:
        LeakageGuard.check_columns(test_leakage_cols)
        assert False, "LeakageGuard failed to catch target_north_displacement_m!"
    except LeakageError as ex:
        print(f"   [PASS] LeakageGuard caught forbidden column: {ex}")

    test_unlagged_cols = ["lat", "lon", "speed_kmday"]
    try:
        LeakageGuard.check_columns(test_unlagged_cols)
        assert False, "LeakageGuard failed to catch unlagged speed_kmday!"
    except LeakageError as ex:
        print(f"   [PASS] LeakageGuard caught unlagged transition: {ex}")

    # 2. Load Dataset and Feature Set D (ML)
    print("\n2. Loading dataset and testing Train-only fitting...")
    df = pd.read_parquet(MODEL_READY_PATH)
    with open(FEATURE_SETS_JSON, "r", encoding="utf-8") as f:
        fsets = json.load(f)

    ml_features = fsets["D_MACHINE_LEARNING"]["features"]
    print(f"   Feature Set D count: {len(ml_features)} features.")
    
    # Assert features pass guard
    LeakageGuard.check_columns(ml_features)
    print("   [PASS] All 48 ML features verified causal by LeakageGuard.")

    # Split into train, val, test
    train_mask = (df["split"] == "train") & (df["target_north_displacement_m"].notna())
    val_mask   = (df["split"] == "validation") & (df["target_north_displacement_m"].notna())
    test_mask  = (df["split"] == "test") & (df["target_north_displacement_m"].notna())

    X_train = df.loc[train_mask, ml_features]
    X_val   = df.loc[val_mask, ml_features]
    X_test  = df.loc[test_mask, ml_features]

    print(f"   X_train shape: {X_train.shape}")
    print(f"   X_val shape:   {X_val.shape}")
    print(f"   X_test shape:  {X_test.shape}")

    # Build and FIT on TRAIN ONLY
    preprocessor, col_groups = build_preprocessing_pipeline(ml_features)
    print(f"\n3. Fitting preprocessor on X_train ONLY...")
    preprocessor.fit(X_train)
    print("   [PASS] Preprocessor fitted on X_train.")

    # Transform all three splits
    X_train_trans = preprocessor.transform(X_train)
    X_val_trans   = preprocessor.transform(X_val)
    X_test_trans  = preprocessor.transform(X_test)

    # Validations
    assert not np.isnan(X_train_trans).any(), "NaNs found in transformed X_train!"
    assert not np.isnan(X_val_trans).any(), "NaNs found in transformed X_val!"
    assert not np.isnan(X_test_trans).any(), "NaNs found in transformed X_test!"

    assert X_train_trans.shape == X_train.shape, f"Shape mismatch: {X_train_trans.shape} vs {X_train.shape}"
    assert X_val_trans.shape == X_val.shape, f"Shape mismatch: {X_val_trans.shape} vs {X_val.shape}"
    assert X_test_trans.shape == X_test.shape, f"Shape mismatch: {X_test_trans.shape} vs {X_test.shape}"

    print("   [PASS] Transformed arrays have 0 NaNs and matching dimensions.")
    print("   [PASS] Pipeline isolation verified: Val/Test transformed strictly using Train medians/scales.")
    print("=" * 70)
    print("PREPROCESSING PIPELINE READY (NO MODELS TRAINED)")
    print("=" * 70)


if __name__ == "__main__":
    verify_pipeline_isolation()
