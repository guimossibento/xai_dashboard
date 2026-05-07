import pandas as pd
import numpy as np
import sqlite3
import json
from pathlib import Path

ML_OUTPUT_PATH = Path(__file__).resolve().parent.parent / "ml_output"
DB_PATH = Path(__file__).resolve().parent / "products.db"
SIM_PATH = Path(__file__).resolve().parent / "sim_vectors.npy"

USECOLS = [
    "code", "product_name", "brands", "categories", "nutriscore_grade",
    "nova_group", "health_score", "health_grade", "eco_score", "eco_grade",
    "image_url", "energy_kcal_100g", "fat_100g", "saturated_fat_100g",
    "carbohydrates_100g", "sugars_100g", "fiber_100g", "proteins_100g",
    "salt_100g", "sodium_100g", "packaging", "origins", "labels",
    "stores", "quantity", "ingredients_text",
    "eco_packaging", "eco_processing", "eco_labels", "eco_origins",
]

PCT_COLS = ["fat_100g", "saturated_fat_100g", "sugars_100g", "salt_100g", "fiber_100g", "proteins_100g"]

REQUIRED_NUTRI = ["energy_kcal_100g", "fat_100g", "saturated_fat_100g", "sugars_100g", "salt_100g", "fiber_100g", "proteins_100g"]


def build():
    print(f"ML_OUTPUT_PATH: {ML_OUTPUT_PATH}")
    print(f"DB_PATH: {DB_PATH}")
    print(f"CSV exists: {(ML_OUTPUT_PATH / 'products_scored.csv').exists()}")

    df = pd.read_csv(
        ML_OUTPUT_PATH / "products_scored.csv",
        dtype={"code": str},
        usecols=USECOLS,
        low_memory=False,
    )
    df["code"] = df["code"].astype(str)

    original_indices = np.arange(len(df))

    mask = (
        df["health_score"].notna() & (df["health_score"] > 0) &
        df["eco_score"].notna() & (df["eco_score"] > 0) &
        df["product_name"].notna() & (df["product_name"] != "")
    )
    for col in REQUIRED_NUTRI:
        mask &= df[col].notna()

    kept_indices = original_indices[mask.values]
    df = df[mask].reset_index(drop=True)
    print(f"Filtered: {len(df)} products with complete data (from {len(original_indices)})")

    sim_full = np.load(ML_OUTPUT_PATH / "similarity_vectors.npy")
    sim_filtered = sim_full[kept_indices].astype(np.float32)
    np.save(str(SIM_PATH), sim_filtered)
    print(f"Similarity vectors: {sim_filtered.shape} -> {SIM_PATH.stat().st_size / 1024 / 1024:.1f} MB")
    del sim_full, sim_filtered

    carbon_path = ML_OUTPUT_PATH / "carbon_data.csv"
    if carbon_path.exists():
        carbon = pd.read_csv(carbon_path, dtype={"code": str})
        carbon["code"] = carbon["code"].astype(str)
        before = len(df)
        df = df.merge(carbon, on="code", how="left")
        has_co2 = df["co2_total"].notna().sum()
        print(f"Carbon data merged: {has_co2}/{len(df)} products have CO2 values")
    else:
        print("No carbon_data.csv found, skipping carbon columns")
        for col in ["co2_agriculture", "co2_processing", "co2_packaging", "co2_transportation", "co2_distribution", "co2_consumption", "co2_total",
                     "ef_agriculture", "ef_processing", "ef_packaging", "ef_transportation", "ef_distribution", "ef_consumption", "ef_total"]:
            df[col] = None

    df["row_idx"] = range(len(df))
    for col in PCT_COLS:
        df[f"pct_{col}"] = df[col].rank(pct=True).fillna(0.5).round(4)

    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    df.to_sql("products", conn, index=False, if_exists="replace")

    conn.execute("CREATE INDEX idx_code ON products(code)")
    conn.execute("CREATE INDEX idx_health ON products(health_score)")
    conn.execute("CREATE INDEX idx_eco ON products(eco_score)")

    stats = {
        "total_products": str(len(df)),
        "avg_health_score": str(round(float(df["health_score"].mean()), 2)),
        "avg_eco_score": str(round(float(df["eco_score"].mean()), 2)),
        "avg_combined_score": str(round(float((0.5 * df["health_score"].fillna(0) + 0.5 * df["eco_score"].fillna(0)).mean()), 2)),
        "health_grade_distribution": json.dumps({str(k): int(v) for k, v in df["health_grade"].value_counts().items()}),
        "eco_grade_distribution": json.dumps({str(k): int(v) for k, v in df["eco_grade"].value_counts().items()}),
        "nutriscore_grade_distribution": json.dumps({str(k): int(v) for k, v in df["nutriscore_grade"].value_counts().items()}),
    }

    conn.execute("CREATE TABLE stats (key TEXT PRIMARY KEY, value TEXT)")
    for k, v in stats.items():
        conn.execute("INSERT INTO stats VALUES (?, ?)", (k, v))

    categories = {}
    for cats_str in df["categories"].dropna():
        for cat in str(cats_str).split(","):
            cat = cat.strip()
            if cat:
                categories[cat] = categories.get(cat, 0) + 1
    sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:50]

    conn.execute("CREATE TABLE categories (name TEXT, count INTEGER)")
    for name, count in sorted_cats:
        conn.execute("INSERT INTO categories VALUES (?, ?)", (name, count))

    conn.commit()
    conn.close()
    print(f"Built {DB_PATH} ({DB_PATH.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    build()
