"""
02_prepare_ml_dataset.py
Part 2: Construct future targets and strictly causal past/current features.
Produces:
  - dataSet/ml_dataset_2024.parquet
  - dataSet/ml_dataset_2024.csv
  - reports/feature_description.md
"""

import os
import pandas as pd
import numpy as np

IN_PATH       = os.path.join("dataSet", "iceberg_env_matched_2024.parquet")
OUT_PARQUET   = os.path.join("dataSet", "ml_dataset_2024.parquet")
OUT_CSV       = os.path.join("dataSet", "ml_dataset_2024.csv")
REPORT_PATH   = os.path.join("reports", "feature_description.md")


def prepare_ml_dataset():
    print(f"Loading {IN_PATH}...")
    df = pd.read_parquet(IN_PATH)

    # 1. Sort strictly by iceberg_id and date
    df = df.sort_values(["iceberg_id", "date"]).reset_index(drop=True)
    n_initial = len(df)
    print(f"Initial observations: {n_initial:,}")

    # 2. Build Future Targets (information at t+1) within each iceberg group
    grp = df["iceberg_id"]
    next_is_same = grp.eq(grp.shift(-1))

    df["target_date"] = df["date"].shift(-1).where(next_is_same)
    df["target_lat"]  = df["lat"].shift(-1).where(next_is_same)
    df["target_lon"]  = df["lon"].shift(-1).where(next_is_same)

    # Future displacement targets to predict:
    df["target_delta_lat"] = (df["target_lat"] - df["lat"]).round(6)
    df["target_delta_lon"] = (df["target_lon"] - df["lon"]).round(6)

    # Step duration to next observation in days
    dt_future_sec = (df["target_date"] - df["date"]).dt.total_seconds()
    df["future_dt_days"] = (dt_future_sec / 86400.0).round(4)

    # Drop rows without a valid next observation (e.g. final observation of each iceberg track)
    valid_target = df["target_delta_lat"].notna() & df["target_delta_lon"].notna()
    df = df[valid_target].reset_index(drop=True)
    print(f"Rows with valid future target: {len(df):,} (dropped {n_initial - len(df):,} boundary points)")

    # 3. Build Time Features (at time t)
    df["month"] = df["date"].dt.month
    df["day_of_year"] = df["date"].dt.dayofyear
    df["sin_day_of_year"] = np.round(np.sin(2.0 * np.pi * df["day_of_year"] / 365.25), 6)
    df["cos_day_of_year"] = np.round(np.cos(2.0 * np.pi * df["day_of_year"] / 365.25), 6)

    # 4. Position Features (at time t)
    df["latitude_rad"]  = np.round(np.radians(df["lat"]), 6)
    df["longitude_rad"] = np.round(np.radians(df["lon"]), 6)

    # 5. Lagged Trajectory Kinematics (at time t and prior)
    # df['delta_lat'], df['delta_lon'], df['speed_kmday'], df['direction'] already represent
    # the step into current time t from previous time t-1.
    # To prevent confusion with target_delta, we explicitly rename them:
    df["previous_delta_lat"]   = df["delta_lat"]
    df["previous_delta_lon"]   = df["delta_lon"]
    df["previous_speed_kmday"] = df["speed_kmday"]
    df["previous_direction"]   = df["direction"]
    df["previous_dt_days"]     = df["dt_days"]

    # Lag 2: the step from t-2 to t-1
    grp = df["iceberg_id"]
    prev1_is_same = grp.eq(grp.shift(1))
    prev2_is_same = prev1_is_same & grp.eq(grp.shift(2))

    df["delta_lat_lag2"] = df["previous_delta_lat"].shift(1).where(prev2_is_same)
    df["delta_lon_lag2"] = df["previous_delta_lon"].shift(1).where(prev2_is_same)
    df["speed_lag2"]     = df["previous_speed_kmday"].shift(1).where(prev2_is_same)

    # Remove the un-prefixed movement columns to eliminate any possible ambiguity
    cols_to_drop = [c for c in ["delta_lat", "delta_lon", "dt_days", "speed_kmday", "direction"] if c in df.columns]
    df = df.drop(columns=cols_to_drop)

    # 6. Save datasets
    print(f"Saving prepared dataset ({len(df):,} rows x {len(df.columns)} cols)...")
    df.to_parquet(OUT_PARQUET, index=False)
    df.to_csv(OUT_CSV, index=False)
    print(f"  Parquet: {OUT_PARQUET}")
    print(f"  CSV:     {OUT_CSV}")

    # 7. Write Feature Description Report
    write_feature_description(df)


