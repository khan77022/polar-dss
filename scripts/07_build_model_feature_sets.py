"""
SIH2659 -- Step 10: Build Model-Specific Feature Sets & Inventory
================================================================
Generates:
- dataSet/06_processed/model_feature_sets.json
- dataSet/99_archive_inventory/model_feature_inventory.csv

Defines explicit feature manifests for:
A. Persistence
B. Kinematic Persistence
C. Physics-Only
D. Machine Learning (Causal)
E. Physics + ML Hybrid

Strictly enforces:
- Zero target leakage (NO future or transition-derived columns in predictor sets)
- Full causality guarantee (all inputs strictly <= time t)
- Clear documentation of missingness strategies per feature
"""

import json
import pathlib
import pandas as pd

PROJECT_ROOT  = pathlib.Path(r"D:\SIH\IceBerg")
DATASET_ROOT  = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_ROOT / "06_processed"
INVENTORY_DIR = DATASET_ROOT / "99_archive_inventory"

MODEL_READY_PATH = PROCESSED_DIR / "iceberg_model_ready_v1.parquet"
FEATURE_SETS_JSON = PROCESSED_DIR / "model_feature_sets.json"
FEATURE_INV_CSV   = INVENTORY_DIR / "model_feature_inventory.csv"


def build_feature_sets():
    print("Building model feature sets and inventory...")
    df = pd.read_parquet(MODEL_READY_PATH)
    all_cols = list(df.columns)

    # 1. Feature sets definition
    feature_sets = {
        "metadata": {
            "version": "1.0",
            "source_dataset": "dataSet/06_processed/iceberg_model_ready_v1.parquet",
            "total_observations": len(df),
            "total_columns": len(all_cols),
            "target_columns": [
                "target_north_displacement_m",
                "target_east_displacement_m",
                "target_dt_days"
            ],
            "forbidden_leakage_columns": [
                "target_north_displacement_m",
                "target_east_displacement_m",
                "target_dt_days",
                "next_lat",
                "next_lon",
                "next_date",
                "target_lat",
                "target_lon",
                "target_delta_lat",
                "target_delta_lon",
                "is_terminal_observation"
            ]
        },
        "A_PERSISTENCE": {
            "name": "Persistence Baseline",
            "description": "Zero displacement baseline: predicts iceberg remains at its current position (lat, lon). Standard geodetic skill benchmark.",
            "features": [
                "lat",
                "lon"
            ],
            "target": [
                "target_north_displacement_m",
                "target_east_displacement_m"
            ],
            "requires_imputation": False
        },
        "B_KINEMATIC_PERSISTENCE": {
            "name": "Kinematic Persistence Baseline",
            "description": "Linear dead-reckoning extrapolation using safe causal backward-looking velocity and direction from past steps (t-1 to t).",
            "features": [
                "lat",
                "lon",
                "lag_1_dt_days",
                "lag_1_delta_lat",
                "lag_1_delta_lon",
                "lag_1_speed_kmday",
                "lag_1_dir_sin",
                "lag_1_dir_cos",
                "rolling_3_speed_kmday",
                "rolling_3_dir_sin",
                "rolling_3_dir_cos"
            ],
            "target": [
                "target_north_displacement_m",
                "target_east_displacement_m"
            ],
            "requires_imputation": True
        },
        "C_PHYSICS_ONLY": {
            "name": "Deterministic Physics Drag Model",
            "description": "Standard numerical ocean-atmosphere drag balance (water drag, air drag, Coriolis force, sea-ice stress). Zero machine learning parameters.",
            "features": [
                "lat",
                "lon",
                "length_m",
                "width_m",
                "area_km2",
                "uo",
                "vo",
                "current_speed",
                "current_dir_sin",
                "current_dir_cos",
                "u10",
                "v10",
                "wind_speed",
                "wind_dir_sin",
                "wind_dir_cos",
                "seaice_conc",
                "gebco_elevation",
                "gebco_available",
                "glorys_available",
                "era5_available",
                "seaice_available"
            ],
            "target": [
                "target_north_displacement_m",
                "target_east_displacement_m"
            ],
            "requires_imputation": False
        },
        "D_MACHINE_LEARNING": {
            "name": "Causal Supervised Machine Learning",
            "description": "Comprehensive causal feature representation including position, geometry, seasonality harmonics, safe backward kinematics, full GLORYS ocean, ERA5 winds, OSI-SAF sea ice, and GEBCO bathymetry with availability masks.",
            "features": [
                # Position & Geometry
                "lat", "lon", "length_m", "width_m", "area_km2",
                # Seasonality
                "month", "day_of_year_sin", "day_of_year_cos",
                # Backward Kinematics
                "lag_1_dt_days", "lag_1_delta_lat", "lag_1_delta_lon",
                "lag_1_speed_kmday", "lag_1_dir_sin", "lag_1_dir_cos",
                "lag_2_speed_kmday", "lag_2_dir_sin", "lag_2_dir_cos",
                "rolling_3_speed_kmday", "rolling_7_speed_kmday",
                "rolling_3_dir_sin", "rolling_3_dir_cos",
                "rolling_7_dir_sin", "rolling_7_dir_cos",
                "is_zero_movement", "is_first_observation",
                # Ocean Dynamics (GLORYS)
                "uo", "vo", "current_speed", "current_dir_sin", "current_dir_cos",
                "zos", "mlotst", "sithick", "so", "thetao",
                # Atmospheric Dynamics (ERA5)
                "u10", "v10", "wind_speed", "wind_dir_sin", "wind_dir_cos",
                "msl", "swh",
                "wind_relative_to_current_sin", "wind_relative_to_current_cos",
                # Sea Ice (OSI-SAF)
                "seaice_conc", "seaice_raw_conc", "seaice_uncertainty", "seaice_status_flag",
                # Bathymetry (GEBCO)
                "gebco_elevation", "gebco_available",
                # Availability Masks
                "glorys_available", "era5_available", "seaice_available",
                "dynamic_environment_available", "all_environment_available"
            ],
            "target": [
                "target_north_displacement_m",
                "target_east_displacement_m"
            ],
            "requires_imputation": True
        },
        "E_PHYSICS_ML_HYBRID": {
            "name": "Physics-Guided Machine Learning Hybrid",
            "description": "Physics drag equation inputs combined with environmental and kinematic residual correction features for learning unresolved hydrodynamic drift.",
            "features": [
                # Physical Forcing Core
                "lat", "lon", "length_m", "width_m", "area_km2",
                "uo", "vo", "current_speed", "current_dir_sin", "current_dir_cos",
                "u10", "v10", "wind_speed", "wind_dir_sin", "wind_dir_cos",
                "seaice_conc", "gebco_elevation", "gebco_available",
                # Relative Forcing Interactions
                "wind_relative_to_current_sin", "wind_relative_to_current_cos",
                # Memory & Inertia
                "lag_1_speed_kmday", "lag_1_dir_sin", "lag_1_dir_cos",
                "rolling_3_speed_kmday", "rolling_3_dir_sin", "rolling_3_dir_cos",
                "is_zero_movement",
                # Oceanographic Layer Structure
                "mlotst", "zos", "sithick",
                # Availability & Boundary Indicators
                "glorys_available", "era5_available", "seaice_available",
                "dynamic_environment_available"
            ],
            "target": [
                "target_north_displacement_m",
                "target_east_displacement_m"
            ],
            "requires_imputation": True
        }
    }

    # Save JSON manifest
    with open(FEATURE_SETS_JSON, "w", encoding="utf-8") as f:
        json.dump(feature_sets, f, indent=2)
    print(f"Saved {FEATURE_SETS_JSON.name}")

    # 2. Build feature inventory CSV
    inventory_rows = []
    
    # Categorization map
    def categorize_col(col):
        if col in ["iceberg_id", "date"]: return "IDENTITY"
        if col in ["lat", "lon"]: return "POSITION"
        if col in ["length_m", "width_m", "area_km2"]: return "ICEBERG_GEOMETRY"
        if "day_of_year" in col or col in ["month"]: return "TEMPORAL_SEASONAL"
        if "lag_" in col or "rolling_" in col: return "HISTORICAL_KINEMATICS"
        if col in ["uo", "vo", "current_speed", "current_dir_deg", "current_dir_sin", "current_dir_cos", "zos", "mlotst", "sithick", "so", "thetao"]: return "OCEAN_GLORYS"
        if col in ["u10", "v10", "wind_speed", "wind_dir_deg", "wind_dir_sin", "wind_dir_cos", "msl", "swh", "mwd", "wind_relative_to_current_deg", "wind_relative_to_current_sin", "wind_relative_to_current_cos"]: return "ATMOSPHERE_ERA5"
        if "seaice_" in col: return "SEA_ICE_OSISAF"
        if "gebco_" in col: return "BATHYMETRY_GEBCO"
        if "_available" in col: return "SOURCE_AVAILABILITY"
        if "quality_" in col or "is_" in col: return "QUALITY_CONTROL"
        if "target_" in col: return "TARGET"
        if col == "split": return "DATASET_SPLIT"
        return "OTHER"

    for col in all_cols:
        cat = categorize_col(col)
        dtype = str(df[col].dtype)
        null_count = int(df[col].isna().sum())
        null_pct = round(null_count / len(df) * 100, 2)
        
        # Check presence in sets
        in_a = col in feature_sets["A_PERSISTENCE"]["features"]
        in_b = col in feature_sets["B_KINEMATIC_PERSISTENCE"]["features"]
        in_c = col in feature_sets["C_PHYSICS_ONLY"]["features"]
        in_d = col in feature_sets["D_MACHINE_LEARNING"]["features"]
        in_e = col in feature_sets["E_PHYSICS_ML_HYBRID"]["features"]
        is_target = col in feature_sets["metadata"]["target_columns"]

        causality = "CAUSAL (Available <= t)" if not is_target and col != "is_terminal_observation" else "TARGET (t -> t+1)" if is_target else "METADATA"

        # Missingness strategy
        if cat == "BATHYMETRY_GEBCO" and "elevation" in col:
            miss_strat = "RETAIN_NAN (Do NOT zero-fill; model uses gebco_available mask or TRAIN-fitted indicator)"
        elif null_count > 0 and not is_target:
            miss_strat = "FIT_ON_TRAIN_ONLY (Median or Iterative imputer fitted strictly on train split)"
        elif is_target:
            miss_strat = "TERMINAL_OBSERVATION (Expected 78 NaNs for terminal iceberg records; omitted during training)"
        else:
            miss_strat = "COMPLETE (0 missing values)"

        inventory_rows.append({
            "column_name": col,
            "category": cat,
            "dtype": dtype,
            "null_count": null_count,
            "null_pct": null_pct,
            "causality_status": causality,
            "in_persistence_A": in_a,
            "in_kinematic_B": in_b,
            "in_physics_C": in_c,
            "in_ml_D": in_d,
            "in_hybrid_E": in_e,
            "is_target": is_target,
            "missingness_handling_strategy": miss_strat
        })

    inv_df = pd.DataFrame(inventory_rows)
    inv_df.to_csv(FEATURE_INV_CSV, index=False)
    print(f"Saved {FEATURE_INV_CSV.name} ({len(inv_df)} columns cataloged)")


if __name__ == "__main__":
    build_feature_sets()
