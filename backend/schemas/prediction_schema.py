"""
Pydantic schemas for the prediction API.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    year: int = Field(2025, ge=1990, le=2100, description="Year to predict for")
    measurement: Optional[str] = Field("pre", description="Observation round: 'pre' (Pre-Monsoon) or 'jan' (January)")
    season: Optional[str] = Field("Pre-Monsoon", description="Season name (Pre-Monsoon, Kharif, Post-Monsoon, Rabi)")
    station_id: Optional[str] = Field(None, description="Station identifier (e.g., 'Khanna (30.7000, 76.2200)')")
    location: Optional[str] = Field(None, description="Location or village name")
    block: Optional[str] = Field(None, description="Block/location name")
    latitude: Optional[float] = Field(None, description="Station latitude")
    longitude: Optional[float] = Field(None, description="Station longitude")
    groundwater_level_m: Optional[float] = Field(None, ge=0, description="Current or latest observed groundwater level (mbgl)")
    previous_groundwater_level_m: Optional[float] = Field(None, ge=0, description="Previous groundwater level (mbgl) for lag")
    rainfall_mm: Optional[float] = Field(0.0, ge=0, description="Seasonal rainfall in mm (agricultural context)")
    groundwater_extraction_mcm: Optional[float] = Field(0.0, ge=0, description="Groundwater extraction in MCM (agricultural context)")
    rice_area_hectares: Optional[float] = Field(0.0, ge=0, description="Rice cultivation area in hectares (agricultural context)")
    wheat_area_hectares: Optional[float] = Field(0.0, ge=0, description="Wheat cultivation area in hectares (agricultural context)")
    agricultural_area_hectares: Optional[float] = Field(0.0, ge=0, description="Total agricultural area in hectares")
    irrigation_intensity_pct: Optional[float] = Field(0.0, ge=0, le=500, description="Irrigation intensity percentage")
    rice_wheat_rotation: Optional[bool] = Field(False, description="Whether rice-wheat rotation is practiced")


class PredictionResponse(BaseModel):
    predicted_groundwater_level: float = Field(..., description="Groundwater Level Forecast in meters below ground level (mbgl)")
    baseline_groundwater_level_m: float = Field(..., description="Explicit baseline groundwater depth used for depletion calculation")
    depletion_from_baseline_m: float = Field(..., description="Calculated change in depth relative to baseline (positive = deeper/depleted)")
    depletion_rate: float = Field(..., description="Depletion amount relative to baseline for period")
    risk_level: str = Field(..., description="Groundwater Depletion Risk classification")
    risk_classification_type: str = Field("Project-Defined Groundwater Depletion Risk Thresholds", description="Notice on risk threshold provenance")
    advisory: list[str] = Field(..., description="Actionable farmer advisory guidelines")
    model_name: str = Field(..., description="Name of local ML model used for inference")
    model_metrics: dict[str, float] | None = Field(None, description="Actual model evaluation metrics (MAE, RMSE, R²)")
    input_summary: dict = Field(..., description="Summary of input parameters")
    agricultural_context: Optional[dict[str, Any]] = Field(None, description="Official regional agricultural benchmark context")


class StationInfo(BaseModel):
    station_id: str
    location: str
    latitude: float
    longitude: float
    latest_date: str
    latest_year: int
    latest_month: int
    latest_measurement: str
    latest_groundwater_level_m_bgl: float
    penultimate_groundwater_level_m_bgl: float
    historical_mean_mbgl: float
    total_observations: int


class HistoricalDataPoint(BaseModel):
    state: str = "Punjab"
    district: str = "Ludhiana"
    location: str
    station_id: str
    latitude: float
    longitude: float
    date: str
    year: int
    month: int
    measurement: str
    groundwater_level_m_bgl: float
    groundwater_level_m: float
    season: str
    block: str
    rainfall_mm: float = 0.0
    rice_area_hectares: float = 0.0
    wheat_area_hectares: float = 0.0
    groundwater_extraction_mcm: float = 0.0


class ForecastPoint(BaseModel):
    year: int
    season: str
    predicted_groundwater_level: float
    depletion_from_baseline_m: float
    risk_level: str


class ForecastResponse(BaseModel):
    block: str
    station_id: Optional[str] = None
    projection_type: str = "Scenario-Based Groundwater Projection"
    baseline_year: int
    baseline_level_m: float
    assumptions: list[str]
    forecasts: list[ForecastPoint]


class DistrictSummary(BaseModel):
    district: str
    blocks: list[str]
    stations: list[str]
    total_stations: int
    year_range: list[int]
    avg_groundwater_level: float
    avg_depletion_rate: float
    total_rice_area: float
    total_wheat_area: float
    overall_risk_level: str


class ModelInfo(BaseModel):
    model_name: str
    trained: bool
    training_period: str | None = None
    test_period: str | None = None
    n_observations: int | None = None
    n_train: int | None = None
    n_test: int | None = None
    features: list[str] | None = None
    target: str | None = None
    validation_method: str | None = None
    metrics: dict | None = None
    all_results: dict | None = None
    message: str | None = None
    trained_at: str | None = None


class DataStats(BaseModel):
    total_rows: int
    total_columns: int
    duplicate_rows: int
    missing_values: int
    complete_rows: int
    incomplete_rows: int
    year_range: list[int]
    blocks: list[str]
    stations: list[str] = []
    seasons: list[str]
    columns: list[str]
    missing_by_column: dict[str, int]
    data_available: bool
    message: str | None = None