def write_feature_description(df):
    report = """# 🧊 Feature Description & Schema Documentation

This document describes all variables in `dataSet/ml_dataset_2024.parquet`, explaining feature categorization, temporal availability, and leakage prevention rules.

---

## 🎯 Prediction Target Variables (at time t+1)

These are the ground-truth values to be predicted by the ML models. **They are strictly excluded from the input feature matrix $X$ during training and inference.**

| Column Name | Type | Units | Description |
| :--- | :--- | :--- | :--- |
| `target_delta_lat` | float | degrees | Change in latitude from current observation to next: $lat_{t+1} - lat_t$ |
| `target_delta_lon` | float | degrees | Change in longitude from current observation to next: $lon_{t+1} - lon_t$ |
| `target_lat` | float | degrees | Actual latitude at next observation: $lat_{t+1}$ |
| `target_lon` | float | degrees | Actual longitude at next observation: $lon_{t+1}$ |
| `target_date` | datetime | timestamp | Timestamp of next observation |
| `future_dt_days` | float | days | Elapsed time between observation $t$ and $t+1$ |

---

## 🛡️ Leakage Prevention Rules

1. **Strict Temporal Causality**: Input features $X_t$ represent information strictly observed at or prior to time $t$.
2. **Exclusion of Future Conditions**: Environmental conditions at $t+1$ (e.g., future currents or winds) are NEVER included in $X_t$.
3. **Trajectory Lag Integrity**: Lags (`delta_lat_lag2`, etc.) are constructed strictly within each `iceberg_id`. Group boundaries are preserved with `NaN` rather than leaking data across distinct icebergs.
4. **Target Isolation**: `target_delta_lat` and `target_delta_lon` are only used as the regression target vector $y$.

---

## 📊 Input Features Available at Time $t$

### 1. Spatial Coordinates
- `lat`: Current iceberg latitude (degrees, South is negative).
- `lon`: Current iceberg longitude (degrees, [-180, 180]).
- `latitude_rad`: Current latitude converted to radians.
- `longitude_rad`: Current longitude converted to radians.

### 2. Temporal & Cyclical Features
- `month`: Calendar month (1–12), capturing seasonal oceanographic cycle.
- `day_of_year`: Day of year (1–366).
- `sin_day_of_year`: $\sin(2\pi \cdot \text{day\_of\_year} / 365.25)$, continuous seasonal phase.
- `cos_day_of_year`: $\cos(2\pi \cdot \text{day\_of\_year} / 365.25)$, continuous seasonal phase.

### 3. Trajectory Kinematics (Lags)
- `previous_delta_lat`: Latitude change from step $t-1$ to step $t$.
- `previous_delta_lon`: Longitude change from step $t-1$ to step $t$.
- `previous_speed_kmday`: Drift speed between $t-1$ and $t$ (km/day).
- `previous_direction`: Movement heading from $t-1$ to $t$ (degrees, 0–360°).
- `previous_dt_days`: Elapsed days between $t-1$ and $t$.
- `delta_lat_lag2`: Latitude change from step $t-2$ to $t-1$.
- `delta_lon_lag2`: Longitude change from step $t-2$ to $t-1$.
- `speed_lag2`: Drift speed between $t-2$ and $t-1$.

### 4. Ocean Physics (GLORYS Reanalysis at time $t$)
- `glorys_uo_ms`: Eastward sea surface velocity at iceberg position (m/s).
- `glorys_vo_ms`: Northward sea surface velocity at iceberg position (m/s).
- `glorys_current_speed_ms`: Total current speed magnitude $\sqrt{u^2 + v^2}$ (m/s).
- `glorys_current_dir`: Direction of ocean current flow (degrees).
- `glorys_so`: Sea surface salinity (1e-3 / psu).
- `glorys_bottomT`: Seafloor potential temperature (°C).

### 5. Cryospheric & Atmospheric Forcing (at time $t$)
- `seaice_conc_pct`: Daily sea-ice concentration (%) around the iceberg from SSMIS/AMSR2 satellites.
- `wind_u10_ms`: 10-meter eastward wind component (m/s).
- `wind_v10_ms`: 10-meter northward wind component (m/s).
- `wind_speed_ms`: Total 10m wind speed (m/s).
- `wind_dir`: 10m wind direction (degrees).

### 6. Bathymetry (GEBCO 2024)
- `ocean_depth_m`: Seafloor elevation/depth relative to sea level (negative values represent ocean depth in meters). Helps model iceberg grounding on shallow shelves.

---

## 🏷️ Metadata & Tracking Columns (Kept outside feature matrix)
- `iceberg_id`: Categorical identifier of the iceberg track (used strictly for group-level dataset splitting).
- `date`: Timestamp of the observation at time $t$.
- `source`: Sensor/instrument that detected the iceberg (e.g., ascat, oscat, nic).
- `confidence`: Detection validity flag.
- `length`: Iceberg length in nautical miles (where available).
- `width`: Iceberg width in nautical miles (where available).
"""
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"Feature description written to: {REPORT_PATH}")


if __name__ == "__main__":
    prepare_ml_dataset()
