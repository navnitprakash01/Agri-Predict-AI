import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { Map as MapIcon, Droplets, Cloud, Sprout, Wheat, Building2, Info, CheckCircle2 } from 'lucide-react';
import { api } from '@/api';
import type {
  HistoricalDataPoint,
  ForecastPoint,
  DistrictSummary,
  BlockAgricultureResponse,
  BlockProductionRecord,
} from '@/types';
import { LoadingSpinner, ErrorBanner, RiskBadge } from '@/components/ui';

const SEASONS = ['All', 'Pre-Monsoon', 'Winter / Rabi'];

export function DistrictPage() {
  const [blocks, setBlocks] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [historical, setHistorical] = useState<HistoricalDataPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [blockAgri, setBlockAgri] = useState<BlockAgricultureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.blocks().then(setBlocks).catch(() => {});
    api.districtSummary().then(setSummary).catch(() => {});
    api.agricultureBlockData().then(setBlockAgri).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedBlock) return;
    try {
      setLoading(true);
      setError(null);
      const params: { block?: string; start_year?: number; limit?: number } = { block: selectedBlock, limit: 2000 };
      if (selectedYear) params.start_year = selectedYear;
      const res = await api.historicalData(params);
      let filtered = res.data;
      if (selectedSeason !== 'All') {
        filtered = filtered.filter((d) => d.season === selectedSeason);
      }
      setHistorical(filtered);
      try {
        const fc = await api.forecast(selectedBlock, 5, 'Pre-Monsoon,Winter / January');
        setForecast(fc.forecasts);
      } catch {
        setForecast([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setHistorical([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBlock, selectedSeason, selectedYear]);

  useEffect(() => {
    if (blocks.length > 0 && !selectedBlock) {
      setSelectedBlock(blocks[0]);
    }
  }, [blocks, selectedBlock]);

  useEffect(() => {
    if (selectedBlock) loadData();
  }, [selectedBlock, loadData]);

  const blockData = aggregateBlockData(historical);

  // Match selected location with official 2016-17 block data
  const matchedAgriRecord: BlockProductionRecord | undefined = blockAgri?.records.find((r) =>
    r.block.toLowerCase().includes(selectedBlock.toLowerCase()) ||
    selectedBlock.toLowerCase().includes(r.block.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">District & Monitoring Station View</h1>
        <p className="mt-1 text-neutral-600">
          Select a CGWB monitoring location to view empirical well observations (1994–2025), scenario projections, and block agricultural statistics.
        </p>
      </div>

      {/* District summary */}
      {summary && (
        <div className="mb-8 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary-900">
            <MapIcon size={20} />
            {summary.district} District Overview (1994–2025)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard icon={Droplets} label="Avg GW Level" value={`${summary.avg_groundwater_level} mbgl`} />
            <StatCard icon={Cloud} label="Historical Deepening Trend" value={`${summary.avg_depletion_rate} m/yr`} />
            <StatCard icon={Sprout} label="Monitoring Stations" value={`${summary.total_stations ?? 124} Wells`} />
            <StatCard icon={Wheat} label="Locations Tracked" value={`${summary.blocks.length} Locations`} />
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Overall Risk</div>
              <RiskBadge level={summary.overall_risk_level} />
            </div>
          </div>
        </div>
      )}

      {/* Selectors */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Monitoring Location</label>
          <select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
          >
            {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Observation Round</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
          >
            {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">Filter Year (from)</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
            placeholder="All years (1994+)"
            min={1994}
            max={2025}
            className="w-36 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
          />
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading location data..." />}
      {error && <ErrorBanner message={error} />}

      {!loading && historical.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
          <p className="text-neutral-500">No monitoring observations found for this selection.</p>
        </div>
      )}

      {!loading && historical.length > 0 && (
        <div className="space-y-6">
          {/* Spatial Station Header */}
          <BlockMapVisual blockName={selectedBlock} data={historical} />

          {/* Block-Level 2016-17 Agricultural Benchmark Card (Real Data) */}
          {matchedAgriRecord ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <Building2 size={16} className="text-emerald-700" />
                  Official Administrative Block Benchmark: {matchedAgriRecord.block} Block (2016–17)
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  Chief Agriculture Office
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl bg-white border border-emerald-200 p-3">
                  <span className="text-neutral-500 font-medium">Reported Paddy Production</span>
                  <div className="text-base font-bold text-amber-800 mt-0.5">
                    {matchedAgriRecord.paddy_production_reported?.toLocaleString()} units
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Reported by Chief Agriculture Office</div>
                </div>
                <div className="rounded-xl bg-white border border-emerald-200 p-3">
                  <span className="text-neutral-500 font-medium">Reported Wheat Production</span>
                  <div className="text-base font-bold text-blue-800 mt-0.5">
                    {matchedAgriRecord.wheat_production_reported?.toLocaleString()} units
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Reported by Chief Agriculture Office</div>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-emerald-800 flex items-start gap-1">
                <Info size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>
                  <strong>Data Provenance:</strong> {matchedAgriRecord.source}. Units are kept as officially reported by the district administration for the 2016–17 survey.
                </span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 flex items-start gap-2">
              <Info size={16} className="shrink-0 mt-0.5 text-neutral-400" />
              <div>
                <strong>Regional Cropping Context:</strong> "{selectedBlock}" is tracked as an empirical CGWB well monitoring location.
                Official block-level agricultural production surveys (2016–17) are published for the 11 major administrative tehsils shown in the chart below.
              </div>
            </div>
          )}

          {/* Real Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 1. Real CGWB Observation Time Series */}
            <ChartCard title={`Groundwater Depth Observations: ${selectedBlock}`} tag="OBSERVED">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={blockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis label={{ value: 'Depth (mbgl)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [val ? `${val} mbgl` : 'N/A', 'Water Depth']} />
                  <Line type="monotone" dataKey="gw" stroke="#237a47" strokeWidth={2} name="Observed Depth (mbgl)" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Scenario-Based Projection for Location */}
            {forecast.length > 0 && (
              <ChartCard title={`Scenario-Based Groundwater Projection: ${selectedBlock}`} tag="PROJECTION">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecast.map((f) => ({ label: `${f.year} ${f.season}`, predicted: f.predicted_groundwater_level, risk: f.risk_level }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis label={{ value: 'Projected (mbgl)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: any) => [`${val} mbgl`, 'Projected Depth']} />
                    <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} name="Projected GW Depth (mbgl)" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* 3. Official Block-Level 2016-17 Production Comparison (All 11 Blocks) */}
            {blockAgri && (
              <div className="lg:col-span-2">
                <ChartCard title="Official Administrative Block Crop Production (2016–17 Survey)" tag="OBSERVED">
                  <div className="mb-2 text-xs text-neutral-500">
                    Reported by Ludhiana Chief Agriculture Office across the 11 administrative blocks.
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={blockAgri.records}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="block" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="paddy_production_reported" fill="#f97316" name="Reported Paddy Production" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="wheat_production_reported" fill="#3b82f6" name="Reported Wheat Production" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function aggregateBlockData(data: HistoricalDataPoint[]) {
  return data
    .map((d) => ({
      label: `${d.year} ${d.measurement === 'pre' ? 'May' : 'Jan'}`,
      date: d.date,
      gw: d.groundwater_level_m_bgl ?? d.groundwater_level_m,
      station_id: d.station_id,
      location: d.location,
    }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon size={16} className="text-primary-600" />
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

function ChartCard({ title, tag, children }: { title: string; tag?: 'OBSERVED' | 'PROJECTION'; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900">{title}</h3>
        {tag && (
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${tag === 'OBSERVED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {tag}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function BlockMapVisual({ blockName, data }: { blockName: string; data: HistoricalDataPoint[] }) {
  const latest = data[data.length - 1];
  const first = data[0];
  const delta = (latest && first)
    ? ((latest.groundwater_level_m_bgl ?? latest.groundwater_level_m) - (first.groundwater_level_m_bgl ?? first.groundwater_level_m))
    : 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-gradient-to-r from-neutral-50 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">{blockName} Monitoring Well Station</h2>
          <p className="text-xs text-neutral-500">
            {latest?.latitude?.toFixed(4)}°N, {latest?.longitude?.toFixed(4)}°E · Station ID: {latest?.station_id || blockName}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-xs text-neutral-500">Earliest Observed Depth</div>
            <div className="text-base font-bold text-neutral-900">
              {first ? `${(first.groundwater_level_m_bgl ?? first.groundwater_level_m).toFixed(2)} mbgl` : 'N/A'}
            </div>
            <div className="text-[10px] text-neutral-400">{first?.year}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Latest Observed Depth</div>
            <div className="text-base font-bold text-primary-700">
              {latest ? `${(latest.groundwater_level_m_bgl ?? latest.groundwater_level_m).toFixed(2)} mbgl` : 'N/A'}
            </div>
            <div className="text-[10px] text-neutral-400">{latest?.year}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Net Depletion Change</div>
            <div className={`text-base font-bold ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {delta > 0 ? `+${delta.toFixed(2)} m` : `${delta.toFixed(2)} m`}
            </div>
            <div className="text-[10px] text-neutral-400">Over record span</div>
          </div>
        </div>
      </div>
    </div>
  );
}
