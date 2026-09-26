# 🧊 SIH2659: Antarctic Iceberg Trajectory Prediction ML System

An end-to-end, data-leakage-safe machine learning system for predicting the 1-step-ahead geographic drift of Antarctic icebergs using multi-sensor satellite kinematics and environmental ocean-ice-atmosphere forcing fields.

---

## 1. Project Objective

The goal is to predict the next spatial displacement of an iceberg given its trajectory history and local environmental conditions at observation time $t$:

$$\text{Inputs } X_t \longrightarrow \text{Predict } (\Delta \text{lat}_{t \to t+1}, \Delta \text{lon}_{t \to t+1})$$

The predicted geographic position is reconstructed as:
$$\widehat{\text{lat}}_{t+1} = \text{lat}_t + \widehat{\Delta \text{lat}}$$
$$\widehat{\text{lon}}_{t+1} = \text{lon}_t + \widehat{\Delta \text{lon}}$$

Performance is evaluated using true **Haversine Great-Circle distance** in kilometers, not arbitrary Euclidean degrees.

---

## 2. Dataset Architecture

- **Clean Historical Trajectories**: `dataSet/iceberg_tracks_clean.parquet`
  - 421,980 observations across 646 Antarctic icebergs spanning 1976–2026.
- **Environmentally Matched Benchmark (2024 Cohort)**: `dataSet/iceberg_env_matched_2024.parquet`
  - 8,310 observations across 40 distinct Antarctic icebergs active during 2024.
  - Collocated with Copernicus GLORYS ocean reanalysis, OSI-SAF satellite sea ice concentration, GEBCO 2024 bathymetry, and ERA5 surface winds.

---

## 3. Prediction Target Formulation

For each iceberg track sorted strictly chronologically:
- `target_delta_lat`: $lat_{t+1} - lat_t$ (degrees)
- `target_delta_lon`: $lon_{t+1} - lon_t$ (degrees)
- `future_dt_days`: Elapsed time between observation $t$ and $t+1$ (days)
- `target_lat`, `target_lon`: Absolute ground-truth coordinates at $t+1$

Boundary condition: The final observation of every iceberg trajectory has no subsequent ground-truth step and is removed from target training. Long tracking gaps ($> 7$ days) and non-physical velocity jumps ($> 100$ km/day) are filtered.

---

## 4. Input Features ($X_t$)

| Feature Category | Variables | Description |
| :--- | :--- | :--- |
| **Spatial Coordinates** | `lat`, `lon`, `latitude_rad`, `longitude_rad` | Current iceberg location |
| **Temporal & Step Horizon** | `month`, `day_of_year`, `sin_day_of_year`, `cos_day_of_year`, `future_dt_days` | Seasonal cycle and forecast time horizon |
| **Kinematic Lags** | `previous_delta_lat`, `previous_delta_lon`, `previous_speed_kmday`, `previous_direction`, `previous_dt_days`, `delta_lat_lag2`, `delta_lon_lag2`, `speed_lag2` | Motion history from $(t-1 \to t)$ and $(t-2 \to t-1)$ |
| **Ocean Physics** | `glorys_uo_ms`, `glorys_vo_ms`, `glorys_current_speed_ms`, `glorys_current_dir`, `glorys_so`, `glorys_bottomT` | Surface current vectors, total speed, direction, salinity, seafloor potential temp |
| **Cryosphere & Atmosphere**| `seaice_conc_pct`, `wind_u10_ms`, `wind_v10_ms`, `wind_speed_ms`, `wind_dir` | Daily sea ice fraction (%), 10m surface winds |
| **Bathymetry** | `ocean_depth_m` | Seafloor depth (m) to detect shelf grounding |

