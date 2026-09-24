"""
Feature engineering for the real Central Ground Water Board (CGWB) groundwater dataset.

Transforms real CGWB observations from Ludhiana District into model-ready features:
    - Temporal: year, month, measurement_period (0=jan, 1=pre)
    - Spatial: latitude, longitude, stable station_id (location + coordinates)
    - Autoregressive: lag_1_mbgl, lag_2_mbgl, historical_mean_mbgl

Data Leakage Prevention:
    - Station time series sorted strictly chronologically by date
    - Lags calculated ONLY from preceding observations (shift(1), shift(2))
    - historical_mean_mbgl calculated using ONLY observations prior to the current target observation
    - No future observations or test-set information leaked into past timestamps
"""

from __future__ import annotations

import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "year",
    "month",
    "measurement_period",
    "latitude",
    "longitude",
    "lag_1_mbgl",
    "lag_2_mbgl",
    "historical_mean_mbgl",
]

CATEGORICAL_FEATURES: list[str] = []

FEATURE_COLUMNS = NUMERIC_FEATURES

TARGET_COLUMN = "groundwater_level_m_bgl"


def create_station_id(df: pd.DataFrame) -> pd.Series:
    """Construct a stable station identifier combining location name and GPS coordinates."""
    lat_str = df["latitude"].round(4).astype(str)
    lon_str = df["longitude"].round(4).astype(str)
    return df["location"].astype(str) + " (" + lat_str + ", " + lon_str + ")"


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw CGWB observations:
    - Validate required columns
    - Construct stable station_id
    - Carefully aggregate multiple readings for the exact same station and date by averaging,
      preserving all valid observations rather than silently discarding them.
    - Order strictly chronologically per station.
    """
    df = df.copy()

    # Drop pure identical duplicate rows if any
    df = df.drop_duplicates().copy()

    # Ensure numeric types
    for col in ["latitude", "longitude", "groundwater_level_m_bgl"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Construct stable station identifier
    if "station_id" not in df.columns:
        df["station_id"] = create_station_id(df)

    # Standardize measurement period string
    if "measurement" in df.columns:
        df["measurement"] = df["measurement"].astype(str).str.lower().str.strip()

    # Group duplicate station/date readings by mean so all valid well records are preserved
    group_cols = ["state", "district", "location", "latitude", "longitude", "station_id", "date", "measurement"]
    group_cols = [c for c in group_cols if c in df.columns]

    df = (
        df.groupby(group_cols, as_index=False)["groundwater_level_m_bgl"]
        .mean()
    )

    # Parse date and sort chronologically
    df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.sort_values(["station_id", "date_dt"]).reset_index(drop=True)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate spatio-temporal and autoregressive features using strictly historical data:
    - year, month
    - measurement_period (1 for pre-monsoon, 0 for jan)
    - lag_1_mbgl, lag_2_mbgl
    - historical_mean_mbgl (expanding mean of prior readings only)
    """
    df = df.copy()
    if "date_dt" not in df.columns:
        df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
    if "station_id" not in df.columns:
        df["station_id"] = create_station_id(df)

    # Sort strictly chronologically per station
    df = df.sort_values(["station_id", "date_dt"]).reset_index(drop=True)

    # Temporal features
    df["year"] = df["date_dt"].dt.year
    df["month"] = df["date_dt"].dt.month
    df["measurement_period"] = (df["measurement"].str.lower() == "pre").astype(int)

    # Autoregressive features strictly from previous observations
    df["lag_1_mbgl"] = df.groupby("station_id")["groundwater_level_m_bgl"].shift(1)
    df["lag_2_mbgl"] = df.groupby("station_id")["groundwater_level_m_bgl"].shift(2)

    # Historical expanding mean using ONLY observations prior to current observation
    df["historical_mean_mbgl"] = df.groupby("station_id")["groundwater_level_m_bgl"].transform(
        lambda s: s.shift(1).expanding().mean()
    )

    return df


def prepare_model_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Return a DataFrame with exactly FEATURE_COLUMNS."""
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns after engineering: {missing}")
    return df[FEATURE_COLUMNS].copy()


