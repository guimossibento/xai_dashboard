from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import math
import json
import sqlite3
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).resolve().parent / "products.db"
ML_OUTPUT_PATH = Path(__file__).resolve().parent.parent / "ml_output"

similarity_vectors = None
similarity_norms = None


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


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


@app.on_event("startup")
async def startup():
    global similarity_vectors, similarity_norms
    similarity_vectors = np.load(ML_OUTPUT_PATH / "similarity_vectors.npy").astype(np.float32)
    similarity_norms = np.linalg.norm(similarity_vectors, axis=1)


def sf(v):
    if v is None:
        return None
    try:
        f = float(v)
        return None if math.isnan(f) else round(f, 2)
    except (ValueError, TypeError):
        return None


def make_product(row, health_weight=0.5):
    hs = row["health_score"] or 0
    es = row["eco_score"] or 0
    return ProductResponse(
        code=str(row["code"]),
        product_name=row["product_name"] or "",
        brands=row["brands"],
        categories=row["categories"],
        nutriscore_grade=row["nutriscore_grade"],
        nova_group=sf(row["nova_group"]),
        health_score=sf(row["health_score"]),
        health_grade=row["health_grade"],
        eco_score=sf(row["eco_score"]),
        eco_grade=row["eco_grade"],
        combined_score=sf(health_weight * hs + (1 - health_weight) * es),
        image_url=row["image_url"],
    )


def get_feature_attributions(row):
    radar = {}
    for col, label in [("fat_100g", "fat"), ("saturated_fat_100g", "saturated_fat"), ("sugars_100g", "sugars"), ("salt_100g", "salt")]:
        radar[label] = round((1 - (row[f"pct_{col}"] or 0.5)) * 100, 1)
    for col, label in [("fiber_100g", "fiber"), ("proteins_100g", "proteins")]:
        radar[label] = round((row[f"pct_{col}"] or 0.5) * 100, 1)

    def eco_signed(col):
        v = float(row[col] or 0)
        return round((v - 0.5) * 80, 1)

    eco_breakdown = [
        {"label": "Packaging", "value": eco_signed("eco_packaging")},
        {"label": "Processing (NOVA)", "value": eco_signed("eco_processing")},
        {"label": "Eco labels", "value": eco_signed("eco_labels")},
        {"label": "Origin", "value": eco_signed("eco_origins")},
    ]

    return {"radar": radar, "eco_breakdown": eco_breakdown}


def generate_explanation(row):
    hs = sf(row["health_score"]) or 0
    hg = row["health_grade"] or "N/A"
    es = sf(row["eco_score"]) or 0
    eg = row["eco_grade"] or "N/A"
    pkg = row["packaging"] or "unknown"

    try:
        nova_int = int(float(row["nova_group"])) if row["nova_group"] else 0
    except (ValueError, TypeError):
        nova_int = 0
    nova_text = {1: "minimally processed", 2: "processed with added ingredients", 3: "processed foods", 4: "ultra-processed"}.get(nova_int, "unknown processing level")

    return f"This product received a Health Score of {hs:.1f} (grade {hg}). Its Environmental Impact Score of {es:.1f} (grade {eg}) is driven by {nova_text} and {pkg} packaging."


def make_detail(row):
    p = make_product(row)
    return ProductDetailResponse(
        **p.model_dump(),
        energy_kcal_100g=sf(row["energy_kcal_100g"]),
        fat_100g=sf(row["fat_100g"]),
        saturated_fat_100g=sf(row["saturated_fat_100g"]),
        carbohydrates_100g=sf(row["carbohydrates_100g"]),
        sugars_100g=sf(row["sugars_100g"]),
        fiber_100g=sf(row["fiber_100g"]),
        proteins_100g=sf(row["proteins_100g"]),
        salt_100g=sf(row["salt_100g"]),
        sodium_100g=sf(row["sodium_100g"]),
        packaging=row["packaging"],
        origins=row["origins"],
        labels=row["labels"],
        stores=row["stores"],
        quantity=row["quantity"],
        ingredients_text=row["ingredients_text"],
        feature_attributions=get_feature_attributions(row),
        explanation=generate_explanation(row),
    )


def cosine_similarities(idx):
    vec = similarity_vectors[idx].reshape(1, -1)
    dots = (similarity_vectors @ vec.T).flatten()
    norm = similarity_norms[idx]
    return dots / (similarity_norms * norm + 1e-10)


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
    conn = get_db()
    conditions, params = [], []

    if q:
        conditions.append("(LOWER(product_name) LIKE ? OR LOWER(brands) LIKE ?)")
        params.extend([f"%{q.lower()}%", f"%{q.lower()}%"])
    if category:
        conditions.append("LOWER(categories) LIKE ?")
        params.append(f"%{category.lower()}%")
    if nutri_grade:
        conditions.append("nutriscore_grade = ?")
        params.append(nutri_grade)
    if eco_grade:
        conditions.append("eco_grade = ?")
        params.append(eco_grade)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    sort_map = {
        "combined": f"({health_weight} * COALESCE(health_score, 0) + {1 - health_weight} * COALESCE(eco_score, 0)) DESC",
        "health": "health_score DESC",
        "eco": "eco_score DESC",
        "name": "product_name ASC",
    }
    order = sort_map.get(sort, sort_map["combined"])

    total = conn.execute(f"SELECT COUNT(*) FROM products {where}", params).fetchone()[0]

    offset = (page - 1) * page_size
    rows = conn.execute(
        f"SELECT * FROM products {where} ORDER BY {order} LIMIT ? OFFSET ?",
        params + [page_size, offset],
    ).fetchall()

    results = [make_product(r, health_weight) for r in rows]
    conn.close()

    return {"total": total, "page": page, "page_size": page_size, "results": results}


