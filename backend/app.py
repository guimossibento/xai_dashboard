from contextlib import contextmanager
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
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).resolve().parent / "products.db"
SIM_PATH = Path(__file__).resolve().parent / "sim_vectors.npy"
ML_OUTPUT_PATH = Path(__file__).resolve().parent.parent / "ml_output"

ECO_MIDPOINT = 0.5
ECO_SCALE = 80

similarity_vectors = None
similarity_norms = None
model_metadata = {}


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
    price_tier: Optional[int] = None
    estimated_price: Optional[float] = None
    animal_welfare_score: Optional[int] = None
    animal_welfare_labels: Optional[str] = None
    taste_tags: Optional[str] = None
    data_notes: Optional[str] = None


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


@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.on_event("startup")
async def startup():
    global similarity_vectors, similarity_norms, model_metadata
    print(f"DB exists: {DB_PATH.exists()}")
    print(f"SIM exists: {SIM_PATH.exists()}")
    if not SIM_PATH.exists():
        print("WARNING: sim_vectors.npy not found — similarity search disabled")
        return
    similarity_vectors = np.load(str(SIM_PATH)).astype(np.float32)
    similarity_norms = np.linalg.norm(similarity_vectors, axis=1)
    print(f"Loaded {similarity_vectors.shape[0]} similarity vectors")
    for name, key in [("eco_model_metadata.json", "eco"), ("health_model_metadata.json", "health")]:
        path = ML_OUTPUT_PATH / name
        if path.exists():
            with open(path) as f:
                model_metadata[key] = json.load(f)
            print(f"Loaded {key} model metadata")


def sf(v):
    if v is None:
        return None
    try:
        f = float(v)
        return None if math.isnan(f) else round(f, 2)
    except (ValueError, TypeError):
        return None


def eco_signed(row, col):
    v = float(row[col] or 0)
    return round((v - ECO_MIDPOINT) * ECO_SCALE, 1)


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
        price_tier=int(row["price_tier"]) if row["price_tier"] else None,
        estimated_price=sf(row["estimated_price"]),
        animal_welfare_score=int(row["animal_welfare_score"]) if row["animal_welfare_score"] is not None else None,
        animal_welfare_labels=row["animal_welfare_labels"] or None,
        taste_tags=row["taste_tags"] or None,
        data_notes=row["data_notes"] if row["data_notes"] else None,
    )


