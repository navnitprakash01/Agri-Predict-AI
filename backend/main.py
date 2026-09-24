"""
FastAPI backend for the Groundwater Depletion Forecasting System.

All ML inference runs locally — no external API is called.
Trained on real CGWB observation records from Ludhiana District (1994–2025).

Endpoints:
    GET  /health            — health check + model status
    POST /predict           — run a single prediction
    GET  /stations          — list monitoring stations with latest observed depths
    GET  /blocks            — list available locations/blocks
    GET  /historical-data   — return cleaned CGWB observations
    GET  /forecast          — autoregressive forecast for a station/location
    GET  /district-summary  — aggregate district-level statistics
    GET  /advisory          — standalone advisory from input params
    GET  /model-info        — model metadata + evaluation metrics
    GET  /data-stats        — real CGWB dataset data quality statistics
    GET  /seasons           — observation rounds
"""

from __future__ import annotations

import os
import sys
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend/ is on the path for local imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from advisory.advisory_engine import build_advisory_response, classify_risk
from ml.feature_engineering import clean_data, engineer_features
from ml.predictor import (
    ModelNotTrainedError,
    get_metadata,
    get_station_catalog,
    is_model_available,
    predict,
)
from schemas.prediction_schema import (
    DataStats,
    DistrictSummary,
    ForecastPoint,
    ForecastResponse,
    HistoricalDataPoint,
    ModelInfo,
    PredictionRequest,
    PredictionResponse,
    StationInfo,
)
from schemas.agriculture_schema import (
    AgricultureSummary,
    BlockAgricultureResponse,
    CropYearQueryResponse,
    CropYearRecord,
)
from agriculture.agriculture_service import (
    get_agriculture_summary,
    get_available_years,
    get_block_data,
    get_crop_by_year,
    get_crop_records,
    get_latest_district_agriculture,
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "cgwb_data.csv")

