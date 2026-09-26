"""
scripts/02_clean_tracks.py
================================================================================
Iceberg Track Cleaning and Temporal Quality Control
================================================================================
Loads raw iceberg tracks, cleans fields, handles duplicates/conflicts,
computes geodesic kinematic metrics (Haversine distance, speed, bearing),
flags quality anomalies, and filters to the Golden Window:
  START: 2023-03-23
  END:   2026-04-30

Outputs:
  - dataSet/06_processed/iceberg_tracks_golden_2023_2026.parquet
  - dataSet/06_processed/quality_control/duplicate_conflicts.csv
"""

from pathlib import Path
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(r"D:\SIH\IceBerg").resolve()
DATASET_DIR = PROJECT_ROOT / "dataSet"
PROCESSED_DIR = DATASET_DIR / "06_processed"
QC_DIR = PROCESSED_DIR / "quality_control"
QC_DIR.mkdir(parents=True, exist_ok=True)

TRACKS_RAW_PARQUET = DATASET_DIR / "iceberg_tracks_clean.parquet"
GOLDEN_PARQUET = PROCESSED_DIR / "iceberg_tracks_golden_2023_2026.parquet"
DUPLICATE_CONFLICTS_CSV = QC_DIR / "duplicate_conflicts.csv"

GOLDEN_START = pd.Timestamp("2023-03-23")
GOLDEN_END = pd.Timestamp("2026-04-30")
EARTH_RADIUS_KM = 6371.0


def haversine_np(lat1, lon1, lat2, lon2):
    """
    Vectorized Haversine distance in kilometers.
    Handles longitude wrap-around properly.
    """
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    
    # Delta lon normalized to [-180, 180]
    dlon_deg = (lon2 - lon1 + 180.0) % 360.0 - 180.0
    dlambda = np.radians(dlon_deg)
    
    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    a = np.clip(a, 0.0, 1.0)
    c = 2.0 * np.arcsin(np.sqrt(a))
    return EARTH_RADIUS_KM * c


def bearing_np(lat1, lon1, lat2, lon2):
    """
    Vectorized initial bearing (azimuth) from (lat1, lon1) to (lat2, lon2) in degrees [0, 360).
    """
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dlon_deg = (lon2 - lon1 + 180.0) % 360.0 - 180.0
    dlambda = np.radians(dlon_deg)
    
    y = np.sin(dlambda) * np.cos(phi2)
    x = np.cos(phi1) * np.sin(phi2) - np.sin(phi1) * np.cos(phi2) * np.cos(dlambda)
    initial_bearing = np.degrees(np.arctan2(y, x))
    return (initial_bearing + 360.0) % 360.0


