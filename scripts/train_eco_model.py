import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
import json
from pathlib import Path

ML_OUTPUT = Path(__file__).resolve().parent.parent / "ml_output"
CSV_PATH = ML_OUTPUT / "products_scored.csv"

PKG_SCORES = {
    'glass': 0.9, 'vidrio': 0.9, 'cristal': 0.9,
    'jar': 0.85, 'bote': 0.85, 'tarro': 0.85,
    'bottle': 0.7, 'botella': 0.7,
    'cardboard': 0.8, 'paper': 0.8, 'cartón': 0.8, 'carton': 0.8, 'papel': 0.8,
    'box': 0.7, 'caja': 0.7,
    'brick': 0.7, 'tetra pak': 0.65, 'tetra brik': 0.65,
    'metal': 0.75, 'aluminium': 0.75, 'aluminum': 0.75, 'aluminio': 0.75,
    'can': 0.7, 'canned': 0.7, 'lata': 0.7, 'recyclable metals': 0.8,
    'plastic': 0.2, 'plástico': 0.2, 'plastico': 0.2,
    'bag': 0.15, 'bolsa': 0.15,
    'pp-polypropylene': 0.3, 'container': 0.3, 'envase': 0.3,
    'tray': 0.2, 'bandeja': 0.2,
    'pot': 0.3, 'frozen': 0.25, 'fresh': 0.5, 'refrigerated': 0.35,
}

ECO_LABELS = ['organic', 'eu organic', 'fair trade', 'fsc', 'rainforest', 'utz',
              'msc', 'asc', 'demeter', 'ab agriculture biologique', 'ecolabel']
DIET_LABELS = ['vegetarian', 'vegan', 'no palm oil']
QUALITY_LABELS = ['pdo', 'pgi', 'tsg', 'label rouge']

ORIGIN_SCORES = {
    'spain': 0.9, 'españa': 0.9, 'made in spain': 0.9,
    'france': 0.75, 'made in france': 0.75,
    'italy': 0.75, 'portugal': 0.75, 'germany': 0.7, 'european union': 0.6,
    'belgium': 0.7, 'netherlands': 0.7, 'united kingdom': 0.6,
    'european union and non european union': 0.4,
    'united states': 0.3, 'china': 0.2, 'india': 0.25, 'thailand': 0.25,
    'brazil': 0.3, 'argentina': 0.3, 'mexico': 0.3, 'peru': 0.3, 'chile': 0.3,
    'japan': 0.3, 'kenya': 0.25, 'colombia': 0.3,
}

FEATURES = [
    'f_pkg_score', 'f_pkg_has_plastic', 'f_pkg_has_glass', 'f_pkg_has_cardboard', 'f_pkg_has_metal', 'f_pkg_missing',
    'f_nova', 'f_nova_missing',
    'f_eco_labels_count', 'f_diet_labels_count', 'f_quality_labels_count',
    'f_has_organic', 'f_has_fairtrade', 'f_has_fsc', 'f_labels_missing', 'f_total_labels',
    'f_origin_score', 'f_origin_missing', 'f_origin_local', 'f_origin_eu',
]

GROUPS = {
    'packaging': ['f_pkg_score', 'f_pkg_has_plastic', 'f_pkg_has_glass', 'f_pkg_has_cardboard', 'f_pkg_has_metal', 'f_pkg_missing'],
    'processing': ['f_nova', 'f_nova_missing'],
    'labels': ['f_eco_labels_count', 'f_diet_labels_count', 'f_quality_labels_count', 'f_has_organic', 'f_has_fairtrade', 'f_has_fsc', 'f_labels_missing', 'f_total_labels'],
    'origins': ['f_origin_score', 'f_origin_missing', 'f_origin_local', 'f_origin_eu'],
}


def pkg_score(text):
    if pd.isna(text):
        return 0.0
    terms = []
    for t in str(text).split(','):
        t = t.strip().lower()
        if ':' in t:
            t = t.split(':', 1)[1]
        for part in t.replace('-', ' ').split():
            terms.append(part)
    scores = [PKG_SCORES[t] for t in terms if t in PKG_SCORES]
    return max(scores) if scores else 0.3


def count_labels(text, keywords):
    if pd.isna(text):
        return 0
    t = str(text).lower()
    return sum(1 for k in keywords if k in t)


