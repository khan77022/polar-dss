"""
IceBerg Data Pipeline
=====================
Steps:
  1. Load all 556 iceberg CSVs from consolidated_database_v8.0.zip
  2. Normalize all source-sensor schemas → (date, lat, lon, size_1, size_2, source, confidence)
  3. Clean dates: YYYYDDD → datetime
  4. Deduplicate per (iceberg_id, date) by picking best-confidence source
  5. Compute movement: delta_lat, delta_lon, speed (km/day), direction (degrees)
  6. Save clean master table to parquet + CSV

Output:
  dataSet/iceberg_tracks_clean.parquet
  dataSet/iceberg_tracks_clean.csv
"""

import zipfile
import os
import io
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
DATASET_DIR   = os.path.join(os.path.dirname(__file__), "dataSet")
CONSOL_ZIP    = os.path.join(DATASET_DIR, "consolidated_database_v8.0.zip")
OUT_PARQUET   = os.path.join(DATASET_DIR, "iceberg_tracks_clean.parquet")
OUT_CSV       = os.path.join(DATASET_DIR, "iceberg_tracks_clean.csv")

# Priority order for picking best lat/lon when multiple sensors available
# Higher index = higher priority (overwrites lower)
SENSOR_PRIORITY = ["sass", "ers", "nscat", "seawinds", "qscat", "oscat", "nic", "ascat"]


# ─────────────────────────────────────────────
# STEP 1 ─ DATE PARSER  (YYYYDDD → datetime)
# ─────────────────────────────────────────────
def parse_yyyyddd(yyyyddd: int) -> pd.Timestamp | None:
    """Convert 2012075 → 2012-03-15"""
    try:
        s = str(int(yyyyddd))
        if len(s) != 7:
            return None
        year = int(s[:4])
        doy  = int(s[4:])
        return pd.Timestamp(year=year, month=1, day=1) + pd.Timedelta(days=doy - 1)
    except Exception:
        return None


# ─────────────────────────────────────────────
# STEP 2 ─ NORMALIZE ONE CSV
# ─────────────────────────────────────────────
def normalize_csv(iceberg_id: str, content: str) -> pd.DataFrame:
    """
    Reads a raw iceberg CSV (any of the 27 schema variants) and
    returns a standardised DataFrame with columns:
      iceberg_id | date | lat | lon | length | width | source | confidence
    """
    lines = content.strip().splitlines()
    if len(lines) < 2:
        return pd.DataFrame()

    cols = [c.strip() for c in lines[0].split(",")]
    rows = []
    for line in lines[1:]:
        parts = line.strip().split(",")
        if len(parts) != len(cols):
            continue
        rows.append(dict(zip(cols, parts)))

    if not rows:
        return pd.DataFrame()

    raw = pd.DataFrame(rows)

    # Cast numeric columns
    for c in raw.columns:
        try:
            raw[c] = pd.to_numeric(raw[c])
        except Exception:
            pass

    # Find the date column (always named 'date')
    if "date" not in raw.columns:
        return pd.DataFrame()

    raw["date"] = raw["date"].astype(float).astype(int)

    # ── pick best lat/lon/confidence from available sensors ──
    # Build per-sensor triplets:  sensor → (lat_col, lon_col, flag_col)
    available_sensors = {}
    for sensor in SENSOR_PRIORITY:
        c1, c2, c3 = f"{sensor}_1", f"{sensor}_2", f"{sensor}_3"
        if all(c in raw.columns for c in [c1, c2, c3]):
            available_sensors[sensor] = (c1, c2, c3)

    if not available_sensors:
        return pd.DataFrame()

    # Build consolidated rows: iterate sensors low→high priority
    result_lat  = pd.Series(np.nan, index=raw.index)
    result_lon  = pd.Series(np.nan, index=raw.index)
    result_conf = pd.Series(0,      index=raw.index, dtype=int)
    result_src  = pd.Series("",     index=raw.index)

    for sensor, (c1, c2, c3) in available_sensors.items():
        valid = (raw[c3].astype(float) == 1) & (raw[c1].astype(float) != 0)
        result_lat[valid]  = raw.loc[valid, c1].astype(float)
        result_lon[valid]  = raw.loc[valid, c2].astype(float)
        result_conf[valid] = 1
        result_src[valid]  = sensor

    raw["lat"]        = result_lat
    raw["lon"]        = result_lon
    raw["confidence"] = result_conf
    raw["source"]     = result_src

    # ── size ──
    raw["length"] = raw["size_1"].astype(float) if "size_1" in raw.columns else np.nan
    raw["width"]  = raw["size_2"].astype(float) if "size_2" in raw.columns else np.nan

    # Replace size 0 with NaN
    if "length" in raw.columns:
        raw.loc[raw["length"] == 0, "length"] = np.nan
    if "width" in raw.columns:
        raw.loc[raw["width"] == 0, "width"] = np.nan

    # Drop rows with no valid position
    raw = raw.dropna(subset=["lat", "lon"])
    raw = raw[raw["lat"] != 0]

    # Final columns
    out = raw[["date", "lat", "lon", "length", "width", "source", "confidence"]].copy()
    out.insert(0, "iceberg_id", iceberg_id)
    return out


