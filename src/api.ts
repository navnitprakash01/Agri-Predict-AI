import type {
  PredictionRequest,
  PredictionResponse,
  HistoricalResponse,
  ForecastResponse,
  DistrictSummary,
  ModelInfo,
  HealthStatus,
  DataStats,
  StationInfo,
  AgricultureSummary,
  CropYearRecord,
  BlockAgricultureResponse,
  CropYearQueryResponse,
} from '@/types';

const rawBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://agri-predict-ai.onrender.com'
    : 'http://localhost:8000');

export const API_BASE = rawBase.replace(/\/+$/, '');

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  health: () => fetchJSON<HealthStatus>('/health'),

  stations: () => fetchJSON<StationInfo[]>('/stations'),

  predict: (req: PredictionRequest) =>
    fetchJSON<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  historicalData: (params?: { block?: string; station_id?: string; start_year?: number; end_year?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.block) q.set('block', params.block);
    if (params?.station_id) q.set('station_id', params.station_id);
    if (params?.start_year) q.set('start_year', String(params.start_year));
    if (params?.end_year) q.set('end_year', String(params.end_year));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return fetchJSON<HistoricalResponse>(`/historical-data${qs ? `?${qs}` : ''}`);
  },

  forecast: (block: string, yearsAhead = 5, seasons = 'Pre-Monsoon,Winter / January') =>
    fetchJSON<ForecastResponse>(`/forecast?block=${encodeURIComponent(block)}&years_ahead=${yearsAhead}&seasons=${seasons}`),

  districtSummary: (params?: { year?: number }) => {
    const q = new URLSearchParams();
    if (params?.year) q.set('year', String(params.year));
    const qs = q.toString();
    return fetchJSON<DistrictSummary>(`/district-summary${qs ? `?${qs}` : ''}`);
  },

  modelInfo: () => fetchJSON<ModelInfo>('/model-info'),

  dataStats: () => fetchJSON<DataStats>('/data-stats'),

  blocks: async (): Promise<string[]> => {
    const res = await fetchJSON<{ blocks: string[] }>('/blocks');
    return res.blocks;
  },

  seasons: async (): Promise<string[]> => {
    const res = await fetchJSON<{ seasons: string[] }>('/seasons');
    return res.seasons;
  },

  agricultureSummary: () => fetchJSON<AgricultureSummary>('/agriculture/summary'),

  agricultureYears: () =>
    fetchJSON<{ district: string; available_years: string[]; note: string }>('/agriculture/years'),

  agricultureCrops: () =>
    fetchJSON<{ district: string; count: number; data: CropYearRecord[]; source: string; data_status: string }>('/agriculture/crops'),

  agricultureBlockData: () => fetchJSON<BlockAgricultureResponse>('/agriculture/block-data'),

  agricultureByYear: (year: string | number) =>
    fetchJSON<CropYearQueryResponse>(`/agriculture/year/${encodeURIComponent(String(year))}`),
};
