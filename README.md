# District-Wise Groundwater Depletion Forecasting and Farmer Advisory System for Ludhiana District

A full-stack scientific machine-learning web application that forecasts groundwater depth and provides rule-based farmer advisories for Ludhiana District, Punjab.

The machine learning pipeline runs **entirely locally in Python using scikit-learn** — **no external AI or prediction APIs are used**.

---

## 1. System Architecture

```
Frontend (React + Vite + TypeScript + Recharts + Tailwind CSS)
    ↓ HTTP requests (localhost:8000)
FastAPI Backend (Python 3.11)
    ↓
┌───────────────────────────────┬──────────────────────────────────┐
│  Groundwater ML Forecasting   │  Agricultural Advisory Context   │
│  (Physical CGWB Well Records) │  (PAU Benchmark Surveys)         │
├───────────────────────────────┼──────────────────────────────────┤
│ - 8 hydrogeological features  │ - Official benchmark statistics  │
│ - Trained scikit-learn model  │ - 11-block production (2016–17)  │
│ - Recursive multi-step proj.  │ - Strict non-interpolation       │
└───────────────────────────────┴──────────────────────────────────┘
    ↓
Deterministic Rule-Based Farmer Advisory Engine
    ↓
Structured 4-Tier Response (Baseline + Forecast + Agri Context + Advisory Guidelines)
```

---

## 2. Real Datasets

### A. Central Ground Water Board (CGWB) Groundwater Observations
- **File:** `backend/data/cgwb_data.csv` (reference backup: `backend/data/ludhiana_cgwb_groundwater_1994_2025.csv`)
- **Source:** Central Ground Water Board (CGWB), Ministry of Jal Shakti, Government of India.
- **Records:** 1,809 real physical observations across Ludhiana District (1994–2025).
- **Locations & Wells:** 105 distinct locations representing 124 monitored well stations.
- **Observation Rounds:** Pre-Monsoon (May, `pre`, 1,038 observations) and Winter (January, `jan`, 771 observations).
- **Active Schema (8 Columns):**

| Column | Type | Description |
| :--- | :--- | :--- |
| `state` | string | State name (`Punjab`) |
| `district` | string | District name (`Ludhiana`) |
| `location` | string | Village or monitoring well location name |
| `latitude` | float | Well GPS latitude coordinate |
| `longitude` | float | Well GPS longitude coordinate |
| `date` | string | Date of observation (`YYYY-MM-DD`) |
| `groundwater_level_m_bgl` | float | Groundwater depth in metres below ground level (mbgl) |
| `measurement` | string | Observation round (`pre` = Pre-Monsoon May, `jan` = Winter Jan) |

> [!WARNING]
> **Data Integrity Warning:** Do **NOT** run `backend/data/generate_data.py` for research evaluation. That script produces legacy synthetic demo data and is kept solely as an archived development artifact. The active pipeline relies exclusively on real CGWB observations.

### B. Official Agricultural Benchmark Datasets
1. **District-Level Benchmark Time Series:** `backend/data/ludhiana_rice_wheat_agriculture_expanded.csv`
   - **Source:** Punjab Agricultural University (PAU) / Department of Agriculture & Farmers' Welfare, Punjab / Agro-Economic Research Centre (AERC).
   - **Surveyed Benchmark Years:** `1970-71`, `1980-81`, `1990-91`, `2000-01`, `2009-10`, `2023-24`.
   - **Metrics:** Paddy/Rice area (ha), production (tonnes), yield (kg/ha); Wheat area (ha), production (tonnes), yield (kg/ha).
   - **Strict Non-Interpolation Policy:** Missing intermediate years are **never interpolated**; queries for unobserved years return an explicit `"Data Not Available (Strict Non-Interpolation)"` response.
2. **Block-Level Agricultural Production (2016–17):** `backend/data/ludhiana_block_rice_wheat_2016_17.csv`
   - **Source:** Ludhiana District Administration, Chief Agriculture Office.
   - **Coverage:** Reported paddy and wheat production across all 11 administrative blocks (Ludhiana, Sidhwan Bet, Jagraon, Sudhar, Pakhowal, Dehlon, Doraha, Khanna, Samrala, Machhiwara, Mangat).