def get_feature_attributions(row):
    radar = {}
    for col, label in [("fat_100g", "fat"), ("saturated_fat_100g", "saturated_fat"), ("sugars_100g", "sugars"), ("salt_100g", "salt")]:
        radar[label] = round((1 - (row[f"pct_{col}"] or 0.5)) * 100, 1)
    for col, label in [("fiber_100g", "fiber"), ("proteins_100g", "proteins")]:
        radar[label] = round((row[f"pct_{col}"] or 0.5) * 100, 1)

    eco_breakdown = [
        {"label": "Packaging", "value": eco_signed(row, "eco_packaging")},
        {"label": "Processing (NOVA)", "value": eco_signed(row, "eco_processing")},
        {"label": "Eco labels", "value": eco_signed(row, "eco_labels")},
        {"label": "Origin", "value": eco_signed(row, "eco_origins")},
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


SCIENTIFIC_REFERENCES = {
    "nutri_score": "Nutri-Score is a front-of-pack nutrition label developed by Santé publique France. It grades products A (best) to E (worst) based on energy, sugars, saturated fat, sodium, fiber, protein, and fruit/vegetable content (Julia & Hercberg, 2017).",
    "nova": "NOVA classifies foods by degree of processing: Group 1 (unprocessed), Group 2 (processed culinary ingredients), Group 3 (processed foods), Group 4 (ultra-processed). Monteiro et al., Food Science and Nutrition, 2019.",
    "eco_score": "The Eco-Score evaluates environmental impact using lifecycle assessment data including carbon footprint, water use, and biodiversity impact. Methodology by ADEME and INRAE (2021).",
    "feature_importance": "Feature importance is computed using a Gradient Boosted Regression model (Friedman, 2001). The bars show how much each factor contributes to the model's predictions. CV R² indicates cross-validated predictive accuracy.",
    "price_tier": "Price tier is estimated heuristically based on brand positioning and label certifications. Premium certifications (organic, PDO, PGI) correlate with higher retail prices (Aertsens et al., 2009).",
    "animal_welfare": "Animal welfare indicators are derived from product certifications. Free-range and organic labels imply minimum welfare standards as defined by EU Regulation 834/2007.",
}


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
    objectives: Optional[str] = None,
    packaging: Optional[str] = None,
    origin: Optional[str] = None,
    organic: bool = False,
    max_nova: Optional[int] = None,
    sort: str = "combined",
    health_weight: float = 0.5,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    with get_db() as conn:
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
        if packaging:
            conditions.append("LOWER(packaging) LIKE ?")
            params.append(f"%{packaging.lower()}%")
        if origin:
            conditions.append("LOWER(origins) LIKE ?")
            params.append(f"%{origin.lower()}%")
        if organic:
            conditions.append("(LOWER(labels) LIKE '%organic%' OR LOWER(labels) LIKE '%bio%' OR LOWER(labels) LIKE '%ecológico%')")
        if max_nova is not None:
            conditions.append("nova_group <= ?")
            params.append(max_nova)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        sort_map = {
            "combined": f"({health_weight} * COALESCE(health_score, 0) + {1 - health_weight} * COALESCE(eco_score, 0)) DESC",
            "health": "health_score DESC",
            "eco": "eco_score DESC",
            "name": "product_name ASC",
        }
        obj_map = {
            "protein": "COALESCE(pct_proteins_100g, 0.5)",
            "fiber": "COALESCE(pct_fiber_100g, 0.5)",
            "low_sugar": "(1 - COALESCE(pct_sugars_100g, 0.5))",
            "low_sat_fat": "(1 - COALESCE(pct_saturated_fat_100g, 0.5))",
            "low_salt": "(1 - COALESCE(pct_salt_100g, 0.5))",
            "low_fat": "(1 - COALESCE(pct_fat_100g, 0.5))",
        }
        obj_terms = [obj_map[o] for o in (objectives.split(",") if objectives else []) if o in obj_map]
        order = f"({' + '.join(obj_terms)}) DESC" if obj_terms else sort_map.get(sort, sort_map["combined"])

        total = conn.execute(f"SELECT COUNT(*) FROM products {where}", params).fetchone()[0]

        offset = (page - 1) * page_size
        rows = conn.execute(
            f"SELECT * FROM products {where} ORDER BY {order} LIMIT ? OFFSET ?",
            params + [page_size, offset],
        ).fetchall()

        results = [make_product(r, health_weight) for r in rows]

    return {"total": total, "page": page, "page_size": page_size, "results": results}


@app.get("/api/products/{code}", response_model=ProductDetailResponse)
async def get_product(code: str):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM products WHERE code = ?", (code,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return make_detail(row)


@app.get("/api/products/{code}/alternatives", response_model=Dict[str, List[AlternativeResponse]])
async def get_alternatives(code: str):
    if similarity_vectors is None:
        raise HTTPException(status_code=503, detail="Similarity search not available")

    with get_db() as conn:
        cur = conn.execute("SELECT * FROM products WHERE code = ?", (code,)).fetchone()
        if not cur:
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

        health_rows = conn.execute(
            "SELECT row_idx FROM products WHERE health_score > ?", (current_health,)
        ).fetchall()
        health_candidates = sorted(health_rows, key=lambda r: sims[r["row_idx"]], reverse=True)[:3]
        health_idxs = [r["row_idx"] for r in health_candidates]
        if health_idxs:
            ph = ",".join("?" for _ in health_idxs)
            health_top = conn.execute(f"SELECT * FROM products WHERE row_idx IN ({ph})", health_idxs).fetchall()
        else:
            health_top = []

        cur_price_tier = int(cur["price_tier"]) if cur["price_tier"] else 2

        health_alts = []
        for row in health_top:
            diff = round(float(row["health_score"] - current_health), 1)
            alt_price = int(row["price_tier"]) if row["price_tier"] else 2
            health_alts.append(AlternativeResponse(
                product=make_product(row),
                explanation=f"This alternative has {diff:.1f} more health score with similar nutritional profile.",
                score_diff=diff,
                comparison={
                    "sat_fat_diff": round(cur_sat - float(row["saturated_fat_100g"] or 0), 1),
                    "sugars_diff": round(cur_sugars - float(row["sugars_100g"] or 0), 1),
                    "protein_diff": round(float(row["proteins_100g"] or 0) - cur_protein, 1),
                    "price_tier": alt_price,
                    "price_tier_was": cur_price_tier,
                },
            ))

        eco_rows = conn.execute(
            "SELECT row_idx FROM products WHERE eco_score > ?", (current_eco,)
        ).fetchall()
        eco_candidates = sorted(eco_rows, key=lambda r: sims[r["row_idx"]], reverse=True)[:3]
        eco_idxs = [r["row_idx"] for r in eco_candidates]
        if eco_idxs:
            pe = ",".join("?" for _ in eco_idxs)
            eco_top = conn.execute(f"SELECT * FROM products WHERE row_idx IN ({pe})", eco_idxs).fetchall()
        else:
            eco_top = []

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

        cur_price = float(cur["estimated_price"] or 0)
        cur_tier = int(cur["price_tier"] or 2)
        cheaper_alts = []
        if cur_price > 0:
            cheaper_rows = conn.execute(
                "SELECT row_idx FROM products WHERE estimated_price < ? AND health_score >= ? LIMIT 500",
                (cur_price, current_health * 0.9),
            ).fetchall()
            cheaper_candidates = sorted(cheaper_rows, key=lambda r: sims[r["row_idx"]], reverse=True)[:3]
            cheaper_idxs = [r["row_idx"] for r in cheaper_candidates]
            if cheaper_idxs:
                pc = ",".join("?" for _ in cheaper_idxs)
                cheaper_top = conn.execute(f"SELECT * FROM products WHERE row_idx IN ({pc})", cheaper_idxs).fetchall()
            else:
                cheaper_top = []
            for row in cheaper_top:
                alt_price = float(row["estimated_price"] or 0)
                saving = round(cur_price - alt_price, 2)
                cheaper_alts.append(AlternativeResponse(
                    product=make_product(row),
                    explanation=f"Save ~€{saving:.2f} per unit with similar nutritional quality.",
                    score_diff=round(float(row["health_score"] or 0) - current_health, 1),
                    comparison={
                        "estimated_price": alt_price,
                        "estimated_price_was": cur_price,
                        "saving": saving,
                        "health_diff": round(float(row["health_score"] or 0) - current_health, 1),
                        "eco_diff": round(float(row["eco_score"] or 0) - current_eco, 1),
                    },
                ))

    return {"better_for_you": health_alts, "better_for_planet": eco_alts, "cheaper": cheaper_alts}


@app.get("/api/compare", response_model=CompareResponse)
async def compare_products(codes: str = Query(...)):
    code_list = [c.strip() for c in codes.split(",")]
    placeholders = ",".join("?" for _ in code_list)
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM products WHERE code IN ({placeholders})", code_list).fetchall()
    return CompareResponse(products=[make_detail(r) for r in rows])


@app.get("/api/categories", response_model=List[CategoryResponse])
async def list_categories():
    with get_db() as conn:
        rows = conn.execute("SELECT name, count FROM categories ORDER BY count DESC").fetchall()
    return [CategoryResponse(name=r["name"], count=r["count"]) for r in rows]


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    with get_db() as conn:
        stats = {r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM stats").fetchall()}
    return StatsResponse(
        total_products=int(stats["total_products"]),
        avg_health_score=float(stats["avg_health_score"]),
        avg_eco_score=float(stats["avg_eco_score"]),
        avg_combined_score=float(stats["avg_combined_score"]),
        health_grade_distribution=json.loads(stats["health_grade_distribution"]),
        eco_grade_distribution=json.loads(stats["eco_grade_distribution"]),
        nutriscore_grade_distribution=json.loads(stats["nutriscore_grade_distribution"]),
    )


@app.get("/api/model-info")
async def get_model_info():
    if not model_metadata:
        raise HTTPException(status_code=404, detail="Model metadata not available")
    return model_metadata


@app.get("/api/references")
async def get_references():
    return SCIENTIFIC_REFERENCES
