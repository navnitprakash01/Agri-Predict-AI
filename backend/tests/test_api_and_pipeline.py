import json
import os
import pytest
from fastapi.testclient import TestClient
import numpy as np
import pandas as pd

from main import app
from ml.feature_engineering import clean_data, engineer_features, TARGET_COLUMN
from ml.train_model import time_aware_split

client = TestClient(app)

def test_health():
    res = client.get('/health')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'healthy'
    assert data['model_loaded'] is True
    assert data['dataset_available'] is True

def test_model_metadata():
    res = client.get('/model-info')
    assert res.status_code == 200
    meta = res.json()
    assert meta['trained'] is True
    assert meta['n_train'] == 1295
    assert meta['n_test'] == 490
    assert meta['training_period'] == '1994-2018'
    assert meta['test_period'] == '2019-2025'
    assert 'mae' in meta['metrics']
    assert 'rmse' in meta['metrics']
    assert 'r2' in meta['metrics']

def test_stations_endpoint():
    res = client.get('/stations')
    assert res.status_code == 200
    stations = res.json()
    assert len(stations) == 124
    sample = stations[0]
    assert 'station_id' in sample
    assert 'latitude' in sample
    assert 'longitude' in sample
    assert 'latest_groundwater_level_m_bgl' in sample

def test_blocks_endpoint():
    res = client.get('/blocks')
    assert res.status_code == 200
    blocks = res.json()['blocks']
    assert len(blocks) == 105

def test_seasons_endpoint():
    res = client.get('/seasons')
    assert res.status_code == 200
    assert 'Pre-Monsoon (May)' in res.json()['seasons']

def test_district_summary():
    res = client.get('/district-summary')
    assert res.status_code == 200
    data = res.json()
    assert data['district'] == 'Ludhiana'
    assert data['year_range'] == [1994, 2025]
    assert data['avg_groundwater_level'] == 15.22
    assert data['avg_depletion_rate'] == 0.39

def test_data_stats():
    res = client.get('/data-stats')
    assert res.status_code == 200
    stats = res.json()
    assert stats['total_rows'] == 1809
    assert stats['total_columns'] == 8
    assert stats['duplicate_rows'] == 1

def test_historical_data():
    res = client.get('/historical-data?limit=20')
    assert res.status_code == 200
    records = res.json()
    assert records['count'] == 20
    assert 'groundwater_level_m_bgl' in records['data'][0]

def test_forecast_endpoint():
    res = client.get('/forecast?block=Khanna&years_ahead=3')
    assert res.status_code == 200
    data = res.json()
    assert len(data['forecasts']) == 6
    assert data['forecasts'][0]['predicted_groundwater_level'] > 0

def test_predict_endpoint():
    payload = {
        'year': 2026,
        'measurement': 'pre',
        'station_id': 'Khanna (30.7000, 76.2200)',
        'groundwater_level_m': 18.0,
        'previous_groundwater_level_m': 17.5
    }
    res = client.post('/predict', json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data['predicted_groundwater_level'] > 0
    assert data['risk_level'] in ['Low', 'Moderate', 'High', 'Critical']
    assert len(data['advisory']) > 0

def test_lag_leakage_and_chronology():
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "cgwb_data.csv")
    df = pd.read_csv(csv_path)
    cleaned = clean_data(df)
    featured = engineer_features(cleaned)
    for sid, grp in featured.groupby('station_id'):
        dates = grp['date_dt'].tolist()
        assert dates == sorted(dates)
        vals = grp[TARGET_COLUMN].tolist()
        lag1s = grp['lag_1_mbgl'].tolist()
        for i in range(1, len(vals)):
            assert np.isclose(lag1s[i], vals[i-1], equal_nan=True)


def test_features_do_not_contain_station_id():
    res = client.get('/model-info')
    assert res.status_code == 200
    meta = res.json()
    assert 'station_id' not in meta['features']
    assert meta['features'] == [
        'year',
        'month',
        'measurement_period',
        'latitude',
        'longitude',
        'lag_1_mbgl',
        'lag_2_mbgl',
        'historical_mean_mbgl',
    ]


def test_model_artifact_cross_version_compatibility():
    """Verify model artifact contains no NumPy 2.x BitGenerator references and loads cleanly."""
    model_path = os.path.join(os.path.dirname(__file__), "..", "models", "groundwater_model.joblib")
    assert os.path.exists(model_path)
    with open(model_path, 'rb') as f:
        content = f.read()
    assert b'PCG64' not in content
    assert b'_pcg64' not in content
    assert b'bit_generator' not in content

    import joblib
    model = joblib.load(model_path)
    assert model is not None
    reg = model.named_steps.get('regressor')
    assert reg is not None
    assert getattr(reg, '_feature_subsample_rng', None) is None
