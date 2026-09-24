export interface StationInfo {
  station_id: string;
  location: string;
  latitude: number;
  longitude: number;
  latest_date: string;
  latest_year: number;
  latest_month: number;
  latest_measurement: string;
  latest_groundwater_level_m_bgl: number;
  penultimate_groundwater_level_m_bgl: number;
  historical_mean_mbgl: number;
  total_observations: number;
}

export interface PredictionRequest {
  year: number;
  season?: string;
  measurement?: string;
  station_id?: string;
  location?: string;
  block?: string;
  latitude?: number;
  longitude?: number;
  groundwater_level_m?: number;
  previous_groundwater_level_m?: number;
  rainfall_mm?: number;
  groundwater_extraction_mcm?: number;
  rice_area_hectares?: number;
  wheat_area_hectares?: number;
  agricultural_area_hectares?: number;
  irrigation_intensity_pct?: number;
  rice_wheat_rotation?: boolean;
}

export interface PredictionResponse {
  predicted_groundwater_level: number;
  baseline_groundwater_level_m: number;
  depletion_from_baseline_m: number;
  depletion_rate: number;
  risk_level: string;
  risk_classification_type?: string;
  advisory: string[];
  model_name: string;
  model_metrics?: { mae: number; rmse: number; r2: number };
  input_summary: {
    year: number;
    season: string;
    measurement?: string;
    station_id?: string;
    location?: string;
    block?: string;
    rainfall_mm?: number;
    current_groundwater_level_m: number;
    baseline_depth_mbgl?: number;
  };
  agricultural_context?: {
    crop_year: string;
    district: string;
    rice_area_ha?: number;
    rice_production_t?: number;
    rice_yield_kg_ha?: number;
    wheat_area_ha?: number;
    wheat_production_t?: number;
    wheat_yield_kg_ha?: number;
    source: string;
    relationship_notice: string;
  };
}

export interface HistoricalDataPoint {
  state?: string;
  district?: string;
  location?: string;
  station_id?: string;
  latitude?: number;
  longitude?: number;
  date?: string;
  year: number;
  month?: number;
  measurement?: string;
  groundwater_level_m_bgl?: number;
  groundwater_level_m: number;
  season: string;
  block: string;
  rainfall_mm: number;
  rice_area_hectares: number;
  wheat_area_hectares: number;
  groundwater_extraction_mcm: number;
}

export interface ForecastPoint {
  year: number;
  season: string;
  predicted_groundwater_level: number;
  depletion_from_baseline_m?: number;
  risk_level: string;
}

export interface DistrictSummary {
  district: string;
  blocks: string[];
  stations?: string[];
  total_stations?: number;
  year_range: [number, number];
  avg_groundwater_level: number;
  avg_depletion_rate: number;
  total_rice_area: number;
  total_wheat_area: number;
  overall_risk_level: string;
}

export interface ModelInfo {
  model_name: string;
  trained: boolean;
  training_period?: string;
  test_period?: string;
  n_observations?: number;
  n_train?: number;
  n_test?: number;
  features?: string[];
  target?: string;
  validation_method?: string;
  metrics?: { mae: number; rmse: number; r2: number };
  all_results?: Record<string, { mae: number; rmse: number; r2: number }>;
  message?: string;
  trained_at?: string;
}

export interface DataStats {
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  missing_values: number;
  complete_rows: number;
  incomplete_rows: number;
  year_range: number[];
  blocks: string[];
  seasons: string[];
  columns: string[];
  missing_by_column: Record<string, number>;
  data_available: boolean;
  message?: string;
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  dataset_available: boolean;
}

export interface HistoricalResponse {
  count: number;
  data: HistoricalDataPoint[];
}

export interface ForecastResponse {
  block: string;
  projection_type?: string;
  baseline_year?: number;
  baseline_level_m?: number;
  assumptions?: string[];
  forecasts: ForecastPoint[];
}

export interface CropYearRecord {
  crop_year: string;
  district: string;
  rice_area_ha: number | null;
  rice_production_t: number | null;
  rice_yield_kg_ha: number | null;
  wheat_area_ha: number | null;
  wheat_production_t: number | null;
  wheat_yield_kg_ha: number | null;
  source: string;
  data_status: string;
}

export interface BlockProductionRecord {
  crop_year: string;
  district: string;
  block: string;
  paddy_production_reported: number | null;
  wheat_production_reported: number | null;
  source: string;
  note?: string;
}

export interface AgricultureSummary {
  district: string;
  available_years: string[];
  earliest_year: string;
  latest_year: string;
  total_benchmark_records: number;
  latest_record: CropYearRecord | null;
  data_notice: string;
  block_data_years: string[];
}

export interface CropYearQueryResponse {
  available: boolean;
  crop_year: string;
  record: CropYearRecord | null;
  message?: string;
}

export interface BlockAgricultureResponse {
  crop_year: string;
  district: string;
  total_blocks: number;
  records: BlockProductionRecord[];
  source: string;
  note: string;
}
