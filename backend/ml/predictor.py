"""
Prediction engine — loads the trained pipeline and returns predictions.

The model is a scikit-learn Pipeline (preprocessing + estimator) saved as
models/groundwater_model.joblib. This module never calls an external API.
"""

from __future__ import annotations

import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ml.feature_engineering import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    clean_data,
    engineer_features,
)

# Cross-version compatibility patch for NumPy BitGenerator unpickling (NumPy 2.x <-> NumPy 1.x)
try:
    import numpy.random._pickle as _npr_pickle

    for _bg_cls in list(_npr_pickle.BitGenerators.values()):
        _npr_pickle.BitGenerators[_bg_cls] = _bg_cls
        _npr_pickle.BitGenerators[str(_bg_cls)] = _bg_cls

    _orig_bit_gen_ctor = _npr_pickle.__bit_generator_ctor

    def _safe_bit_generator_ctor(bit_generator="MT19937"):
        if isinstance(bit_generator, type):
            return bit_generator()
        if bit_generator in _npr_pickle.BitGenerators:
            cls = _npr_pickle.BitGenerators[bit_generator]
            return cls() if isinstance(cls, type) else cls
        name = getattr(bit_generator, "__name__", str(bit_generator))
        if name in _npr_pickle.BitGenerators:
            cls = _npr_pickle.BitGenerators[name]
            return cls() if isinstance(cls, type) else cls
        return _orig_bit_gen_ctor(bit_generator)

    _npr_pickle.__bit_generator_ctor = _safe_bit_generator_ctor
except Exception:
    pass

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "groundwater_model.joblib")
META_PATH = os.path.join(MODEL_DIR, "model_metadata.json")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cgwb_data.csv")

_model = None
_metadata = None
_station_cache: dict[str, Any] | None = None


class ModelNotTrainedError(Exception):
    pass


def load_model():
    """Lazily load the model and metadata into module-level cache."""
    global _model, _metadata
    if _model is not None:
        return _model, _metadata

    if not os.path.exists(MODEL_PATH):
        raise ModelNotTrainedError(
            "Trained model not found. Run `python ml/train_model.py` first."
        )
    _model = joblib.load(MODEL_PATH)

    if os.path.exists(META_PATH):
        with open(META_PATH) as f:
            _metadata = json.load(f)
    else:
        _metadata = {}

    return _model, _metadata


def is_model_available() -> bool:
    return os.path.exists(MODEL_PATH)


def get_metadata() -> dict[str, Any]:
    _, meta = load_model()
    return meta


def get_station_catalog() -> dict[str, dict[str, Any]]:
    """
    Build and cache a station lookup table from the real CGWB dataset.
    Returns metadata for each station including coordinates, latest observed depth,
    and historical statistics.
    """
    global _station_cache
    if _station_cache is not None:
        return _station_cache

    if not os.path.exists(DATA_PATH):
        return {}

    df = pd.read_csv(DATA_PATH)
    cleaned = clean_data(df)
    featured = engineer_features(cleaned)

    catalog: dict[str, dict[str, Any]] = {}
    for station_id, group in featured.groupby("station_id"):
        group = group.sort_values("date_dt")
        last_row = group.iloc[-1]
        lat = float(last_row["latitude"])
        lon = float(last_row["longitude"])
        loc = str(last_row["location"])
        latest_val = float(last_row["groundwater_level_m_bgl"])
        penultimate_val = (
            float(group.iloc[-2]["groundwater_level_m_bgl"])
            if len(group) > 1
            else latest_val
        )
        hist_mean = float(group["groundwater_level_m_bgl"].mean())

        catalog[station_id] = {
            "station_id": station_id,
            "location": loc,
            "latitude": lat,
            "longitude": lon,
            "latest_date": str(last_row["date"]),
            "latest_year": int(last_row["year"]),
            "latest_month": int(last_row["month"]),
            "latest_measurement": str(last_row["measurement"]),
            "latest_groundwater_level_m_bgl": round(latest_val, 2),
            "penultimate_groundwater_level_m_bgl": round(penultimate_val, 2),
            "historical_mean_mbgl": round(hist_mean, 2),
            "total_observations": int(len(group)),
        }

    _station_cache = catalog
    return catalog


def predict(features: dict[str, Any]) -> dict[str, Any]:
    """
    Run a single prediction with scikit-learn Pipeline.

    Args:
        features: dict with keys matching FEATURE_COLUMNS or station-based parameters.

    Returns:
        dict with predicted_groundwater_level, model_name, and metadata.
    """
    model, meta = load_model()

    # Build a single-row DataFrame with exact columns and appropriate dtypes
    row_data: dict[str, Any] = {}
    for col in NUMERIC_FEATURES:
        val = features.get(col, np.nan)
        try:
            row_data[col] = float(val) if val is not None else np.nan
        except (ValueError, TypeError):
            row_data[col] = np.nan

    for col in CATEGORICAL_FEATURES:
        row_data[col] = str(features.get(col, "Unknown"))

    X = pd.DataFrame([row_data], columns=FEATURE_COLUMNS)

    predicted = float(model.predict(X)[0])
    predicted = max(0.0, predicted)

    return {
        "predicted_groundwater_level": round(predicted, 2),
        "model_name": meta.get("model_name", "Unknown"),
        "features_used": FEATURE_COLUMNS,
    }


def predict_batch(rows: list[dict[str, Any]]) -> list[float]:
    """Predict for multiple rows. Returns list of predicted levels."""
    model, _ = load_model()
    processed_rows = []
    for r in rows:
        row_data: dict[str, Any] = {}
        for col in NUMERIC_FEATURES:
            val = r.get(col, np.nan)
            try:
                row_data[col] = float(val) if val is not None else np.nan
            except (ValueError, TypeError):
                row_data[col] = np.nan
        for col in CATEGORICAL_FEATURES:
            row_data[col] = str(r.get(col, "Unknown"))
        processed_rows.append(row_data)

    X = pd.DataFrame(processed_rows, columns=FEATURE_COLUMNS)
    preds = model.predict(X)
    return [round(max(0.0, float(p)), 2) for p in preds]