Full feature documentation is available in [`reports/feature_description.md`](file:///d:/SIH/IceBerg/reports/feature_description.md).

---

## 5. Critical Data-Leakage Prevention Rules

1. **Iceberg-Level Splitting (Zero Group Leakage)**: Observations from any individual `iceberg_id` exist strictly in one split (Train, Validation, or Test). Random observation shuffling across time is strictly prohibited.
2. **Temporal Causality**: Features $X_t$ strictly contain data available at or prior to $t$. Future environmental forcing at $t+1$ is never provided to the model.
3. **Training-Set Imputation Only**: Missing-value medians are calculated exclusively on `train.parquet` and applied without modification to validation and test sets.
4. **Target Isolation**: Target coordinates and delta columns are never used as input features.

---

## 6. Train / Validation / Test Strategy

Using fixed random seed `42`, the 40 unique icebergs are partitioned into:
- **Training Set (70%)**: 28 icebergs (~5,800 observations)
- **Validation Set (15%)**: 6 icebergs (~1,200 observations) — used for early stopping and hyperparameter selection.
- **Test Set (15%)**: 6 icebergs (~1,200 observations) — untouched until final evaluation.

Files generated:
- `dataSet/train.parquet`, `dataSet/train_icebergs.txt`
- `dataSet/validation.parquet`, `dataSet/validation_icebergs.txt`
- `dataSet/test.parquet`, `dataSet/test_icebergs.txt`

---

## 7. Models Supported

1. **Zero-Movement Persistence Baseline**: Predicts iceberg remains stationary ($\widehat{\Delta \text{lat}} = 0, \widehat{\Delta \text{lon}} = 0$).
2. **Kinematic Persistence Baseline**: Assumes constant velocity drift ($\widehat{\Delta \text{lat}} = \Delta \text{lat}_{t-1}, \widehat{\Delta \text{lon}} = \Delta \text{lon}_{t-1}$).
3. **Physical Ocean-Current Drift Baseline**: Advects iceberg purely with surface ocean velocity over `future_dt_days`.
4. **Linear Regression Baseline**: Ordinary least squares on all features.
5. **Random Forest Regressor**: Separate regressors for latitude and longitude displacement ($n=300$, depth=12, leaf=3).
6. **XGBoost Regressor**: Gradient-boosted trees with validation early stopping.

---

## 8. Evaluation Metrics

Evaluated on unseen test icebergs:
- $\Delta \text{lat}$ and $\Delta \text{lon}$ Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) in degrees.
- Great-Circle Geographic Error in kilometers (Mean, Median, 75th percentile, 90th percentile, 95th percentile, Maximum).

---

## 9. How to Run Locally

Install requirements:
```bash
pip install -r requirements_ml.txt
```

Run the entire pipeline sequentially:
```bash
python run_ml_pipeline.py
```

Or run individual modular scripts in `scripts/`:
```bash
python scripts/01_inspect_ml_dataset.py
python scripts/02_prepare_ml_dataset.py
python scripts/03_clean_ml_dataset.py
python scripts/04_split_by_iceberg.py
python scripts/05_baseline_models.py
python scripts/06_train_random_forest.py
python scripts/07_train_xgboost.py
python scripts/08_evaluate_models.py
python scripts/09_plot_trajectories.py
python scripts/10_error_analysis.py
python scripts/11_feature_ablation.py
python scripts/12_save_final_model.py
python scripts/13_prepare_colab_package.py
```

---

## 10. How to Use Google Colab

1. The script `scripts/13_prepare_colab_package.py` creates a clean, lightweight folder:
   ```
   colab_package/
   ├── ml_dataset_final.parquet
   ├── train.parquet
   ├── validation.parquet
   ├── test.parquet
   ├── train_icebergs.txt
   ├── validation_icebergs.txt
   ├── test_icebergs.txt
   ├── requirements.txt
   ├── rf_features.json
   ├── feature_description.md
   └── iceberg_trajectory_training.ipynb
   ```
2. Upload the `colab_package/` contents to Google Drive (e.g. `/content/drive/MyDrive/IcebergProject`).
3. Open `iceberg_trajectory_training.ipynb` in Google Colab and run all cells.

---

## 11. Saved Artifacts & Models

- `models/random_forest_lat.joblib` & `models/random_forest_lon.joblib`
- `models/xgboost_lat.json` & `models/xgboost_lon.json`
- `models/rf_imputer.joblib`
- `models/rf_features.json`
- `models/model_metadata.json`
- `reports/baseline_results.csv`
- `reports/final_model_comparison.csv`
- `reports/random_forest_feature_importance.png`
- `reports/error_analysis.csv`
- `reports/error_by_regime.png`
- `reports/feature_ablation_results.csv`
- `reports/trajectories/*.png`

---

## 12. Scientific Limitations & Caveats

1. **Cohort Sample Size**: The multi-sensor environmental dataset is concentrated on the **2024 cohort (40 distinct icebergs, ~8,300 observations)**. Performance on this cohort cannot be assumed to generalize identically to all historical decades without full environmental reanalysis matching.
2. **Wind Availability**: The downloaded raw environmental data only included 1 day of GRIB surface wind fields. Wind features are preserved for pipeline architecture completeness but are mostly imputed in the 2024 benchmark.
3. **Bathymetry is Static**: GEBCO 2024 provides seabed depth/elevation. It provides geometric constraints (shelf grounding vs deep drift), not dynamic forcing.
4. **Missing Values as Non-Zero**: Missing satellite environmental retrievals (e.g. cloud-screened or off-swath observations) must not be interpreted as physical zero values.
5. **Observational Uncertainty**: Satellite scatterometer and optical iceberg positions carry inherent sensor measurement uncertainties ($\pm 2$ to $\pm 10$ km depending on sensor resolution).
6. **Correlation vs Causality**: Machine learning feature importance demonstrates predictive association within the empirical dataset, not proof of hydrodynamic governing laws.