@app.get("/api/products/{code}", response_model=ProductDetailResponse)
async def get_product(code: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM products WHERE code = ?", (code,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return make_detail(row)


@app.get("/api/products/{code}/alternatives", response_model=Dict[str, List[AlternativeResponse]])
async def get_alternatives(code: str):
    conn = get_db()
    cur = conn.execute("SELECT * FROM products WHERE code = ?", (code,)).fetchone()
    if not cur:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    row_idx = cur["row_idx"]
    sims = cosine_similarities(row_idx)

    current_health = cur["health_score"] or 0
    current_eco = cur["eco_score"] or 0
    cur_sat = float(cur["saturated_fat_100g"] or 0)
    cur_sugars = float(cur["sugars_100g"] or 0)
    cur_protein = float(cur["proteins_100g"] or 0)
    cur_nova = float(cur["nova_group"] or 0)
    cur_packaging = cur["packaging"] or "—"
    cur_labels = cur["labels"] or "—"

    health_rows = conn.execute(
        "SELECT row_idx FROM products WHERE health_score > ?", (current_health,)
    ).fetchall()
    health_candidates = sorted(health_rows, key=lambda r: sims[r["row_idx"]], reverse=True)[:3]
    health_top = [conn.execute("SELECT * FROM products WHERE row_idx = ?", (r["row_idx"],)).fetchone() for r in health_candidates]

    health_alts = []
    for row in health_top:
        diff = round(float(row["health_score"] - current_health), 1)
        health_alts.append(AlternativeResponse(
            product=make_product(row),
            explanation=f"This alternative has {diff:.1f} more health score with similar nutritional profile.",
            score_diff=diff,
            comparison={
                "sat_fat_diff": round(cur_sat - float(row["saturated_fat_100g"] or 0), 1),
                "sugars_diff": round(cur_sugars - float(row["sugars_100g"] or 0), 1),
                "protein_diff": round(float(row["proteins_100g"] or 0) - cur_protein, 1),
            },
        ))

    eco_rows = conn.execute(
        "SELECT row_idx FROM products WHERE eco_score > ?", (current_eco,)
    ).fetchall()
    eco_candidates = sorted(eco_rows, key=lambda r: sims[r["row_idx"]], reverse=True)[:3]
    eco_top = [conn.execute("SELECT * FROM products WHERE row_idx = ?", (r["row_idx"],)).fetchone() for r in eco_candidates]

    def eco_signed(row, col):
        v = float(row[col] or 0)
        return round((v - 0.5) * 80, 1)

    cur_eco_pkg = eco_signed(cur, "eco_packaging")
    cur_eco_proc = eco_signed(cur, "eco_processing")
    cur_eco_lbl = eco_signed(cur, "eco_labels")
    cur_eco_orig = eco_signed(cur, "eco_origins")

    eco_alts = []
    for row in eco_top:
        diff = round(float(row["eco_score"] - current_eco), 1)
        eco_alts.append(AlternativeResponse(
            product=make_product(row),
            explanation=f"This alternative has {diff:.1f} more eco score with similar nutritional profile.",
            score_diff=diff,
            comparison={
                "packaging": row["packaging"] or "—",
                "packaging_was": cur_packaging,
                "nova": float(row["nova_group"] or 0),
                "nova_was": cur_nova,
                "labels": row["labels"] or "—",
                "origins": row["origins"] or "—",
                "pkg_diff": round(eco_signed(row, "eco_packaging") - cur_eco_pkg, 1),
                "proc_diff": round(eco_signed(row, "eco_processing") - cur_eco_proc, 1),
                "lbl_diff": round(eco_signed(row, "eco_labels") - cur_eco_lbl, 1),
                "orig_diff": round(eco_signed(row, "eco_origins") - cur_eco_orig, 1),
            },
        ))

    conn.close()
    return {"better_for_you": health_alts, "better_for_planet": eco_alts}


@app.get("/api/compare", response_model=CompareResponse)
async def compare_products(codes: str = Query(...)):
    conn = get_db()
    code_list = [c.strip() for c in codes.split(",")]
    placeholders = ",".join("?" for _ in code_list)
    rows = conn.execute(f"SELECT * FROM products WHERE code IN ({placeholders})", code_list).fetchall()
    conn.close()
    return CompareResponse(products=[make_detail(r) for r in rows])


@app.get("/api/categories", response_model=List[CategoryResponse])
async def list_categories():
    conn = get_db()
    rows = conn.execute("SELECT name, count FROM categories ORDER BY count DESC").fetchall()
    conn.close()
    return [CategoryResponse(name=r["name"], count=r["count"]) for r in rows]


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    conn = get_db()
    stats = {r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM stats").fetchall()}
    conn.close()
    return StatsResponse(
        total_products=int(stats["total_products"]),
        avg_health_score=float(stats["avg_health_score"]),
        avg_eco_score=float(stats["avg_eco_score"]),
        avg_combined_score=float(stats["avg_combined_score"]),
        health_grade_distribution=json.loads(stats["health_grade_distribution"]),
        eco_grade_distribution=json.loads(stats["eco_grade_distribution"]),
        nutriscore_grade_distribution=json.loads(stats["nutriscore_grade_distribution"]),
    )
