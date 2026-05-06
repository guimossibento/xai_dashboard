from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import math
import json
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()


def clean_val(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return round(float(v), 2)
    if isinstance(v, np.bool_):
        return bool(v)
    return v


def clean_dict(d):
    return {k: clean_val(v) if not isinstance(v, dict) else clean_dict(v) for k, v in d.items()}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ML_OUTPUT_PATH = Path(__file__).resolve().parent.parent / "ml_output"

df_products = None
df_attributions = None
similarity_vectors = None
feature_names = None


class ProductResponse(BaseModel):
    code: str
    product_name: str
    brands: Optional[str] = None
    categories: Optional[str] = None
    nutriscore_grade: Optional[str] = None
    nova_group: Optional[float] = None
    health_score: Optional[float] = None
    health_grade: Optional[str] = None
    eco_score: Optional[float] = None
    eco_grade: Optional[str] = None
    combined_score: Optional[float] = None
    image_url: Optional[str] = None


class ProductDetailResponse(ProductResponse):
    energy_kcal_100g: Optional[float] = None
    fat_100g: Optional[float] = None
    saturated_fat_100g: Optional[float] = None
    carbohydrates_100g: Optional[float] = None
    sugars_100g: Optional[float] = None
    fiber_100g: Optional[float] = None
    proteins_100g: Optional[float] = None
    salt_100g: Optional[float] = None
    sodium_100g: Optional[float] = None
    packaging: Optional[str] = None
    origins: Optional[str] = None
    labels: Optional[str] = None
    stores: Optional[str] = None
    quantity: Optional[str] = None
    ingredients_text: Optional[str] = None
    feature_attributions: Dict[str, Any] = {}
    explanation: str = ""


class AlternativeResponse(BaseModel):
    product: ProductResponse
    explanation: str
    score_diff: float
    comparison: Dict[str, Any] = {}


class CompareResponse(BaseModel):
    products: List[ProductDetailResponse]


class CategoryResponse(BaseModel):
    name: str
    count: int


class StatsResponse(BaseModel):
    total_products: int
    avg_health_score: float
    avg_eco_score: float
    avg_combined_score: float
    health_grade_distribution: Dict[str, int]
    eco_grade_distribution: Dict[str, int]
    nutriscore_grade_distribution: Dict[str, int]


USECOLS = [
    "code", "product_name", "brands", "categories", "nutriscore_grade",
    "nova_group", "health_score", "health_grade", "eco_score", "eco_grade",
    "image_url", "energy_kcal_100g", "fat_100g", "saturated_fat_100g",
    "carbohydrates_100g", "sugars_100g", "fiber_100g", "proteins_100g",
    "salt_100g", "sodium_100g", "packaging", "origins", "labels",
    "stores", "quantity", "ingredients_text",
    "eco_packaging", "eco_processing", "eco_labels", "eco_origins",
]

def load_data():
    global df_products, df_attributions, similarity_vectors, feature_names

    df_products = pd.read_csv(
        ML_OUTPUT_PATH / "products_scored.csv",
        dtype={"code": str},
        usecols=USECOLS,
        low_memory=False,
    )
    df_products["code"] = df_products["code"].astype(str)
    for col in ["brands", "categories", "nutriscore_grade", "health_grade", "eco_grade", "packaging", "origins"]:
        if col in df_products.columns:
            df_products[col] = df_products[col].astype("category")
    for col in df_products.select_dtypes("float64").columns:
        df_products[col] = df_products[col].astype("float32")

    df_attributions = pd.read_csv(ML_OUTPUT_PATH / "feature_attributions.csv")
    for col in df_attributions.select_dtypes("float64").columns:
        df_attributions[col] = df_attributions[col].astype("float32")

    similarity_vectors = np.load(ML_OUTPUT_PATH / "similarity_vectors.npy").astype(np.float32)

    with open(ML_OUTPUT_PATH / "feature_names.json") as f:
        feature_names = json.load(f)


@app.on_event("startup")
async def startup():
    load_data()


def safe_str(v):
    return str(v) if pd.notna(v) else None


def safe_float(v):
    try:
        f = float(v)
        return None if math.isnan(f) else round(f, 2)
    except (ValueError, TypeError):
        return None


def make_product(row, health_weight=0.5):
    return ProductResponse(
        code=str(row["code"]),
        product_name=safe_str(row["product_name"]) or "",
        brands=safe_str(row["brands"]),
        categories=safe_str(row["categories"]),
        nutriscore_grade=safe_str(row["nutriscore_grade"]),
        nova_group=safe_float(row["nova_group"]),
        health_score=safe_float(row["health_score"]),
        health_grade=safe_str(row["health_grade"]),
        eco_score=safe_float(row["eco_score"]),
        eco_grade=safe_str(row["eco_grade"]),
        combined_score=safe_float(health_weight * (row["health_score"] if pd.notna(row["health_score"]) else 0) + (1 - health_weight) * (row["eco_score"] if pd.notna(row["eco_score"]) else 0)),
        image_url=safe_str(row["image_url"]),
    )


def make_detail(row, row_idx):
    p = make_product(row)
    return ProductDetailResponse(
        **p.model_dump(),
        energy_kcal_100g=safe_float(row["energy_kcal_100g"]),
        fat_100g=safe_float(row["fat_100g"]),
        saturated_fat_100g=safe_float(row["saturated_fat_100g"]),
        carbohydrates_100g=safe_float(row["carbohydrates_100g"]),
        sugars_100g=safe_float(row["sugars_100g"]),
        fiber_100g=safe_float(row["fiber_100g"]),
        proteins_100g=safe_float(row["proteins_100g"]),
        salt_100g=safe_float(row["salt_100g"]),
        sodium_100g=safe_float(row["sodium_100g"]),
        packaging=safe_str(row["packaging"]),
        origins=safe_str(row["origins"]),
        labels=safe_str(row["labels"]),
        stores=safe_str(row["stores"]),
        quantity=safe_str(row["quantity"]),
        ingredients_text=safe_str(row["ingredients_text"]),
        feature_attributions=clean_dict(get_feature_attributions(row_idx)),
        explanation=generate_explanation(row),
    )



def normalize_combined_score(row, health_weight=0.5):
    health = row["health_score"] if pd.notna(row["health_score"]) else 0
    eco = row["eco_score"] if pd.notna(row["eco_score"]) else 0
    return health_weight * health + (1 - health_weight) * eco


nutrition_percentiles = None

def precompute_percentiles():
    global nutrition_percentiles
    cols = ["fat_100g", "saturated_fat_100g", "sugars_100g", "salt_100g", "fiber_100g", "proteins_100g"]
    nutrition_percentiles = {}
    for c in cols:
        nutrition_percentiles[c] = df_products[c].rank(pct=True).fillna(0.5).values


def get_feature_attributions(row_idx):
    if nutrition_percentiles is None:
        precompute_percentiles()

    radar = {}
    negative = {"fat_100g": "fat", "saturated_fat_100g": "saturated_fat", "sugars_100g": "sugars", "salt_100g": "salt"}
    positive = {"fiber_100g": "fiber", "proteins_100g": "proteins"}

    for col, label in negative.items():
        pct = nutrition_percentiles[col][row_idx]
        radar[label] = round((1 - pct) * 100, 1)

    for col, label in positive.items():
        pct = nutrition_percentiles[col][row_idx]
        radar[label] = round(pct * 100, 1)

    row = df_products.iloc[row_idx]
    def eco_signed(col):
        v = float(row.get(col, 0) or 0)
        return round((v - 0.5) * 80, 1)

    eco_breakdown = [
        {"label": "Packaging", "value": eco_signed("eco_packaging")},
        {"label": "Processing (NOVA)", "value": eco_signed("eco_processing")},
        {"label": "Eco labels", "value": eco_signed("eco_labels")},
        {"label": "Origin", "value": eco_signed("eco_origins")},
    ]

    return {
        "radar": radar,
        "eco_breakdown": eco_breakdown,
    }


def generate_explanation(row):
    health_score = row["health_score"] if pd.notna(row["health_score"]) else 0
    health_grade = row["health_grade"] if pd.notna(row["health_grade"]) else "N/A"
    eco_score = row["eco_score"] if pd.notna(row["eco_score"]) else 0
    eco_grade = row["eco_grade"] if pd.notna(row["eco_grade"]) else "N/A"

    packaging = row["packaging"] if pd.notna(row["packaging"]) else "unknown"

    try:
        nova_int = int(float(row["nova_group"])) if pd.notna(row["nova_group"]) else 0
    except (ValueError, TypeError):
        nova_int = 0
    nova_text = {1: "minimally processed", 2: "processed with added ingredients", 3: "processed foods", 4: "ultra-processed"}.get(nova_int, "unknown processing level")

    explanation = f"This product received a Health Score of {health_score:.1f} (grade {health_grade}). "
    explanation += f"Its Environmental Impact Score of {eco_score:.1f} (grade {eco_grade}) is driven by {nova_text} and {packaging} packaging."

    return explanation


@app.get("/api/products", response_model=Dict[str, Any])
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    nutri_grade: Optional[str] = None,
    eco_grade: Optional[str] = None,
    sort: str = "combined",
    health_weight: float = 0.5,
    page: int = 1,
    page_size: int = 20,
):
    filtered = df_products.copy()

    if q:
        q_lower = q.lower()
        filtered = filtered[
            (filtered["product_name"].str.lower().str.contains(q_lower, na=False)) |
            (filtered["brands"].str.lower().str.contains(q_lower, na=False))
        ]

    if category:
        filtered = filtered[filtered["categories"].str.contains(category, case=False, na=False)]

    if nutri_grade:
        filtered = filtered[filtered["nutriscore_grade"] == nutri_grade]

    if eco_grade:
        filtered = filtered[filtered["eco_grade"] == eco_grade]

    if sort == "combined":
        filtered = filtered.copy()
        filtered["_sort"] = health_weight * filtered["health_score"].fillna(0) + (1 - health_weight) * filtered["eco_score"].fillna(0)
        filtered = filtered.sort_values("_sort", ascending=False)
    elif sort == "health":
        filtered = filtered.sort_values("health_score", ascending=False)
    elif sort == "eco":
        filtered = filtered.sort_values("eco_score", ascending=False)
    elif sort == "name":
        filtered = filtered.sort_values("product_name", ascending=True)

    total = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size

    results = []
    for _, row in filtered.iloc[start:end].iterrows():
        results.append(make_product(row, health_weight))

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": results,
    }


