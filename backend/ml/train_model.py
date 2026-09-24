"""
Training pipeline for the groundwater depletion forecasting model.

Steps:
    1. Load CGWB dataset
    2. Clean missing values / duplicates
    3. Feature engineering (lags, rolling means, rotation indicators)
    4. Time-aware train/test split (chronological, no shuffling)
    5. Train candidate models (Linear Regression, Random Forest, Gradient Boosting,
       HistGradientBoosting)
    6. Evaluate with MAE, RMSE, R²
    7. Select best model by RMSE
    8. Save Pipeline + metadata to models/

Usage:
    cd backend
    python ml/train_model.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error

# Ensure backend/ is on sys.path for direct script execution
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.feature_engineering import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    clean_data,
    engineer_features,
)
from ml.preprocessing import build_preprocessing_pipeline

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cgwb_data.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


def load_raw_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        print("Place the CGWB CSV at backend/data/cgwb_data.csv")
        sys.exit(1)
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} rows from {DATA_PATH}")
    return df


def time_aware_split(df: pd.DataFrame, test_fraction: float = 0.2):
    """Split chronologically — last X% of years become the test set."""
    max_year = df["year"].max()
    split_year = int(max_year - (max_year - df["year"].min()) * test_fraction)
    train = df[df["year"] <= split_year].copy()
    test = df[df["year"] > split_year].copy()
    print(f"Time-aware split: train years {train['year'].min()}-{train['year'].max()} "
          f"({len(train)} rows), test years {test['year'].min()}-{test['year'].max()} "
          f"({len(test)} rows)")
    return train, test


def evaluate(y_true, y_pred) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)}


def train_and_compare(X_train, y_train, X_test, y_test) -> dict:
    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(
            n_estimators=200, max_depth=12, random_state=42, n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42
        ),
        "Hist Gradient Boosting": HistGradientBoostingRegressor(
            max_iter=300, max_depth=8, learning_rate=0.1, random_state=42
        ),
    }

    results = {}
    for name, estimator in candidates.items():
        print(f"\n--- Training {name} ---")
        pipeline = build_preprocessing_pipeline(estimator)
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        metrics = evaluate(y_test, y_pred)
        metrics["pipeline"] = pipeline
        results[name] = metrics
        print(f"  MAE: {metrics['mae']:.4f}  RMSE: {metrics['rmse']:.4f}  R²: {metrics['r2']:.4f}")

    return results


def main():
    print("=" * 60)
    print("Groundwater Depletion Forecasting — Model Training")
    print("=" * 60)

    os.makedirs(MODEL_DIR, exist_ok=True)

    raw = load_raw_data()
    cleaned = clean_data(raw)
    featured = engineer_features(cleaned)

    # Chronological split: test set is strictly the most recent 20% of years
    train_df, test_df = time_aware_split(featured, test_fraction=0.2)

    # Ensure target observations are present for evaluation
    train_valid = train_df.dropna(subset=[TARGET_COLUMN]).copy()
    test_valid = test_df.dropna(subset=[TARGET_COLUMN]).copy()

    X_train = train_valid[FEATURE_COLUMNS]
    y_train = train_valid[TARGET_COLUMN]
    X_test = test_valid[FEATURE_COLUMNS]
    y_test = test_valid[TARGET_COLUMN]

    results = train_and_compare(X_train, y_train, X_test, y_test)

    # Select best by RMSE (lower is better)
    best_name = min(results, key=lambda k: results[k]["rmse"])
    best = results[best_name]
    print(f"\n{'=' * 60}")
    print(f"Best model: {best_name}  (RMSE={best['rmse']:.4f}, R²={best['r2']:.4f})")
    print(f"{'=' * 60}")

    # Save model pipeline
    model_path = os.path.join(MODEL_DIR, "groundwater_model.joblib")
    joblib.dump(best["pipeline"], model_path)
    print(f"Saved model -> {model_path}")

    # Save metadata
    metadata = {
        "model_name": best_name,
        "trained_at": datetime.now().isoformat(),
        "training_period": f"{int(train_valid['year'].min())}-{int(train_valid['year'].max())}",
        "test_period": f"{int(test_valid['year'].min())}-{int(test_valid['year'].max())}",
        "n_observations": int(len(featured)),
        "n_train": int(len(train_valid)),
        "n_test": int(len(test_valid)),
        "features": FEATURE_COLUMNS,
        "target": TARGET_COLUMN,
        "validation_method": "Chronological held-out / one-step-ahead evaluation (1994-2018 train, 2019-2025 test; lag features use preceding observed measurements)",
        "evaluation_note": "Evaluated as a chronological one-step-ahead test. Test R² reflects one-step accuracy given preceding observed depths, not a guarantee of recursive multi-step forecasting performance.",
        "metrics": {k: v for k, v in best.items() if k != "pipeline"},
        "all_results": {
            name: {k: v for k, v in r.items() if k != "pipeline"}
            for name, r in results.items()
        },
        "data_path": "backend/data/cgwb_data.csv",
    }
    meta_path = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata -> {meta_path}")

    print("\nTraining complete.")


if __name__ == "__main__":
    main()

