import pandas as pd
import requests
import json
import time
from pathlib import Path

ML_OUTPUT = Path(__file__).resolve().parent.parent / "ml_output"
OUT_FILE = ML_OUTPUT / "carbon_data.csv"
BATCH_SIZE = 100
SAVE_EVERY = 500

API_URL = "https://world.openfoodfacts.org/api/v2/product/{code}?fields=code,ecoscore_data"
HEADERS = {"User-Agent": "GreenFind/1.0 (guilhermemossibento@gmail.com)"}

CO2_FIELDS = ["co2_agriculture", "co2_processing", "co2_packaging", "co2_transportation", "co2_distribution", "co2_consumption", "co2_total"]
EF_FIELDS = ["ef_agriculture", "ef_processing", "ef_packaging", "ef_transportation", "ef_distribution", "ef_consumption", "ef_total"]


def fetch_product(code):
    try:
        r = requests.get(API_URL.format(code=code), headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        product = data.get("product", {})
        eco = product.get("ecoscore_data", {})
        agri = eco.get("agribalyse", {})
        if not agri:
            return None
        row = {"code": code}
        for f in CO2_FIELDS + EF_FIELDS:
            row[f] = agri.get(f)
        return row
    except Exception as e:
        print(f"  Error {code}: {e}")
        return None


def main():
    df = pd.read_csv(ML_OUTPUT / "products_scored.csv", dtype={"code": str}, usecols=["code"])
    codes = df["code"].tolist()
    print(f"Total products: {len(codes)}")

    already = set()
    results = []
    if OUT_FILE.exists():
        existing = pd.read_csv(OUT_FILE, dtype={"code": str})
        already = set(existing["code"].tolist())
        results = existing.to_dict("records")
        print(f"Resuming: {len(already)} already fetched")

    remaining = [c for c in codes if c not in already]
    print(f"To fetch: {len(remaining)}")

    for i, code in enumerate(remaining):
        row = fetch_product(code)
        if row:
            results.append(row)

        if (i + 1) % 50 == 0:
            has_co2 = sum(1 for r in results if r.get("co2_total") is not None)
            print(f"  {i+1}/{len(remaining)} fetched, {has_co2} with CO2 data")

        if (i + 1) % SAVE_EVERY == 0:
            pd.DataFrame(results).to_csv(OUT_FILE, index=False)
            print(f"  Saved checkpoint ({len(results)} rows)")

        time.sleep(0.05)

    pd.DataFrame(results).to_csv(OUT_FILE, index=False)
    has_co2 = sum(1 for r in results if r.get("co2_total") is not None)
    print(f"\nDone! {len(results)} products with ecoscore_data, {has_co2} with CO2 values")
    print(f"Saved to {OUT_FILE}")


if __name__ == "__main__":
    main()