@app.get("/api/products/{code}", response_model=ProductDetailResponse)
async def get_product(code: str):
    product = df_products[df_products["code"].astype(str) == code]

    if product.empty:
        raise HTTPException(status_code=404, detail="Product not found")

    row = product.iloc[0]
    row_idx = product.index[0]

    return make_detail(row, row_idx)


@app.get("/api/products/{code}/alternatives", response_model=Dict[str, List[AlternativeResponse]])
async def get_alternatives(code: str):
    product = df_products[df_products["code"].astype(str) == code]

    if product.empty:
        raise HTTPException(status_code=404, detail="Product not found")

    row_idx = product.index[0]
    product_vec = similarity_vectors[row_idx].reshape(1, -1)

    similarities = cosine_similarity(product_vec, similarity_vectors)[0]

    current_health = product.iloc[0]["health_score"] if pd.notna(product.iloc[0]["health_score"]) else 0
    current_eco = product.iloc[0]["eco_score"] if pd.notna(product.iloc[0]["eco_score"]) else 0

    health_better = df_products[df_products["health_score"] > current_health].copy()
    health_better["_similarity"] = similarities[health_better.index]
    health_better = health_better.nlargest(3, "_similarity")

    eco_better = df_products[df_products["eco_score"] > current_eco].copy()
    eco_better["_similarity"] = similarities[eco_better.index]
    eco_better = eco_better.nlargest(3, "_similarity")

    cur = product.iloc[0]
    cur_sat = float(cur["saturated_fat_100g"]) if "saturated_fat_100g" in cur.index and pd.notna(cur["saturated_fat_100g"]) else 0
    cur_sugars = float(cur["sugars_100g"]) if "sugars_100g" in cur.index and pd.notna(cur["sugars_100g"]) else 0
    cur_protein = float(cur["proteins_100g"]) if "proteins_100g" in cur.index and pd.notna(cur["proteins_100g"]) else 0
    cur_nova = float(cur["nova_group"]) if "nova_group" in cur.index and pd.notna(cur["nova_group"]) else 0
    cur_packaging = safe_str(cur["packaging"]) if "packaging" in cur.index else "—"
    cur_labels = safe_str(cur["labels"]) if "labels" in cur.index else "—"

    health_alts = []
    for _, row in health_better.iterrows():
        diff = round(float(row["health_score"] - current_health), 1)
        alt_sat = float(row["saturated_fat_100g"]) if "saturated_fat_100g" in row.index and pd.notna(row["saturated_fat_100g"]) else 0
        alt_sugars = float(row["sugars_100g"]) if "sugars_100g" in row.index and pd.notna(row["sugars_100g"]) else 0
        alt_protein = float(row["proteins_100g"]) if "proteins_100g" in row.index and pd.notna(row["proteins_100g"]) else 0
        health_alts.append(AlternativeResponse(
            product=make_product(row),
            explanation=f"This alternative has {diff:.1f} more health score with similar nutritional profile.",
            score_diff=diff,
            comparison={
                "sat_fat_diff": round(cur_sat - alt_sat, 1),
                "sugars_diff": round(cur_sugars - alt_sugars, 1),
                "protein_diff": round(alt_protein - cur_protein, 1),
            },
        ))

    eco_alts = []
    for _, row in eco_better.iterrows():
        diff = round(float(row["eco_score"] - current_eco), 1)
        alt_nova = float(row["nova_group"]) if "nova_group" in row.index and pd.notna(row["nova_group"]) else 0
        alt_packaging = safe_str(row["packaging"]) if "packaging" in row.index else "—"
        alt_labels = safe_str(row["labels"]) if "labels" in row.index else "—"
        eco_alts.append(AlternativeResponse(
            product=make_product(row),
            explanation=f"This alternative has {diff:.1f} more eco score with similar nutritional profile.",
            score_diff=diff,
            comparison={
                "packaging": alt_packaging,
                "packaging_was": cur_packaging,
                "nova": alt_nova,
                "nova_was": cur_nova,
                "labels": alt_labels,
            },
        ))

    return {
        "better_for_you": health_alts,
        "better_for_planet": eco_alts,
    }