def origin_score(text):
    if pd.isna(text) or str(text).strip().lower() in ['', 'unspecified', 'unknown']:
        return 0.0
    t = str(text).strip().lower()
    for key, score in ORIGIN_SCORES.items():
        if key in t:
            return score
    return 0.4


def engineer_features(df):
    df['f_pkg_score'] = df['packaging'].apply(pkg_score)
    df['f_pkg_has_plastic'] = df['packaging'].fillna('').str.lower().str.contains('plastic|plástico|plastico|bag|bolsa|pp-').astype(int)
    df['f_pkg_has_glass'] = df['packaging'].fillna('').str.lower().str.contains('glass|vidrio|cristal|jar|bote|tarro|bottle|botella').astype(int)
    df['f_pkg_has_cardboard'] = df['packaging'].fillna('').str.lower().str.contains('cardboard|cartón|carton|paper|papel|box|caja|brick|tetra').astype(int)
    df['f_pkg_has_metal'] = df['packaging'].fillna('').str.lower().str.contains('metal|aluminium|aluminum|aluminio|can|lata|tin').astype(int)
    df['f_pkg_missing'] = df['packaging'].isna().astype(int)
    df['f_nova'] = df['nova_group'].fillna(0)
    df['f_nova_missing'] = df['nova_group'].isna().astype(int)
    df['f_eco_labels_count'] = df['labels'].apply(lambda x: count_labels(x, ECO_LABELS))
    df['f_diet_labels_count'] = df['labels'].apply(lambda x: count_labels(x, DIET_LABELS))
    df['f_quality_labels_count'] = df['labels'].apply(lambda x: count_labels(x, QUALITY_LABELS))
    df['f_has_organic'] = df['labels'].fillna('').str.lower().str.contains('organic').astype(int)
    df['f_has_fairtrade'] = df['labels'].fillna('').str.lower().str.contains('fair trade|fairtrade').astype(int)
    df['f_has_fsc'] = df['labels'].fillna('').str.lower().str.contains('fsc').astype(int)
    df['f_labels_missing'] = df['labels'].isna().astype(int)
    df['f_total_labels'] = df['labels'].fillna('').apply(lambda x: len([t for t in x.split(',') if t.strip()]) if x else 0)
    df['f_origin_score'] = df['origins'].apply(origin_score)
    df['f_origin_missing'] = df['origins'].fillna('').str.strip().str.lower().isin(['', 'unspecified', 'unknown']).astype(int)
    df['f_origin_local'] = df['origins'].fillna('').str.lower().str.contains('spain|españa').astype(int)
    df['f_origin_eu'] = df['origins'].fillna('').str.lower().str.contains('europe|eu|france|italy|germany|portugal').astype(int)
    return df


def compute_dimension_scores(df):
    df['eco_packaging'] = df['f_pkg_score']
    df.loc[df['f_pkg_missing'] == 1, 'eco_packaging'] = 0.3

    nova_map = {0: 0.5, 1: 1.0, 2: 0.75, 3: 0.5, 4: 0.25}
    df['eco_processing'] = df['f_nova'].map(nova_map).fillna(0.5)
    df.loc[df['f_nova_missing'] == 1, 'eco_processing'] = 0.5

    df['eco_labels'] = (
        df['f_eco_labels_count'] * 0.15 +
        df['f_has_organic'] * 0.3 +
        df['f_has_fairtrade'] * 0.2 +
        df['f_has_fsc'] * 0.1 +
        df['f_diet_labels_count'] * 0.05 +
        df['f_quality_labels_count'] * 0.1
    ).clip(0, 1)
    df.loc[df['f_labels_missing'] == 1, 'eco_labels'] = 0.3

    df['eco_origins'] = df['f_origin_score']
    df.loc[df['f_origin_missing'] == 1, 'eco_origins'] = 0.2

    return df