# ─────────────────────────────────────────────
# STEP 3 ─ LOAD ALL CSVS
# ─────────────────────────────────────────────
def load_all_tracks(zip_path: str) -> pd.DataFrame:
    frames = []
    with zipfile.ZipFile(zip_path) as zf:
        names = sorted([n for n in zf.namelist() if n.endswith(".csv")])
        print(f"Loading {len(names)} CSVs...")
        for i, name in enumerate(names):
            iceberg_id = os.path.splitext(os.path.basename(name))[0]  # e.g. "uk321"
            content    = zf.read(name).decode("utf-8", errors="replace")
            df         = normalize_csv(iceberg_id, content)
            if not df.empty:
                frames.append(df)
            if (i + 1) % 100 == 0:
                print(f"  [{i+1}/{len(names)}] processed...")

    print(f"Combining {len(frames)} non-empty tracks...")
    combined = pd.concat(frames, ignore_index=True)
    print(f"  Raw combined rows: {len(combined):,}")
    return combined


# ─────────────────────────────────────────────
# STEP 4 ─ CLEAN DATES
# ─────────────────────────────────────────────
def clean_dates(df: pd.DataFrame) -> pd.DataFrame:
    print("Parsing YYYYDDD dates...")
    df["date_parsed"] = df["date"].apply(parse_yyyyddd)
    bad = df["date_parsed"].isna().sum()
    if bad > 0:
        print(f"  Warning: {bad:,} rows with unparseable dates dropped")
    df = df.dropna(subset=["date_parsed"])
    df = df.drop(columns=["date"])
    df = df.rename(columns={"date_parsed": "date"})
    df["date"] = pd.to_datetime(df["date"])
    return df


# ─────────────────────────────────────────────
# STEP 5 ─ DEDUPLICATE  (iceberg_id + date)
# ─────────────────────────────────────────────
def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """
    If multiple sensors fire on the same iceberg+date,
    keep the highest-priority (ascat > nic > oscat > ...) row.
    """
    print("Deduplicating (iceberg_id, date)...")
    sensor_rank = {s: i for i, s in enumerate(SENSOR_PRIORITY)}
    df["_rank"] = df["source"].map(sensor_rank).fillna(-1).astype(int)
    df = (df.sort_values("_rank", ascending=False)
            .drop_duplicates(subset=["iceberg_id", "date"], keep="first")
            .drop(columns=["_rank"])
            .sort_values(["iceberg_id", "date"])
            .reset_index(drop=True))
    print(f"  After dedup: {len(df):,} rows")
    return df


# ─────────────────────────────────────────────
# STEP 6 ─ COMPUTE MOVEMENT
# ─────────────────────────────────────────────
def _vec_haversine(lat1, lon1, lat2, lon2):
    """Vectorized haversine distance in km (NumPy arrays)."""
    R = 6371.0
    φ1 = np.radians(lat1);  φ2 = np.radians(lat2)
    Δφ = np.radians(lat2 - lat1)
    Δλ = np.radians(lon2 - lon1)
    a  = np.sin(Δφ/2)**2 + np.cos(φ1) * np.cos(φ2) * np.sin(Δλ/2)**2
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))


