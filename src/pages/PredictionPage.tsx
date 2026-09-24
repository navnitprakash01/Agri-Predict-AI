import { useState, useEffect } from 'react';
import {
  Calculator,
  Droplets,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Loader2,
  MapPin,
  Sprout,
  Wheat,
  BookOpen,
  Info,
} from 'lucide-react';
import { api } from '@/api';
import type { PredictionRequest, PredictionResponse, StationInfo } from '@/types';
import { RiskBadge, ErrorBanner } from '@/components/ui';

const OBSERVATION_ROUNDS = [
  { id: 'pre', label: 'Pre-Monsoon (May)', season: 'Pre-Monsoon' },
  { id: 'jan', label: 'Winter / January', season: 'Winter / Rabi' },
];

const DEFAULT_FORM: PredictionRequest = {
  year: 2025,
  measurement: 'pre',
  season: 'Pre-Monsoon',
  rainfall_mm: 550,
  groundwater_level_m: 16.0,
  groundwater_extraction_mcm: 45,
  rice_area_hectares: 42000,
  wheat_area_hectares: 5000,
  agricultural_area_hectares: 75000,
  irrigation_intensity_pct: 180,
  previous_groundwater_level_m: 15.5,
  rice_wheat_rotation: true,
  block: 'Ludhiana',
  station_id: '',
};

