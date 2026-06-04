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

    df["row_idx"] = range(len(df))
    for col in PCT_COLS:
        df[f"pct_{col}"] = df[col].rank(pct=True).fillna(0.5).round(4)

    PREMIUM_LABELS = ["organic", "bio", "demeter", "fair trade", "label rouge", "pdo", "pgi"]
    BUDGET_BRANDS = ["carrefour", "mercadona", "lidl", "aldi", "dia", "hacendado", "eroski", "condis"]
    WELFARE_TERMS = ["free range", "free-range", "cage free", "cage-free", "pasture", "grass fed", "grass-fed", "animal welfare", "bienestar animal", "free roaming"]
    ANIMAL_CATEGORIES = ["meat", "carne", "pollo", "chicken", "beef", "pork", "cerdo", "lamb",
        "fish", "pescado", "seafood", "marisco", "atún", "tuna", "salmon", "sardine",
        "dairy", "lácteo", "milk", "leche", "cheese", "queso", "yogurt", "butter", "mantequilla",
        "egg", "huevo", "huevos"]
    PLANT_CATEGORIES = ["plant-based", "vegan", "vegano", "vegetable", "verdura", "fruit", "fruta",
        "legume", "lentil", "lenteja", "bean", "alubia", "garbanzo", "tofu", "soy", "soja",
        "cereal", "bread", "pan ", "pasta", "rice", "arroz", "nut", "seed"]

    TASTE_MAP = {
        "Earthy": ["lentil", "lenteja", "chickpea", "garbanzo", "bean", "alubia", "faba",
            "mushroom", "seta", "truffle", "trufa", "beetroot", "remolacha", "potato", "patata",
            "pumpkin", "calabaza", "turnip", "nabo", "parsnip", "whole grain", "integral",
            "quinoa", "buckwheat", "millet", "mijo", "spelt", "espelta"],
        "Nutty": ["almond", "almendra", "walnut", "nuez", "hazelnut", "avellana", "peanut",
            "cacahuete", "pistachio", "pistacho", "cashew", "anacardo", "nut", "fruto seco",
            "sesame", "sésamo", "tahini", "sunflower", "girasol", "seed", "semilla",
            "pine nut", "piñón", "chestnut", "castaña", "macadamia", "pecan"],
        "Roasted": ["coffee", "café", "espresso", "cacao", "cocoa", "chocolate",
            "toasted", "tostado", "roast", "asado", "grilled", "char", "dark chocolate",
            "brownie", "malt", "malta", "caramel", "caramelo", "molasses"],
        "Smoky": ["smoked", "ahumado", "smoke", "humo", "bacon", "chorizo", "paprika",
            "pimentón", "chipotle", "bbq", "barbecue", "barbacoa", "fuet", "sobrasada",
            "cecina", "charcoal"],
        "Herbal": ["herb", "hierba", "basil", "albahaca", "oregano", "orégano", "thyme",
            "tomillo", "rosemary", "romero", "mint", "menta", "parsley", "perejil",
            "cilantro", "dill", "eneldo", "sage", "salvia", "bay leaf", "laurel",
            "chamomile", "manzanilla", "fennel", "hinojo", "tea", "té", "infusion"],
        "Tangy": ["yogurt", "yogur", "kefir", "vinegar", "vinagre", "pickle", "encurtido",
            "fermented", "fermentado", "sauerkraut", "chucrut", "kombucha", "sourdough",
            "masa madre", "citrus", "cítrico", "tamarind", "caper", "alcaparra",
            "gherkin", "pepinillo", "kimchi"],
        "Citrusy": ["lemon", "limón", "orange", "naranja", "lime", "lima", "grapefruit",
            "pomelo", "mandarin", "mandarina", "tangerine", "clementine", "bergamot",
            "yuzu", "citron", "cidra"],
        "Sweet": ["sugar", "azúcar", "honey", "miel", "candy", "caramelo", "cookie",
            "galleta", "cake", "tarta", "jam", "mermelada", "syrup", "jarabe",
            "dulce", "confiture", "pastry", "donut", "churro", "mazapán", "turrón",
            "wafer", "croissant", "biscuit"],
        "Rich": ["cream", "crema", "nata", "butter", "mantequilla", "mascarpone",
            "béchamel", "mousse", "custard", "natilla", "flan", "cuajada",
            "foie", "paté", "truffle", "egg yolk", "yema", "avocado", "aguacate",
            "coconut", "coco"],
        "Fresh": ["salad", "ensalada", "lettuce", "lechuga", "cucumber", "pepino",
            "radish", "rábano", "celery", "apio", "watercress", "berro", "spinach",
            "espinaca", "arugula", "rúcula", "gazpacho", "raw", "crudo", "fresh", "fresco"],
        "Fruity": ["apple", "manzana", "pear", "pera", "peach", "melocotón", "berry",
            "baya", "strawberry", "fresa", "raspberry", "frambuesa", "blueberry", "arándano",
            "cherry", "cereza", "grape", "uva", "mango", "pineapple", "piña",
            "banana", "plátano", "melon", "melón", "watermelon", "sandía", "kiwi",
            "fig", "higo", "apricot", "albaricoque", "plum", "ciruela", "passion",
            "papaya", "pomegranate", "granada", "guava", "fruit", "fruta", "juice", "zumo"],
        "Spicy": ["chili", "chile", "curry", "pepper", "pimienta", "hot", "picante",
            "jalapeño", "cayenne", "guindilla", "harissa", "wasabi", "sriracha",
            "tabasco", "ginger", "jengibre", "horseradish", "rábano picante",
            "mustard", "mostaza", "cinnamon", "canela", "clove", "clavo",
            "nutmeg", "nuez moscada", "cardamom", "cardamomo", "turmeric", "cúrcuma"],
        "Briny": ["anchovy", "anchoa", "sardine", "sardina", "tuna", "atún", "salmon",
            "salmón", "seafood", "marisco", "shrimp", "gamba", "mussel", "mejillón",
            "clam", "almeja", "squid", "calamar", "octopus", "pulpo", "fish", "pescado",
            "seaweed", "alga", "nori", "crab", "cangrejo", "oyster", "ostra",
            "cod", "bacalao", "merluza", "hake", "sea salt", "sal marina"],
        "Savory": ["ham", "jamón", "cured", "curado", "salami", "sausage", "salchicha",
            "embutido", "beef", "ternera", "pork", "cerdo", "chicken", "pollo",
            "meat", "carne", "lamb", "cordero", "turkey", "pavo", "duck", "pato",
            "broth", "caldo", "soy sauce", "salsa de soja", "miso", "umami",
            "parmesan", "parmesano", "aged cheese", "queso curado", "olive", "aceituna",
            "tomato", "tomate", "onion", "cebolla", "garlic", "ajo"],
        "Mild": ["rice", "arroz", "pasta", "noodle", "bread", "pan ", "flour", "harina",
            "oat", "avena", "corn", "maíz", "wheat", "trigo", "cereal",
            "cracker", "milk", "leche", "tofu", "soy milk", "potato", "couscous"],
        "Creamy": ["cheese", "queso", "ricotta", "mozzarella", "brie", "camembert",
            "gouda", "cheddar", "emmental", "gruyère", "manchego", "cream cheese",
            "queso crema", "smoothie", "batido", "ice cream", "helado",
            "pudding", "pudin", "milkshake", "horchata"],
        "Bitter": ["endive", "escarola", "chicory", "achicoria", "beer", "cerveza",
            "hop", "lúpulo", "mate", "tonic", "tónica", "dark chocolate",
            "arugula", "rúcula", "radicchio", "broccoli", "brócoli", "kale",
            "brussels sprout", "col de bruselas", "artichoke", "alcachofa"],
    }

    def compute_price_tier(row):
        labels_str = str(row.get("labels") or "").lower()
        brands_str = str(row.get("brands") or "").lower()
        has_premium = any(t in labels_str for t in PREMIUM_LABELS) or "bio" in brands_str
        is_store = any(b in brands_str for b in BUDGET_BRANDS)
        if is_store:
            return 1
        if has_premium:
            return 3
        return 2

    def compute_animal_welfare(row):
        labels_str = str(row.get("labels") or "").lower()
        cats_str = str(row.get("categories") or "").lower()
        name_str = str(row.get("product_name") or "").lower()
        text = f"{labels_str} {cats_str} {name_str}"
        matched = [t for t in WELFARE_TERMS if t in labels_str]
        has_organic = "organic" in labels_str or "bio" in labels_str
        is_plant = any(t in cats_str for t in PLANT_CATEGORIES)
        is_animal = any(t in text for t in ANIMAL_CATEGORIES)
        notes = []
        if matched:
            score = 3 if len(matched) >= 2 else 2
        elif has_organic and is_animal:
            score = 1
            matched = ["organic"]
        elif is_plant and not is_animal:
            score = -1
            matched = ["plant-based"]
            notes.append("inferred")
        elif is_animal:
            score = 0
            matched = ["conventional"]
            notes.append("inferred")
        else:
            score = -1
            matched = ["not applicable"]
            notes.append("inferred")
        return score, ",".join(matched), ",".join(notes)

    def compute_taste_tags(row):
        cats_str = str(row.get("categories") or "").lower()
        name_str = str(row.get("product_name") or "").lower()
        ingr_str = str(row.get("ingredients_text") or "").lower()
        text = f"{cats_str} {name_str} {ingr_str}"
        hits = {}
        for tag, keywords in TASTE_MAP.items():
            count = sum(1 for k in keywords if k in text)
            if count:
                hits[tag] = count
        sorted_tags = sorted(hits.keys(), key=lambda t: hits[t], reverse=True)[:3]
        if sorted_tags:
            return ",".join(sorted_tags)
        tags = []
        sugars = row.get("sugars_100g") or 0
        fat = row.get("fat_100g") or 0
        proteins = row.get("proteins_100g") or 0
        salt = row.get("salt_100g") or 0
        fiber = row.get("fiber_100g") or 0
        if sugars > 20:
            tags.append("Sweet")
        elif sugars > 8:
            tags.append("Mild")
        if salt > 2 or proteins > 15:
            tags.append("Savory")
        if fat > 20 and sugars < 5:
            tags.append("Rich")
        if fiber > 6:
            tags.append("Earthy")
        if proteins > 10 and fat < 5:
            tags.append("Mild")
        if not tags:
            tags.append("Mild")
        return ",".join(list(dict.fromkeys(tags))[:3])

    df["price_tier"] = df.apply(compute_price_tier, axis=1)
    welfare_results = df.apply(compute_animal_welfare, axis=1, result_type="expand")
    df["animal_welfare_score"] = welfare_results[0]
    df["animal_welfare_labels"] = welfare_results[1]
    df["data_notes"] = welfare_results[2]
    df["taste_tags"] = df.apply(compute_taste_tags, axis=1)

    CATEGORY_BASE_PRICES = {
        "plant-based foods": 1.60, "snacks": 2.20, "dairies": 1.40, "beverages": 1.50,
        "meats": 4.50, "seafood": 5.00, "meals": 3.20, "condiments": 2.00,
        "desserts": 2.50, "breakfasts": 2.80, "frozen": 2.60, "cereals": 1.80,
        "fruits": 2.00, "vegetables": 1.80, "oils": 3.50, "sauces": 1.90,
        "cheese": 3.50, "milk": 1.10, "yogurt": 1.30, "bread": 1.50,
        "pasta": 1.20, "rice": 1.40, "coffee": 3.80, "tea": 2.50,
        "chocolate": 2.80, "biscuits": 1.90, "candy": 1.80, "juice": 1.60,
        "canned": 1.50, "nuts": 4.00, "legumes": 1.40, "eggs": 2.20,
    }
    TIER_MULTIPLIERS = {1: 0.75, 2: 1.0, 3: 1.45}

    def estimate_price(row):
        cats = str(row.get("categories") or "").lower()
        base = 2.00
        for keyword, price in CATEGORY_BASE_PRICES.items():
            if keyword in cats:
                base = price
                break
        multiplier = TIER_MULTIPLIERS.get(row["price_tier"], 1.0)
        return round(base * multiplier, 2)

    df["estimated_price"] = df.apply(estimate_price, axis=1)

    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    df.to_sql("products", conn, index=False, if_exists="replace")

    conn.execute("CREATE INDEX idx_code ON products(code)")
    conn.execute("CREATE INDEX idx_health ON products(health_score)")
    conn.execute("CREATE INDEX idx_eco ON products(eco_score)")
    conn.execute("CREATE INDEX idx_price ON products(estimated_price)")

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
