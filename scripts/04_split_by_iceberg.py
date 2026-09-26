"""
04_split_by_iceberg.py
Part 4: Iceberg-level train / validation / test splitting (zero leakage).
Produces:
  - dataSet/train.parquet
  - dataSet/validation.parquet
  - dataSet/test.parquet
  - dataSet/train_icebergs.txt
  - dataSet/validation_icebergs.txt
  - dataSet/test_icebergs.txt
"""

import os
import pandas as pd
import numpy as np

IN_PATH         = os.path.join("dataSet", "ml_dataset_final.parquet")
OUT_TRAIN       = os.path.join("dataSet", "train.parquet")
OUT_VAL         = os.path.join("dataSet", "validation.parquet")
OUT_TEST        = os.path.join("dataSet", "test.parquet")
TXT_TRAIN       = os.path.join("dataSet", "train_icebergs.txt")
TXT_VAL         = os.path.join("dataSet", "validation_icebergs.txt")
TXT_TEST        = os.path.join("dataSet", "test_icebergs.txt")

RANDOM_SEED = 42


def split_dataset():
    print(f"Loading {IN_PATH}...")
    df = pd.read_parquet(IN_PATH)

    unique_icebergs = sorted(df["iceberg_id"].unique())
    n_icebergs = len(unique_icebergs)
    print(f"Total unique icebergs: {n_icebergs}")
    print(f"Total observations: {len(df):,}")

    # Shuffle iceberg IDs with fixed seed
    rng = np.random.RandomState(RANDOM_SEED)
    shuffled_icebergs = rng.permutation(unique_icebergs)

    # 70% train, 15% validation, 15% test
    n_train = int(np.round(0.70 * n_icebergs))
    n_val   = int(np.round(0.15 * n_icebergs))
    # remainder to test
    train_ids = sorted(shuffled_icebergs[:n_train])
    val_ids   = sorted(shuffled_icebergs[n_train:n_train + n_val])
    test_ids  = sorted(shuffled_icebergs[n_train + n_val:])

    # Strict overlap verification
    s_train = set(train_ids)
    s_val   = set(val_ids)
    s_test  = set(test_ids)

    assert len(s_train & s_val) == 0, "Leakage Error: Overlap between Train and Validation!"
    assert len(s_train & s_test) == 0, "Leakage Error: Overlap between Train and Test!"
    assert len(s_val & s_test) == 0, "Leakage Error: Overlap between Validation and Test!"
    assert len(s_train | s_val | s_test) == n_icebergs, "Error: Missing icebergs after split!"

    print("\n--- Split Verification ---")
    print(f"Train Icebergs ({len(train_ids)}): {train_ids}")
    print(f"Val Icebergs   ({len(val_ids)}): {val_ids}")
    print(f"Test Icebergs  ({len(test_ids)}): {test_ids}")

    # Subset datasets
    df_train = df[df["iceberg_id"].isin(s_train)].reset_index(drop=True)
    df_val   = df[df["iceberg_id"].isin(s_val)].reset_index(drop=True)
    df_test  = df[df["iceberg_id"].isin(s_test)].reset_index(drop=True)

    print("\n--- Dataset Distribution ---")
    print(f"Train : {len(df_train):>5} rows ({len(df_train)/len(df)*100:5.1f}%) | Date: {df_train['date'].min().strftime('%Y-%m-%d')} to {df_train['date'].max().strftime('%Y-%m-%d')}")
    print(f"Val   : {len(df_val):>5} rows ({len(df_val)/len(df)*100:5.1f}%) | Date: {df_val['date'].min().strftime('%Y-%m-%d')} to {df_val['date'].max().strftime('%Y-%m-%d')}")
    print(f"Test  : {len(df_test):>5} rows ({len(df_test)/len(df)*100:5.1f}%) | Date: {df_test['date'].min().strftime('%Y-%m-%d')} to {df_test['date'].max().strftime('%Y-%m-%d')}")

    # Save parquets
    print("\nSaving splits...")
    df_train.to_parquet(OUT_TRAIN, index=False)
    df_val.to_parquet(OUT_VAL, index=False)
    df_test.to_parquet(OUT_TEST, index=False)

    # Save text files with iceberg lists
    for path, ids in [(TXT_TRAIN, train_ids), (TXT_VAL, val_ids), (TXT_TEST, test_ids)]:
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(ids) + "\n")

    print(f"  Saved {OUT_TRAIN}")
    print(f"  Saved {OUT_VAL}")
    print(f"  Saved {OUT_TEST}")
    print("Done. Split complete with zero data leakage.")


if __name__ == "__main__":
    split_dataset()