def main():
    print("Loading data...")
    df = pd.read_csv(CSV_PATH, dtype={"code": str}, low_memory=False)
    print(f"Total products: {len(df)}")

    if 'off_eco_score' not in df.columns:
        df['off_eco_score'] = df['eco_score'].copy()
        print("Saved original OFF eco_score as off_eco_score")
    else:
        print("Using preserved off_eco_score as training target")

    print("Engineering features...")
    df = engineer_features(df)

    X = df[FEATURES].values
    y = df['off_eco_score'].values

    print(f"\nFeatures: {len(FEATURES)}")
    print(f"Training samples: {len(X)}")

    gbr = GradientBoostingRegressor(
        n_estimators=300, max_depth=5, learning_rate=0.1,
        subsample=0.8, random_state=42,
    )

    print("\nRunning 5-fold cross-validation...")
    cv_scores = cross_val_score(gbr, X, y, cv=5, scoring='r2')
    print(f"CV R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    print("\nTraining final model...")
    gbr.fit(X, y)
    pred = gbr.predict(X)
    train_r2 = 1 - np.sum((y - pred)**2) / np.sum((y - np.mean(y))**2)
    print(f"Train R²: {train_r2:.4f}")

    print("\nFeature importances:")
    for f, imp in sorted(zip(FEATURES, gbr.feature_importances_), key=lambda x: -x[1]):
        if imp > 0.005:
            print(f"  {f}: {imp:.4f}")

    print("\nGroup importances (eco dimensions):")
    group_imp = {}
    for group, feats in GROUPS.items():
        idxs = [FEATURES.index(f) for f in feats]
        total = sum(gbr.feature_importances_[i] for i in idxs)
        group_imp[group] = round(total, 4)
        print(f"  {group}: {total:.4f}")

    # ── COMPUTE DIMENSION SCORES (direct feature-based, 0-1 scale) ──
    print("\nComputing per-product eco dimension scores...")
    df = compute_dimension_scores(df)

    # ── COMPUTE ECO SCORE FROM WEIGHTED DIMENSIONS ──
    total_w = sum(group_imp.values())
    norm_w = {k: v / total_w for k, v in group_imp.items()}
    print("\nNormalized dimension weights:")
    for k, v in norm_w.items():
        print(f"  {k}: {v:.4f}")

    df['eco_score'] = (
        norm_w['packaging'] * df['eco_packaging'] +
        norm_w['processing'] * df['eco_processing'] +
        norm_w['labels'] * df['eco_labels'] +
        norm_w['origins'] * df['eco_origins']
    ) * 100
    df['eco_score'] = df['eco_score'].clip(0, 100).round(2)
    df['eco_grade'] = pd.cut(df['eco_score'], bins=[-1, 20, 40, 60, 80, 101], labels=['e', 'd', 'c', 'b', 'a'])

    print("\nEco dimension stats:")
    for dim in ['eco_packaging', 'eco_processing', 'eco_labels', 'eco_origins']:
        print(f"  {dim}: mean={df[dim].mean():.3f}, std={df[dim].std():.3f}")
    print(f"\nEco score: mean={df['eco_score'].mean():.1f}, std={df['eco_score'].std():.1f}")
    print(f"Eco grade distribution:\n{df['eco_grade'].value_counts().sort_index()}")

    # ── SAVE ──
    out_cols = [c for c in df.columns if not c.startswith('f_')]
    df[out_cols].to_csv(CSV_PATH, index=False)
    print(f"\nSaved updated products_scored.csv")

    meta = {
        "eco_model": "GradientBoostingRegressor",
        "eco_model_params": {"n_estimators": 300, "max_depth": 5, "learning_rate": 0.1, "subsample": 0.8},
        "eco_cv_r2": round(cv_scores.mean(), 4),
        "eco_cv_r2_std": round(cv_scores.std(), 4),
        "eco_train_r2": round(train_r2, 4),
        "eco_features": FEATURES,
        "eco_feature_groups": GROUPS,
        "eco_group_importances": group_imp,
        "eco_dimension_weights": {k: round(v, 4) for k, v in norm_w.items()},
        "eco_feature_importances": {f: round(float(imp), 4) for f, imp in zip(FEATURES, gbr.feature_importances_) if imp > 0.001},
        "eco_dimension_means": {
            "eco_packaging": round(float(df['eco_packaging'].mean()), 4),
            "eco_processing": round(float(df['eco_processing'].mean()), 4),
            "eco_labels": round(float(df['eco_labels'].mean()), 4),
            "eco_origins": round(float(df['eco_origins'].mean()), 4),
        },
    }

    meta_path = ML_OUTPUT / "eco_model_metadata.json"
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Saved model metadata to {meta_path}")


if __name__ == "__main__":
    main()