@app.get("/api/compare", response_model=CompareResponse)
async def compare_products(codes: str = Query(...)):
    code_list = [c.strip() for c in codes.split(",")]

    results = []
    for code in code_list:
        product = df_products[df_products["code"].astype(str) == code]
        if not product.empty:
            row = product.iloc[0]
            row_idx = product.index[0]
            results.append(make_detail(row, row_idx))

    return CompareResponse(products=results)


@app.get("/api/categories", response_model=List[CategoryResponse])
async def list_categories():
    categories = {}

    for cats_str in df_products["categories"].dropna():
        for cat in cats_str.split(","):
            cat = cat.strip()
            categories[cat] = categories.get(cat, 0) + 1

    sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:50]

    return [CategoryResponse(name=name, count=count) for name, count in sorted_cats]


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    total = len(df_products)

    avg_health = round(float(df_products["health_score"].mean()), 2)
    avg_eco = round(float(df_products["eco_score"].mean()), 2)
    avg_combined = round(float(df_products["combined_score"].mean()), 2)

    health_dist = df_products["health_grade"].value_counts().to_dict()
    eco_dist = df_products["eco_grade"].value_counts().to_dict()
    nutri_dist = df_products["nutriscore_grade"].value_counts().to_dict()

    return StatsResponse(
        total_products=total,
        avg_health_score=avg_health,
        avg_eco_score=avg_eco,
        avg_combined_score=avg_combined,
        health_grade_distribution={str(k): int(v) for k, v in health_dist.items()},
        eco_grade_distribution={str(k): int(v) for k, v in eco_dist.items()},
        nutriscore_grade_distribution={str(k): int(v) for k, v in nutri_dist.items()},
    )