export function PredictionPage() {
  const [form, setForm] = useState<PredictionRequest>(DEFAULT_FORM);
  const [stations, setStations] = useState<StationInfo[]>([]);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stations()
      .then((data) => {
        setStations(data);
        if (data.length > 0) {
          const first = data[0];
          setForm((prev) => ({
            ...prev,
            station_id: first.station_id,
            block: first.location,
            groundwater_level_m: first.latest_groundwater_level_m_bgl,
            previous_groundwater_level_m: first.penultimate_groundwater_level_m_bgl,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleStationChange = (stationId: string) => {
    const selected = stations.find((s) => s.station_id === stationId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        station_id: selected.station_id,
        block: selected.location,
        latitude: selected.latitude,
        longitude: selected.longitude,
        groundwater_level_m: selected.latest_groundwater_level_m_bgl,
        previous_groundwater_level_m: selected.penultimate_groundwater_level_m_bgl,
      }));
    } else {
      setForm((prev) => ({ ...prev, station_id: stationId }));
    }
  };

  const handleChange = (field: keyof PredictionRequest, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.predict(form);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Prediction & Farmer Advisory</h1>
        <p className="mt-1 text-neutral-600">
          Forecast groundwater levels using the local ML pipeline trained on real CGWB observations (1994–2025).
          Select a CGWB monitoring station or enter custom conditions.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
            <Calculator size={20} className="text-primary-600" />
            Hydrogeological Input Parameters
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Station Selector */}
            {stations.length > 0 && (
              <Field label="CGWB Monitoring Station">
                <select
                  value={form.station_id || ''}
                  onChange={(e) => handleStationChange(e.target.value)}
                  className={inputClass}
                >
                  {stations.map((s) => (
                    <option key={s.station_id} value={s.station_id}>
                      {s.location} — {s.station_id} (Latest: {s.latest_groundwater_level_m_bgl} mbgl)
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Target Year">
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => handleChange('year', Number(e.target.value))}
                  className={inputClass}
                  min={1994}
                  max={2100}
                />
              </Field>
              <Field label="Observation Round">
                <select
                  value={form.measurement || 'pre'}
                  onChange={(e) => {
                    const round = OBSERVATION_ROUNDS.find((r) => r.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      measurement: e.target.value,
                      season: round?.season || 'Pre-Monsoon',
                    }));
                  }}
                  className={inputClass}
                >
                  {OBSERVATION_ROUNDS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current/Baseline GW Level (mbgl)">
                <input
                  type="number"
                  step="0.01"
                  value={form.groundwater_level_m ?? ''}
                  onChange={(e) => handleChange('groundwater_level_m', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Previous Observation (mbgl)">
                <input
                  type="number"
                  step="0.01"
                  value={form.previous_groundwater_level_m ?? ''}
                  onChange={(e) => handleChange('previous_groundwater_level_m', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <div className="mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Agricultural & Seasonal Context (Advisory Reference)
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Seasonal Rainfall (mm)">
                  <input
                    type="number"
                    step="0.1"
                    value={form.rainfall_mm ?? ''}
                    onChange={(e) => handleChange('rainfall_mm', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Irrigation Intensity (%)">
                  <input
                    type="number"
                    step="0.1"
                    value={form.irrigation_intensity_pct ?? ''}
                    onChange={(e) => handleChange('irrigation_intensity_pct', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Rice Area (ha)">
                  <input
                    type="number"
                    value={form.rice_area_hectares ?? ''}
                    onChange={(e) => handleChange('rice_area_hectares', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Wheat Area (ha)">
                  <input
                    type="number"
                    value={form.wheat_area_hectares ?? ''}
                    onChange={(e) => handleChange('wheat_area_hectares', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={form.rice_wheat_rotation}
                onChange={(e) => handleChange('rice_wheat_rotation', e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600"
              />
              <span className="text-sm text-neutral-700">Rice-wheat rotation practiced</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Running prediction...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Get Prediction
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}

          {loading && !result && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-200 bg-white p-12">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
                <Droplets className="absolute inset-0 m-auto text-primary-500" size={24} />
              </div>
              <p className="text-sm text-neutral-500">Running local ML model prediction...</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
              <Calculator size={48} className="text-neutral-300" />
              <p className="text-neutral-500">Enter parameters and click "Get Prediction" to see results.</p>
            </div>
          )}

          {result && (
            <>
              {/* TIER 1 & 2: Local ML Groundwater Level Forecast & Evaluation */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm animate-fade-in-up">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-neutral-900">Groundwater Depth Forecast & Aquifer Risk</h2>
                  <span className="rounded bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-800">
                    Local ML Inference (Trained on CGWB 1994–2025)
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ResultCard
                    icon={Droplets}
                    label="Groundwater Level Forecast"
                    value={`${result.predicted_groundwater_level} mbgl`}
                    tag="FORECAST"
                  />
                  <ResultCard
                    icon={TrendingDown}
                    label="Depletion Relative to Baseline"
                    value={`${result.depletion_from_baseline_m >= 0 ? '+' : ''}${result.depletion_from_baseline_m} m`}
                    tag="BASELINE: "
                    baseline={`${result.baseline_groundwater_level_m} mbgl`}
                  />
                  <ResultCard
                    icon={AlertTriangle}
                    label="Groundwater Depletion Risk"
                    value={<RiskBadge level={result.risk_level} />}
                    sublabel="Project-Defined Thresholds"
                  />
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Sparkles size={18} className="text-primary-600" />
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">TEST METRICS</span>
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Model Evaluation Metrics</div>
                    {result.model_metrics ? (
                      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                        <div>
                          <div className="text-xs text-neutral-500">MAE</div>
                          <div className="text-sm font-bold text-neutral-900">{result.model_metrics.mae.toFixed(3)}m</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500">RMSE</div>
                          <div className="text-sm font-bold text-neutral-900">{result.model_metrics.rmse.toFixed(3)}m</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500">R²</div>
                          <div className="text-sm font-bold text-neutral-900">{result.model_metrics.r2.toFixed(3)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm font-medium text-neutral-500">Model metrics unavailable</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-2.5 text-xs text-neutral-600">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><strong>Model:</strong> {result.model_name}</span>
                    <span><strong>Round:</strong> {result.input_summary.season} {result.input_summary.year}</span>
                    <span><strong>Station:</strong> {result.input_summary.station_id || result.input_summary.location || 'Ludhiana'}</span>
                    <span><strong>Baseline Depth:</strong> {result.baseline_groundwater_level_m} mbgl</span>
                  </div>
                </div>
              </div>

              {/* TIER 3: Regional Agricultural Context (Official PAU Benchmark) */}
              {result.agricultural_context && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-emerald-900">
                      <Sprout size={18} className="text-emerald-700" />
                      Regional Agricultural Context (Crop Year {result.agricultural_context.crop_year})
                    </h3>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      OFFICIAL PAU SURVEY
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <div className="font-medium text-neutral-500">District Paddy Footprint</div>
                      <div className="mt-1 text-base font-bold text-neutral-900">
                        {result.agricultural_context.rice_area_ha ? `${(result.agricultural_context.rice_area_ha / 1000).toFixed(1)}k hectares` : 'N/A'}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        Yield: {result.agricultural_context.rice_yield_kg_ha?.toLocaleString()} kg/ha
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                      <div className="font-medium text-neutral-500">District Wheat Footprint</div>
                      <div className="mt-1 text-base font-bold text-neutral-900">
                        {result.agricultural_context.wheat_area_ha ? `${(result.agricultural_context.wheat_area_ha / 1000).toFixed(1)}k hectares` : 'N/A'}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        Yield: {result.agricultural_context.wheat_yield_kg_ha?.toLocaleString()} kg/ha
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-emerald-800">
                    <Info size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>{result.agricultural_context.relationship_notice}</span>
                  </div>
                </div>
              )}

              {/* TIER 4: Actionable Farmer Advisory Guidelines */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
                    <Sparkles size={20} className="text-primary-600" />
                    Farmer Advisory Guidelines
                  </h2>
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                    DETERMINISTIC RULES
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {result.advisory.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-lg border border-neutral-100 bg-neutral-50/80 p-3 text-sm text-neutral-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{a}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  <strong>Decision Support Notice:</strong> These advisories are rule-based recommendations for educational and agro-climatic planning. They do not constitute a statutory guarantee of crop yields or water savings.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</label>
      {children}
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  tag,
  sublabel,
  baseline,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tag?: string;
  sublabel?: string;
  baseline?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <Icon size={18} className="text-primary-600" />
        {tag && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            {tag}{baseline ? baseline : ''}
          </span>
        )}
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-neutral-900">{value}</div>
      {sublabel && <div className="mt-1 text-[11px] text-neutral-500">{sublabel}</div>}
    </div>
  );
}