def _vec_bearing(lat1, lon1, lat2, lon2):
    """Vectorized initial bearing in degrees 0–360 (NumPy arrays)."""
    φ1 = np.radians(lat1);  φ2 = np.radians(lat2)
    Δλ = np.radians(lon2 - lon1)
    x  = np.sin(Δλ) * np.cos(φ2)
    y  = np.cos(φ1) * np.sin(φ2) - np.sin(φ1) * np.cos(φ2) * np.cos(Δλ)
    return (np.degrees(np.arctan2(x, y)) + 360) % 360


def compute_movement(df: pd.DataFrame) -> pd.DataFrame:
    """
    Vectorized movement calculation — ~100x faster than a Python loop.
    Shifts each column by 1 within each iceberg_id group to get prev position.
    """
    print("Computing movement (vectorized haversine)...")
    df = df.sort_values(["iceberg_id", "date"]).reset_index(drop=True)

    # Shifted (previous-row) columns — NaN at group boundaries
    grp        = df["iceberg_id"]
    same_track = grp.eq(grp.shift(1))          # True where prev row is same iceberg

    lat0 = df["lat"].shift(1).where(same_track)
    lon0 = df["lon"].shift(1).where(same_track)
    lat1 = df["lat"]
    lon1 = df["lon"]

    dt_sec = (df["date"] - df["date"].shift(1)).where(same_track).dt.total_seconds()
    dt_day = dt_sec / 86400.0

    dist = _vec_haversine(lat0.values, lon0.values, lat1.values, lon1.values)
    brg  = _vec_bearing(lat0.values, lon0.values, lat1.values, lon1.values)

    df["delta_lat"]   = (lat1 - lat0).round(6)
    df["delta_lon"]   = (lon1 - lon0).round(6)
    df["dt_days"]     = dt_day.round(4)
    df["speed_kmday"] = np.where(dt_day > 0, dist / dt_day, np.nan).round(4)
    df["direction"]   = np.where(same_track, brg, np.nan).round(2)

    # Zero dt (same-day duplicate) → NaN movement
    df.loc[dt_day == 0, ["delta_lat","delta_lon","speed_kmday","direction"]] = np.nan

    # Flag physically impossible speeds (>100 km/day ≈ 1.16 m/s for icebergs)
    impossible = df["speed_kmday"] > 100
    print(f"  Flagging {impossible.sum():,} rows with speed > 100 km/day as NaN")
    df.loc[impossible, ["delta_lat","delta_lon","speed_kmday","direction"]] = np.nan

    return df


# ─────────────────────────────────────────────
# STEP 7 ─ SAVE
# ─────────────────────────────────────────────
def save(df: pd.DataFrame):
    print(f"\nSaving to:\n  {OUT_CSV}")
    df.to_csv(OUT_CSV, index=False)

    try:
        df.to_parquet(OUT_PARQUET, index=False)
        print(f"  {OUT_PARQUET}")
    except ImportError:
        print("  (parquet skipped — install pyarrow for binary format)")

    print(f"\nDone. Final table: {len(df):,} rows × {len(df.columns)} columns")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nSample:\n{df.head(10).to_string()}")
    print(f"\nStats:\n{df.describe()}")
    print(f"\nDate range: {df['date'].min()} -> {df['date'].max()}")
    print(f"Unique icebergs: {df['iceberg_id'].nunique()}")
    print(f"\nSource distribution:\n{df['source'].value_counts()}")
    print(f"\nMissing values:\n{df.isna().sum()}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("IceBerg Data Pipeline")
    print("=" * 60)

    df = load_all_tracks(CONSOL_ZIP)
    df = clean_dates(df)
    df = deduplicate(df)
    df = compute_movement(df)
    save(df)

    print("\n✅ Pipeline complete!")