---

## 3. Local Machine Learning Pipeline

### Feature Architecture
The local ML model forecasts `groundwater_level_m_bgl` using **strictly 8 physical and autoregressive features**:
$$\mathbf{X} = [\text{year}, \text{month}, \text{measurement\_period}, \text{latitude}, \text{longitude}, \text{lag\_1\_mbgl}, \text{lag\_2\_mbgl}, \text{historical\_mean\_mbgl}]$$

- **Station ID Exclusion:** `station_id` is **NOT** included in the regression feature matrix (avoiding artificial ordinal bias between unrelated wells). Latitude and longitude provide true spatial continuity.
- **Autoregressive Lags:** `lag_1_mbgl` and `lag_2_mbgl` are generated strictly from chronologically preceding observations at that specific well.
- **Leakage-Free Historical Mean:** `historical_mean_mbgl` uses an expanding window strictly prior to the observation timestamp.

### Chronological Train / Test Split
To prevent temporal data leakage, records are partitioned chronologically:
- **Training Period:** 1994–2018 ($N = 1,295$ observations)
- **Evaluation / Test Period:** 2019–2025 ($N = 490$ observations)

### Verified Model Performance (Test Set: 2019–2025)

| Candidate Model | MAE | RMSE | $R^2$ | Status |
| :--- | :---: | :---: | :---: | :---: |
| **HistGradientBoostingRegressor** | **1.2370 m** | **2.1328 m** | **0.9456** | **Selected (Deployed)** |
| **RandomForestRegressor** | 1.2952 m | 2.2714 m | 0.9383 | Evaluated Baseline |
| **GradientBoostingRegressor** | 1.3410 m | 2.3254 m | 0.9353 | Evaluated Baseline |
| **LinearRegression** | 1.5924 m | 2.8941 m | 0.8998 | Evaluated Baseline |

*Note: Held-out evaluation reflects one-step-ahead accuracy with observed lags; multi-step recursive forecasting compounds uncertainty over longer horizons.*

---

## 4. Forecasting & Scenario Projections

The `/forecast` endpoint executes a **recursive multi-step autoregressive projection**:
1. Predicts step $\hat{y}_t$.
2. Updates state vector ($\text{lag}_2 \leftarrow \text{lag}_1, \text{lag}_1 \leftarrow \hat{y}_t$).
3. Projects subsequent rounds through step $t+k$.

> [!NOTE]
> **Scientific Limitation:** Projections represent conditional scenario trajectories under status-quo extraction trends. They do not constitute deterministic or statutory guarantees of future water table levels.

---

## 5. Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated test suite (21 unit and pipeline tests)
pytest tests/ -v

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
Backend API interactive documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
# In the repository root
npm install

# Typecheck and production build
npm run typecheck
npm run build

# Start development server
npm run dev
```
Frontend interface will be available at `http://localhost:5173`.

---

## 6. API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/health` | GET | System status and model health |
| `/stations` | GET | 124 CGWB stations with coordinates, latest depth, and historical statistics |
| `/blocks` | GET | 105 monitored well locations |
| `/seasons` | GET | Observation rounds (`pre`, `jan`) |
| `/district-summary` | GET | District averages, historical deepening rate, and latest benchmark crop areas |
| `/data-stats` | GET | Real CGWB dataset quality metrics (1,809 rows, 0 nulls) |
| `/historical-data` | GET | Cleaned CGWB station time-series records |
| `/forecast` | GET | Recursive scenario-based groundwater projection |
| `/predict` | POST | Single-point forecast returning 4-tier structured output |
| `/model-info` | GET | Model metadata, feature list, and verified test metrics |
| `/advisory` | GET | Standalone rule-based farmer advisory response |
| `/agriculture/summary` | GET | Overview of surveyed benchmark years and latest PAU record |
| `/agriculture/years` | GET | List of surveyed benchmark years |
| `/agriculture/crops` | GET | All 6 observed benchmark records (1970–71 to 2023–24) |
| `/agriculture/block-data` | GET | 11-block reported crop production (2016–17) |
| `/agriculture/year/{year_str}` | GET | Benchmark year lookup with strict non-interpolation |
