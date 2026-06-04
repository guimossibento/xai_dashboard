import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
import json
from pathlib import Path

ML_OUTPUT = Path(__file__).resolve().parent.parent / "ml_output"
CSV_PATH = ML_OUTPUT / "products_scored.csv"

FEATURES = [
    'energy_kcal_100g', 'fat_100g', 'saturated_fat_100g',
    'sugars_100g', 'salt_100g', 'fiber_100g', 'proteins_100g',
]

GROUPS = {
    'negative_nutrients': ['energy_kcal_100g', 'fat_100g', 'saturated_fat_100g', 'sugars_100g', 'salt_100g'],
    'positive_nutrients': ['fiber_100g', 'proteins_100g'],
}

FEAT_LABELS = {
    'energy_kcal_100g': 'Energy (kcal)',
    'fat_100g': 'Fat',
    'saturated_fat_100g': 'Saturated fat',
    'sugars_100g': 'Sugars',
    'salt_100g': 'Salt',
    'fiber_100g': 'Fiber',
    'proteins_100g': 'Proteins',
}


def main():
    print("Loading data...")
    df = pd.read_csv(CSV_PATH, dtype={"code": str}, low_memory=False)
    print(f"Total products: {len(df)}")

    mask = df['health_score'].notna() & (df['health_score'] > 0)
    for col in FEATURES:
        mask &= df[col].notna()
    df = df[mask].reset_index(drop=True)
    print(f"Products with complete health data: {len(df)}")

    X = df[FEATURES].values
    y = df['health_score'].values

    print(f"\nFeatures: {len(FEATURES)}")
    print(f"Training samples: {len(X)}")

    gbr = GradientBoostingRegressor(
        n_estimators=200, max_depth=4, learning_rate=0.1,
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
        print(f"  {FEAT_LABELS[f]}: {imp:.4f}")

    print("\nGroup importances:")
    group_imp = {}
    for group, feats in GROUPS.items():
        idxs = [FEATURES.index(f) for f in feats]
        total = sum(gbr.feature_importances_[i] for i in idxs)
        group_imp[group] = round(total, 4)
        print(f"  {group}: {total:.4f}")

    meta = {
        "health_model": "GradientBoostingRegressor",
        "health_model_params": {"n_estimators": 200, "max_depth": 4, "learning_rate": 0.1, "subsample": 0.8},
        "health_cv_r2": round(cv_scores.mean(), 4),
        "health_cv_r2_std": round(cv_scores.std(), 4),
        "health_train_r2": round(train_r2, 4),
        "health_features": FEATURES,
        "health_feature_labels": FEAT_LABELS,
        "health_feature_groups": GROUPS,
        "health_group_importances": group_imp,
        "health_feature_importances": {f: round(float(imp), 4) for f, imp in zip(FEATURES, gbr.feature_importances_)},
    }

    meta_path = ML_OUTPUT / "health_model_metadata.json"
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"\nSaved health model metadata to {meta_path}")


if __name__ == "__main__":
    main()