def clean_tracks():
    print("=" * 78)
    print("  02_CLEAN_TRACKS: ICEBERG TRACK CLEANING & TEMPORAL QC")
    print(f"  Project Root: {PROJECT_ROOT}")
    print("=" * 78)

    print(f"Loading raw tracks: {TRACKS_RAW_PARQUET}")
    df = pd.read_parquet(TRACKS_RAW_PARQUET)
    orig_count = len(df)
    print(f"Initial raw rows: {orig_count:,}")

    # A. iceberg_id
    df["iceberg_id"] = df["iceberg_id"].astype(str).str.strip()
    df = df[df["iceberg_id"].notna() & (df["iceberg_id"] != "") & (df["iceberg_id"] != "nan")]

    # B. date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    if df["date"].dt.tz is not None:
        df["date"] = df["date"].dt.tz_localize(None)
    df = df[df["date"].notna()]

    # C. latitude
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df = df[df["lat"].notna() & (df["lat"] >= -90.0) & (df["lat"] <= 90.0)]

    # D. longitude: normalize to [-180, 180]
    df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
    df = df[df["lon"].notna()]
    df["lon"] = (df["lon"] + 180.0) % 360.0 - 180.0

    # E. length / width: convert numeric, impossible negatives to NaN, preserve missing
    for col in ["length", "width"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df.loc[df[col] < 0, col] = np.nan

    # F. source: lowercase and strip
    if "source" in df.columns:
        df["source"] = df["source"].astype(str).str.lower().str.strip()

    # G. confidence: numeric
    if "confidence" in df.columns:
        df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce")

    # Remove exact duplicate rows
    df = df.drop_duplicates()
    print(f"After removing exact duplicates: {len(df):,}")

    # Check for duplicate (iceberg_id, date) conflicts
    dups = df[df.duplicated(subset=["iceberg_id", "date"], keep=False)].copy()
    if len(dups) > 0:
        print(f"Found {len(dups):,} duplicate (iceberg_id, date) entries. Documenting conflicts...")
        # Check if coordinates conflict
        conflicts = []
        for (iid, dt), group in dups.groupby(["iceberg_id", "date"]):
            lat_diff = group["lat"].max() - group["lat"].min()
            lon_diff = group["lon"].max() - group["lon"].min()
            if lat_diff > 0.001 or lon_diff > 0.001:
                for _, row in group.iterrows():
                    conflicts.append({
                        "iceberg_id": iid,
                        "date": dt,
                        "lat": row["lat"],
                        "lon": row["lon"],
                        "source": row.get("source", "N/A"),
                        "confidence": row.get("confidence", np.nan),
                        "conflict_type": "position_divergence"
                    })
        df_conflicts = pd.DataFrame(conflicts)
        df_conflicts.to_csv(DUPLICATE_CONFLICTS_CSV, index=False)
        print(f"Documented {len(df_conflicts):,} conflicting positions in {DUPLICATE_CONFLICTS_CSV}")

        # Resolve duplicates by picking highest confidence or latest sensor
        # Sensor priority order: ascat > nic > oscat > qscat > seawinds > nscat > ers > sass
        sensor_weights = {"ascat": 8, "nic": 7, "oscat": 6, "qscat": 5, "seawinds": 4, "nscat": 3, "ers": 2, "sass": 1}
        df["_sensor_rank"] = df["source"].map(sensor_weights).fillna(0)
        df["_conf_rank"] = df["confidence"].fillna(0)
        df = df.sort_values(["iceberg_id", "date", "_conf_rank", "_sensor_rank"], ascending=[True, True, False, False])
        df = df.drop_duplicates(subset=["iceberg_id", "date"], keep="first")
        df = df.drop(columns=["_sensor_rank", "_conf_rank"])
        print(f"After resolving (iceberg_id, date) duplicates: {len(df):,}")
    else:
        pd.DataFrame(columns=["iceberg_id", "date", "lat", "lon", "source", "confidence", "conflict_type"]).to_csv(DUPLICATE_CONFLICTS_CSV, index=False)

    # Sort chronologically per iceberg
    df = df.sort_values(["iceberg_id", "date"]).reset_index(drop=True)

    # Filter to Golden Window
    print(f"\nFiltering to Golden Time Window: {GOLDEN_START.date()} to {GOLDEN_END.date()}...")
    df_golden = df[(df["date"] >= GOLDEN_START) & (df["date"] <= GOLDEN_END)].copy()
    df_golden = df_golden.sort_values(["iceberg_id", "date"]).reset_index(drop=True)
    print(f"Golden Window Observations: {len(df_golden):,} across {df_golden['iceberg_id'].nunique()} icebergs")

    # Step 6: Temporal Quality Control & Geodesic Metric Recalculation
    print("\nComputing geodesic kinematics and quality control flags...")
    
    # Pre-allocate previous & next observations per iceberg
    df_golden["previous_lat"] = np.nan
    df_golden["previous_lon"] = np.nan
    df_golden["previous_date"] = pd.NaT

    df_golden["next_lat"] = np.nan
    df_golden["next_lon"] = np.nan
    df_golden["next_date"] = pd.NaT

    # Groupby shifts
    g = df_golden.groupby("iceberg_id")
    df_golden["previous_lat"] = g["lat"].shift(1)
    df_golden["previous_lon"] = g["lon"].shift(1)
    df_golden["previous_date"] = g["date"].shift(1)

    df_golden["next_lat"] = g["lat"].shift(-1)
    df_golden["next_lon"] = g["lon"].shift(-1)
    df_golden["next_date"] = g["date"].shift(-1)

    # Compute dt_days
    dt_sec = (df_golden["date"] - df_golden["previous_date"]).dt.total_seconds()
    df_golden["dt_days"] = dt_sec / 86400.0

    # Compute delta_lat and delta_lon (with dateline wrap)
    df_golden["delta_lat"] = df_golden["lat"] - df_golden["previous_lat"]
    dlon = df_golden["lon"] - df_golden["previous_lon"]
    df_golden["delta_lon"] = (dlon + 180.0) % 360.0 - 180.0

    # Geodesic Haversine distance
    has_prev = df_golden["previous_lat"].notna()
    dist_km = np.zeros(len(df_golden))
    dist_km[has_prev] = haversine_np(
        df_golden.loc[has_prev, "previous_lat"].values,
        df_golden.loc[has_prev, "previous_lon"].values,
        df_golden.loc[has_prev, "lat"].values,
        df_golden.loc[has_prev, "lon"].values
    )
    df_golden["distance_km"] = np.where(has_prev, dist_km, np.nan)

    # Speed (km/day)
    df_golden["speed_kmday"] = np.where(
        has_prev & (df_golden["dt_days"] > 0),
        df_golden["distance_km"] / df_golden["dt_days"],
        np.nan
    )

    # Direction / bearing (degrees)
    bearings = np.full(len(df_golden), np.nan)
    bearings[has_prev] = bearing_np(
        df_golden.loc[has_prev, "previous_lat"].values,
        df_golden.loc[has_prev, "previous_lon"].values,
        df_golden.loc[has_prev, "lat"].values,
        df_golden.loc[has_prev, "lon"].values
    )
    df_golden["direction_deg"] = bearings

    # Quality Flags classification
    # Flags: valid, first_observation, zero_movement, large_jump, impossible_speed, negative_time, large_gap, dateline_crossing
    flags = []
    for idx, row in df_golden.iterrows():
        f_list = []
        if pd.isna(row["previous_date"]):
            f_list.append("first_observation")
        else:
            if row["dt_days"] < 0:
                f_list.append("negative_time")
            elif row["dt_days"] == 0:
                f_list.append("duplicate_time")
            elif row["dt_days"] > 30.0:
                f_list.append("large_gap")

            if row["speed_kmday"] == 0.0:
                f_list.append("zero_movement")
            elif row["speed_kmday"] > 300.0:
                f_list.append("impossible_speed")
            elif row["speed_kmday"] > 150.0:
                f_list.append("large_jump")

            # Check dateline crossing: if raw lon difference without wrapping > 180
            if abs(row["lon"] - row["previous_lon"]) > 180.0:
                f_list.append("dateline_crossing")

        if not f_list:
            f_list.append("valid")
        flags.append(";".join(f_list))

    df_golden["quality_flags"] = flags

    # Summary of flags
    print("\nQuality Flags Distribution:")
    flag_series = df_golden["quality_flags"].str.split(";").explode()
    print(flag_series.value_counts())

    # Save to parquet
    df_golden.to_parquet(GOLDEN_PARQUET, index=False)
    print(f"\nSaved clean Golden Window tracks to: {GOLDEN_PARQUET}")
    print(f"File size: {GOLDEN_PARQUET.stat().st_size / (1024 * 1024):.2f} MB")
    print("02_clean_tracks completed successfully.")


if __name__ == "__main__":
    clean_tracks()