app = FastAPI(
    title="Ludhiana Groundwater Depletion Forecasting API",
    description="Local ML-powered groundwater forecasting and farmer advisory using real CGWB data (1994–2025)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_data_cache: pd.DataFrame | None = None


def load_data() -> pd.DataFrame:
    """Load, clean, and cache the real CGWB dataset."""
    global _data_cache
    if _data_cache is not None:
        return _data_cache

    if not os.path.exists(DATA_PATH):
        raise HTTPException(
            status_code=404, detail="CGWB dataset not found at backend/data/cgwb_data.csv"
        )

    df = pd.read_csv(DATA_PATH)
    df = clean_data(df)

    # Derived attributes for UI and query compatibility
    df["year"] = df["date_dt"].dt.year
    df["month"] = df["date_dt"].dt.month
    df["block"] = df["location"]
    df["groundwater_level_m"] = df["groundwater_level_m_bgl"]

    # Season mapping from real measurement rounds
    def get_season_name(m: str) -> str:
        m = str(m).lower()
        if "pre" in m:
            return "Pre-Monsoon"
        elif "jan" in m:
            return "Winter / Rabi"
        return "Post-Monsoon"

    df["season"] = df["measurement"].apply(get_season_name)

    # Placeholders for regional context in UI tables
    df["rainfall_mm"] = 0.0
    df["rice_area_hectares"] = 0.0
    df["wheat_area_hectares"] = 0.0
    df["groundwater_extraction_mcm"] = 0.0

    _data_cache = df
    return df


@app.get("/health")
def health():
    model_ok = is_model_available()
    data_ok = os.path.exists(DATA_PATH)
    status = "healthy" if (model_ok and data_ok) else "degraded"
    return {
        "status": status,
        "model_loaded": model_ok,
        "dataset_available": data_ok,
        "model_path": os.path.join(
            os.path.dirname(__file__), "models", "groundwater_model.joblib"
        ),
        "data_path": DATA_PATH,
    }


@app.get("/stations", response_model=list[StationInfo])
def list_stations():
    """Return all monitoring stations with latest observed depths and coordinates."""
    catalog = get_station_catalog()
    return [StationInfo(**info) for info in catalog.values()]


@app.get("/blocks")
def list_blocks():
    """Return list of distinct monitoring locations in Ludhiana."""
    catalog = get_station_catalog()
    locations = sorted(list({s["location"] for s in catalog.values()}))
    return {"blocks": locations}


@app.get("/seasons")
def list_seasons():
    return {
        "seasons": [
            "Pre-Monsoon (May)",
            "Winter / January",
        ]
    }


@app.post("/predict", response_model=PredictionResponse)
def run_prediction(req: PredictionRequest):
    """
    Run single-point groundwater level prediction using the local trained ML pipeline.
    """
    if not is_model_available():
        raise HTTPException(
            status_code=503,
            detail="Model not available — please run `python ml/train_model.py` in the backend directory.",
        )

    catalog = get_station_catalog()

    # Resolve station
    station_match = None
    if req.station_id and req.station_id in catalog:
        station_match = catalog[req.station_id]
    elif req.location or req.block:
        target_name = (req.location or req.block or "").strip().lower()
        for sid, sinfo in catalog.items():
            if target_name in sid.lower() or target_name in sinfo["location"].lower():
                station_match = sinfo
                break

    if not station_match and catalog:
        station_match = list(catalog.values())[0]

    # Resolve coordinates
    lat = req.latitude if req.latitude is not None else (station_match["latitude"] if station_match else 30.9010)
    lon = req.longitude if req.longitude is not None else (station_match["longitude"] if station_match else 75.8573)
    station_id_str = station_match["station_id"] if station_match else "Unknown"

    # Resolve measurement round
    is_pre = True
    if req.measurement:
        is_pre = "pre" in req.measurement.lower()
    elif req.season:
        is_pre = "pre" in req.season.lower() or "kharif" in req.season.lower()

    measurement_period = 1 if is_pre else 0
    month = 5 if is_pre else 1

    # Resolve baseline and lags
    if req.groundwater_level_m is not None and req.groundwater_level_m > 0:
        lag_1 = float(req.groundwater_level_m)
    elif station_match:
        lag_1 = float(station_match["latest_groundwater_level_m_bgl"])
    else:
        lag_1 = 15.0

    if req.previous_groundwater_level_m is not None and req.previous_groundwater_level_m > 0:
        lag_2 = float(req.previous_groundwater_level_m)
    elif station_match:
        lag_2 = float(station_match["penultimate_groundwater_level_m_bgl"])
    else:
        lag_2 = lag_1

    hist_mean = station_match["historical_mean_mbgl"] if station_match else (lag_1 + lag_2) / 2.0

    features = {
        "year": float(req.year),
        "month": float(month),
        "measurement_period": float(measurement_period),
        "latitude": float(lat),
        "longitude": float(lon),
        "lag_1_mbgl": float(lag_1),
        "lag_2_mbgl": float(lag_2),
        "historical_mean_mbgl": float(hist_mean),
    }

    try:
        result = predict(features)
        predicted = result["predicted_groundwater_level"]
        baseline = lag_1
        depletion_from_baseline = round(predicted - baseline, 2)
        depletion_rate = round(max(0.0, depletion_from_baseline), 2)
        meta = get_metadata()

        season_name = "Pre-Monsoon" if is_pre else "Winter / January"
        advisory_resp = build_advisory_response(
            predicted_level=predicted,
            depletion_rate=depletion_rate,
            season=season_name,
            rainfall=req.rainfall_mm or 0.0,
            rice_area=req.rice_area_hectares or 0.0,
            wheat_area=req.wheat_area_hectares or 0.0,
            irrigation_intensity=req.irrigation_intensity_pct or 0.0,
        )

        return PredictionResponse(
            predicted_groundwater_level=predicted,
            baseline_groundwater_level_m=baseline,
            depletion_from_baseline_m=depletion_from_baseline,
            depletion_rate=depletion_rate,
            risk_level=advisory_resp["risk_level"],
            risk_classification_type="Project-Defined Groundwater Depletion Risk Thresholds",
            advisory=advisory_resp["advisory"],
            model_name=result["model_name"],
            model_metrics=meta.get("metrics"),
            agricultural_context=advisory_resp.get("agricultural_context"),
            input_summary={
                "year": req.year,
                "season": season_name,
                "measurement": "pre" if is_pre else "jan",
                "station_id": station_id_str,
                "location": station_match["location"] if station_match else "Ludhiana",
                "current_groundwater_level_m": baseline,
                "baseline_depth_mbgl": baseline,
            },
        )
    except ModelNotTrainedError:
        raise HTTPException(status_code=503, detail="Model not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/historical-data")
def historical_data(
    block: str | None = Query(None, description="Filter by location/block"),
    station_id: str | None = Query(None, description="Filter by station_id"),
    start_year: int | None = Query(None, description="Start year"),
    end_year: int | None = Query(None, description="End year"),
    limit: int = Query(2000, le=5000, description="Max rows to return"),
):
    df = load_data().copy()

    if station_id:
        df = df[df["station_id"] == station_id]
    elif block:
        df = df[df["location"].str.lower() == block.lower()]

    if start_year:
        df = df[df["year"] >= start_year]
    if end_year:
        df = df[df["year"] <= end_year]

    df = df.sort_values(["date_dt", "location"]).head(limit)
    records = df.to_dict(orient="records")
    return {
        "count": len(records),
        "data": records,
    }


@app.get("/forecast", response_model=ForecastResponse)
def forecast(
    block: str = Query(..., description="Location or Station to project for"),
    years_ahead: int = Query(5, ge=1, le=10, description="Years to project ahead"),
    seasons: str = Query("Pre-Monsoon,Winter / January", description="Comma-separated observation rounds"),
):
    """
    Scenario-Based Groundwater Projection using autoregressive feedback.
    Projects future observation rounds based on the station's latest historical trajectory.
    """
    if not is_model_available():
        raise HTTPException(
            status_code=503,
            detail="Model not available — please run `python ml/train_model.py`.",
        )

    catalog = get_station_catalog()
    station_match = None

    if block in catalog:
        station_match = catalog[block]
    else:
        target = block.strip().lower()
        for sid, sinfo in catalog.items():
            if target in sid.lower() or target in sinfo["location"].lower():
                station_match = sinfo
                break

    if not station_match:
        station_match = list(catalog.values())[0]

    last_year = station_match["latest_year"]
    base_level = station_match["latest_groundwater_level_m_bgl"]
    lat = station_match["latitude"]
    lon = station_match["longitude"]
    sid = station_match["station_id"]
    hist_mean = station_match["historical_mean_mbgl"]

    lag_1 = base_level
    lag_2 = station_match["penultimate_groundwater_level_m_bgl"]

    rounds = [
        ("Pre-Monsoon", 5, 1),
        ("Winter / Rabi", 1, 0),
    ]

    forecasts: list[ForecastPoint] = []

    for yr_offset in range(1, years_ahead + 1):
        target_year = last_year + yr_offset
        for s_name, m_val, p_val in rounds:
            feat = {
                "year": float(target_year),
                "month": float(m_val),
                "measurement_period": float(p_val),
                "latitude": float(lat),
                "longitude": float(lon),
                "lag_1_mbgl": float(lag_1),
                "lag_2_mbgl": float(lag_2),
                "historical_mean_mbgl": float(hist_mean),
            }
            res = predict(feat)
            predicted = res["predicted_groundwater_level"]
            depletion = round(predicted - base_level, 2)
            step_depletion = max(0.0, round(predicted - lag_1, 2))
            risk = classify_risk(predicted, step_depletion)

            forecasts.append(
                ForecastPoint(
                    year=target_year,
                    season=s_name,
                    predicted_groundwater_level=predicted,
                    depletion_from_baseline_m=depletion,
                    risk_level=risk,
                )
            )

            # Autoregressive update
            lag_2 = lag_1
            lag_1 = predicted

    return ForecastResponse(
        block=station_match["location"],
        station_id=sid,
        projection_type="Scenario-Based Groundwater Projection",
        baseline_year=last_year,
        baseline_level_m=base_level,
        assumptions=[
            f"Projection for monitoring well station: {sid}.",
            "Autoregressive feedback: previous predicted groundwater depths serve as lag inputs for subsequent time steps.",
            "Conditional projection: reflects trajectory under status-quo conditions rather than guaranteed future state.",
        ],
        forecasts=forecasts,
    )


@app.get("/district-summary", response_model=DistrictSummary)
def district_summary(
    year: int | None = Query(None, description="Filter by year"),
):
    df = load_data().copy()
    if year:
        df = df[df["year"] == year]
        if df.empty:
            raise HTTPException(status_code=404, detail="No data available for the given year.")

    catalog = get_station_catalog()
    locations = sorted(list({s["location"] for s in catalog.values()}))
    station_ids = sorted(list(catalog.keys()))

    avg_gw = round(float(df["groundwater_level_m_bgl"].mean()), 2)

    # Depletion rate: slope of groundwater depth over years across all monitoring wells
    yearly_avg = df.groupby("year")["groundwater_level_m_bgl"].mean().sort_index()
    if len(yearly_avg) >= 2:
        x = np.arange(len(yearly_avg))
        y = yearly_avg.values
        slope = np.polyfit(x, y, 1)[0]
        avg_depletion = round(float(slope), 3)
    else:
        avg_depletion = 0.0

    overall_risk = classify_risk(avg_gw, avg_depletion)

    # Use official agricultural benchmarks for district context
    if year:
        yr_resp = get_crop_by_year(str(year))
        agri_rec = yr_resp.record
    else:
        agri_rec = get_latest_district_agriculture()

    rice_area = float(agri_rec.rice_area_ha) if agri_rec and agri_rec.rice_area_ha else 0.0
    wheat_area = float(agri_rec.wheat_area_ha) if agri_rec and agri_rec.wheat_area_ha else 0.0

    return DistrictSummary(
        district="Ludhiana",
        blocks=locations,
        stations=station_ids,
        total_stations=len(station_ids),
        year_range=[int(df["year"].min()), int(df["year"].max())],
        avg_groundwater_level=avg_gw,
        avg_depletion_rate=avg_depletion,
        total_rice_area=rice_area,
        total_wheat_area=wheat_area,
        overall_risk_level=overall_risk,
    )


@app.get("/advisory")
def advisory(
    predicted_level: float = Query(..., ge=0, description="Predicted groundwater level (m)"),
    depletion_rate: float = Query(..., ge=0, description="Depletion rate (m/year)"),
    season: str = Query("Pre-Monsoon", description="Season"),
    rainfall: float = Query(0.0, ge=0, description="Rainfall (mm)"),
    rice_area: float = Query(0.0, ge=0, description="Rice area (hectares)"),
    wheat_area: float = Query(0.0, ge=0, description="Wheat area (hectares)"),
    irrigation_intensity: float = Query(0.0, ge=0, description="Irrigation intensity (%)"),
):
    return build_advisory_response(
        predicted_level=predicted_level,
        depletion_rate=depletion_rate,
        season=season,
        rainfall=rainfall,
        rice_area=rice_area,
        wheat_area=wheat_area,
        irrigation_intensity=irrigation_intensity,
    )


@app.get("/model-info", response_model=ModelInfo)
def model_info():
    if not is_model_available():
        return ModelInfo(
            model_name="None",
            trained=False,
            message="Model not available — please run `python ml/train_model.py`.",
        )
    try:
        meta = get_metadata()
        return ModelInfo(
            model_name=meta.get("model_name", "Unknown"),
            trained=True,
            training_period=meta.get("training_period"),
            test_period=meta.get("test_period"),
            n_observations=meta.get("n_observations"),
            n_train=meta.get("n_train"),
            n_test=meta.get("n_test"),
            features=meta.get("features"),
            target=meta.get("target"),
            validation_method=meta.get("validation_method"),
            metrics=meta.get("metrics"),
            all_results=meta.get("all_results"),
            trained_at=meta.get("trained_at"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data-stats", response_model=DataStats)
def data_stats():
    """Return raw dataset statistics directly from backend/data/cgwb_data.csv."""
    if not os.path.exists(DATA_PATH):
        return DataStats(
            total_rows=0,
            total_columns=0,
            duplicate_rows=0,
            missing_values=0,
            complete_rows=0,
            incomplete_rows=0,
            year_range=[],
            blocks=[],
            stations=[],
            seasons=[],
            columns=[],
            missing_by_column={},
            data_available=False,
            message="Dataset unavailable — place the CGWB CSV file at backend/data/cgwb_data.csv.",
        )

    try:
        raw_df = pd.read_csv(DATA_PATH)
        cols = list(raw_df.columns)
        dup_count = int(raw_df.duplicated().sum())
        missing_total = int(raw_df.isnull().sum().sum())
        missing_by_col = {c: int(raw_df[c].isnull().sum()) for c in cols}
        complete = int(raw_df.dropna().shape[0])

        date_col = pd.to_datetime(raw_df["date"], errors="coerce")
        years = sorted(date_col.dt.year.dropna().unique().astype(int).tolist())
        locations = sorted(raw_df["location"].dropna().unique().astype(str).tolist())
        seasons = sorted(raw_df["measurement"].dropna().unique().astype(str).tolist())

        catalog = get_station_catalog()
        station_list = sorted(list(catalog.keys()))

        return DataStats(
            total_rows=int(len(raw_df)),
            total_columns=len(cols),
            duplicate_rows=dup_count,
            missing_values=missing_total,
            complete_rows=complete,
            incomplete_rows=int(len(raw_df) - complete),
            year_range=[min(years), max(years)] if years else [],
            blocks=locations,
            stations=station_list,
            seasons=seasons,
            columns=cols,
            missing_by_column=missing_by_col,
            data_available=True,
        )
    except Exception as e:
        return DataStats(
            total_rows=0,
            total_columns=0,
            duplicate_rows=0,
            missing_values=0,
            complete_rows=0,
            incomplete_rows=0,
            year_range=[],
            blocks=[],
            stations=[],
            seasons=[],
            columns=[],
            missing_by_column={},
            data_available=False,
            message=f"Failed to read dataset: {str(e)}",
        )


@app.get("/agriculture/summary", response_model=AgricultureSummary)
def agriculture_summary():
    """Return overview of official Ludhiana agricultural benchmarks and available years."""
    return get_agriculture_summary()


@app.get("/agriculture/years")
def agriculture_years():
    """Return list of observed crop benchmark years."""
    years = get_available_years()
    return {
        "district": "Ludhiana",
        "available_years": years,
        "note": "Intermediate unobserved years are intentionally not interpolated to preserve data integrity.",
    }


@app.get("/agriculture/crops")
def agriculture_crops():
    """Return all observed district benchmark records (1970–2024). No synthetic interpolation."""
    records = get_crop_records()
    return {
        "district": "Ludhiana",
        "count": len(records),
        "data": records,
        "source": "AERC / PAU / Department of Agriculture & Farmers' Welfare Punjab",
        "data_status": "observed/source-reported (no interpolation)",
    }


@app.get("/agriculture/block-data", response_model=BlockAgricultureResponse)
def agriculture_block_data():
    """Return block-level reported paddy and wheat production for 2016-17."""
    return get_block_data()


@app.get("/agriculture/year/{year_str}", response_model=CropYearQueryResponse)
def agriculture_by_year(year_str: str):
    """
    Query agricultural statistics for a specific crop year.
    Returns available=False if year is not among officially surveyed benchmark years.
    """
    return get_crop_by_year(year_str)


@app.get("/")
def root():
    return {
        "name": "Ludhiana Groundwater Depletion Forecasting API",
        "version": "2.0.0",
        "dataset": "Real CGWB Monitoring Data (1994–2025)",
        "endpoints": [
            "/health",
            "/stations",
            "/blocks",
            "/seasons",
            "/predict",
            "/historical-data",
            "/forecast",
            "/district-summary",
            "/advisory",
            "/model-info",
            "/data-stats",
            "/agriculture/summary",
            "/agriculture/years",
            "/agriculture/crops",
            "/agriculture/block-data",
            "/agriculture/year/{year_str}",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
