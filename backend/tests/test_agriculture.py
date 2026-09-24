"""
Automated tests for Ludhiana Agriculture Data Service, Endpoints, and Model Independence.

Validates:
1. Agriculture schema and data integrity (source-reported benchmark years).
2. Block-level production data for 2016–17.
3. Explicit 'available=False' / non-interpolation behavior for unobserved years.
4. Integration with farmer advisory (contextual layer).
5. Verification that ML groundwater model features remain strictly 8 hydrogeological features
   and that no crop/agricultural variables are fed as regressors to the ML model.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from agriculture.agriculture_service import (
    load_district_agriculture,
    load_block_agriculture,
    get_available_years,
    get_crop_by_year,
    get_block_data,
    get_agriculture_summary,
)
from ml.predictor import get_metadata

client = TestClient(app)


def test_agriculture_district_loading():
    """Verify district agriculture records load and have expected benchmark years."""
    records = load_district_agriculture()
    assert len(records) == 6
    years = [r.crop_year for r in records]
    expected_years = ["1970-71", "1980-81", "1990-91", "2000-01", "2009-10", "2023-24"]
    assert years == expected_years

    # Check 2023-24 record values
    latest = records[-1]
    assert latest.crop_year == "2023-24"
    assert latest.rice_area_ha == 258800.0
    assert latest.wheat_area_ha == 243600.0
    assert latest.data_status == "observed/source-reported"
    assert "Punjab Agricultural University" in latest.source


def test_agriculture_block_loading():
    """Verify 2016-17 block-level production records."""
    blocks = load_block_agriculture()
    assert len(blocks) == 11
    block_names = [b.block for b in blocks]
    assert "Ludhiana" in block_names
    assert "Jagraon" in block_names
    assert "Khanna" in block_names
    assert "Samrala" in block_names

    for b in blocks:
        assert b.crop_year == "2016-17"
        assert b.district == "Ludhiana"
        assert b.paddy_production_reported is not None
        assert b.wheat_production_reported is not None
        assert "Chief Agriculture Office" in b.source


def test_endpoint_agriculture_summary():
    """Test GET /agriculture/summary endpoint."""
    res = client.get("/agriculture/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["district"] == "Ludhiana"
    assert data["total_benchmark_records"] == 6
    assert data["latest_year"] == "2023-24"
    assert data["earliest_year"] == "1970-71"
    assert data["latest_record"]["rice_area_ha"] == 258800.0
    assert "not interpolated" in data["data_notice"]


def test_endpoint_agriculture_years():
    """Test GET /agriculture/years endpoint."""
    res = client.get("/agriculture/years")
    assert res.status_code == 200
    data = res.json()
    assert "available_years" in data
    assert len(data["available_years"]) == 6
    assert "2023-24" in data["available_years"]


def test_endpoint_agriculture_crops():
    """Test GET /agriculture/crops endpoint."""
    res = client.get("/agriculture/crops")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 6
    assert len(data["data"]) == 6
    assert data["data_status"] == "observed/source-reported (no interpolation)"


def test_endpoint_agriculture_block_data():
    """Test GET /agriculture/block-data endpoint."""
    res = client.get("/agriculture/block-data")
    assert res.status_code == 200
    data = res.json()
    assert data["total_blocks"] == 11
    assert data["crop_year"] == "2016-17"
    assert len(data["records"]) == 11


def test_endpoint_agriculture_year_observed_and_unobserved():
    """Test GET /agriculture/year/{year_str} returns data when observed and available=False when unobserved."""
    # Observed year
    res_obs = client.get("/agriculture/year/2023-24")
    assert res_obs.status_code == 200
    data_obs = res_obs.json()
    assert data_obs["available"] is True
    assert data_obs["record"]["rice_area_ha"] == 258800.0

    # Unobserved year (e.g. 2015-16 or 2018) - must NEVER be interpolated!
    res_unobs = client.get("/agriculture/year/2015-16")
    assert res_unobs.status_code == 200
    data_unobs = res_unobs.json()
    assert data_unobs["available"] is False
    assert data_unobs["record"] is None
    assert "not interpolated" in data_unobs["message"].lower()


def test_prediction_includes_agricultural_context():
    """Test that POST /predict includes agricultural_context and maintains clean separation."""
    payload = {
        "year": 2025,
        "measurement": "pre",
        "station_id": "Khanna (30.7000, 76.2200)",
        "groundwater_level_m": 18.0,
        "previous_groundwater_level_m": 17.5,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "agricultural_context" in data
    agri = data["agricultural_context"]
    assert agri is not None
    assert agri["crop_year"] == "2023-24"
    assert agri["rice_area_ha"] == 258800.0
    assert "relationship_notice" in agri
    assert "NOT model input regressors" in agri["relationship_notice"]


def test_ml_model_features_remain_strictly_hydrogeological():
    """
    CRITICAL AUDIT: Prove that the ML model features matrix strictly consists
    of the 8 approved hydrogeological/autoregressive features and does NOT contain
    any agricultural or synthetic crop variables.
    """
    meta = get_metadata()
    features = meta.get("features", [])
    assert features == [
        "year",
        "month",
        "measurement_period",
        "latitude",
        "longitude",
        "lag_1_mbgl",
        "lag_2_mbgl",
        "historical_mean_mbgl",
    ]
    # Verify no crop features exist in the ML model
    for forbidden in ["rice", "wheat", "paddy", "crop", "production", "yield", "station_id"]:
        assert not any(forbidden in f.lower() for f in features), f"Forbidden feature '{forbidden}' found in ML features"
