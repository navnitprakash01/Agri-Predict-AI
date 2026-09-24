import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Sprout, Wheat, AlertCircle, CheckCircle, Search, FileText, Database, Award } from 'lucide-react';
import { api } from '@/api';
import type {
  CropYearRecord,
  BlockProductionRecord,
  AgricultureSummary,
  CropYearQueryResponse,
} from '@/types';
import { LoadingSpinner, ErrorBanner } from '@/components/ui';

export function RotationPage() {
  const [summary, setSummary] = useState<AgricultureSummary | null>(null);
  const [cropRecords, setCropRecords] = useState<CropYearRecord[]>([]);
  const [blockRecords, setBlockRecords] = useState<BlockProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Year query state
  const [searchYear, setSearchYear] = useState('2023-24');
  const [queryResult, setQueryResult] = useState<CropYearQueryResponse | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, cropRes, blockRes] = await Promise.all([
        api.agricultureSummary(),
        api.agricultureCrops(),
        api.agricultureBlockData(),
      ]);
      setSummary(sumRes);
      setCropRecords(cropRes.data);
      setBlockRecords(blockRes.records);

      // Default initial query
      const initialQuery = await api.agricultureByYear('2023-24');
      setQueryResult(initialQuery);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agricultural data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleYearSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchYear.trim()) return;
    try {
      setQueryLoading(true);
      const res = await api.agricultureByYear(searchYear.trim());
      setQueryResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Year lookup failed');
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading agricultural benchmark data..." />;
  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorBanner message={error} /></div>;

  const latest = summary?.latest_record;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Rice-Wheat Cropping System & Agricultural Context
            </h1>
            <p className="mt-1 text-neutral-600">
              Official agricultural survey statistics for Ludhiana District (Punjab Agricultural University & Chief Agriculture Office).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle size={14} className="text-emerald-600" />
            Official Benchmarks · No Synthetic Data · No Interpolation
          </span>
        </div>
      </div>

      {/* Model & Agro-climatic Separation Notice */}
      <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-blue-900">
          <Database size={18} className="text-blue-700" />
          Methodological Architecture Notice
        </h2>
        <p className="text-sm leading-relaxed text-blue-800">
          <strong>Clean Separation of Layers:</strong> The local machine learning forecasting model runs directly on hydrogeological well observations from the Central Ground Water Board (CGWB 1994–2025).
          Because continuous historical crop data is not recorded at monitoring well resolution, <em>agricultural statistics are NOT fed as regression features into the ML model</em>.
          Instead, these official benchmark statistics serve as an <strong>agronomic advisory layer</strong> to guide actionable farmer recommendations (e.g. Alternate Wetting and Drying, direct seeding, and irrigation budgeting).
        </p>
      </div>

      {/* Key Benchmark Indicators */}
      {latest && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Paddy Area (2023–24)</span>
              <Sprout size={20} className="text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-neutral-900">
              {latest.rice_area_ha ? `${(latest.rice_area_ha / 1000).toFixed(1)}k ha` : 'N/A'}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Grown from 5.0k ha in 1970–71 to 258.8k ha (PAU Survey)
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Wheat Area (2023–24)</span>
              <Wheat size={20} className="text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-neutral-900">
              {latest.wheat_area_ha ? `${(latest.wheat_area_ha / 1000).toFixed(1)}k ha` : 'N/A'}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Dominant Rabi staple crop across Ludhiana district
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Paddy Yield (2023–24)</span>
              <Award size={20} className="text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-neutral-900">
              {latest.rice_yield_kg_ha ? `${latest.rice_yield_kg_ha.toLocaleString()} kg/ha` : 'N/A'}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              High-yielding varieties requiring intensive water management
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Wheat Yield (2023–24)</span>
              <Award size={20} className="text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-neutral-900">
              {latest.wheat_yield_kg_ha ? `${latest.wheat_yield_kg_ha.toLocaleString()} kg/ha` : 'N/A'}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Department of Agriculture & Farmers' Welfare
            </p>
          </div>
        </div>
      )}

      {/* Interactive Crop Year Lookup Tool */}
      <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">Official Benchmark Year Query Tool</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Query district-level agricultural surveys for any year. Missing intermediate years are strictly <strong>not interpolated</strong> to prevent misleading data.
        </p>

        <form onSubmit={handleYearSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              placeholder="e.g. 2023-24, 2009-10, 2015, 2020..."
              className="w-full rounded-xl border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={queryLoading}
            className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {queryLoading ? 'Searching...' : 'Check Official Data'}
          </button>
          <div className="text-xs text-neutral-500">
            Available surveyed benchmark years: {summary?.available_years.join(', ')}
          </div>
        </form>

        {queryResult && (
          <div className="mt-5">
            {queryResult.available && queryResult.record ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-2 font-semibold text-emerald-900">
                  <CheckCircle size={18} className="text-emerald-600" />
                  Official Survey Record: Crop Year {queryResult.record.crop_year}
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <span className="text-xs text-neutral-500">Paddy Area & Production</span>
                    <div className="text-sm font-bold text-neutral-900">
                      {queryResult.record.rice_area_ha?.toLocaleString()} ha · {queryResult.record.rice_production_t?.toLocaleString()} tonnes
                    </div>
                    <div className="text-xs text-neutral-600">Yield: {queryResult.record.rice_yield_kg_ha?.toLocaleString()} kg/ha</div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Wheat Area & Production</span>
                    <div className="text-sm font-bold text-neutral-900">
                      {queryResult.record.wheat_area_ha?.toLocaleString()} ha · {queryResult.record.wheat_production_t?.toLocaleString()} tonnes
                    </div>
                    <div className="text-xs text-neutral-600">Yield: {queryResult.record.wheat_yield_kg_ha?.toLocaleString()} kg/ha</div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Source & Provenance</span>
                    <div className="text-xs font-semibold text-neutral-900">{queryResult.record.source}</div>
                    <div className="mt-0.5 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {queryResult.record.data_status}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2 text-amber-900">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <div className="font-semibold text-amber-900">Data Not Available (Strict Non-Interpolation)</div>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                      {queryResult.message || 'No official benchmark survey was recorded for this crop year in Ludhiana.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Benchmark Visualizations */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Decadal Area Benchmark Chart */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Ludhiana Cropping Area Evolution</h3>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">OBSERVED BENCHMARKS</span>
          </div>
          <p className="mb-4 text-xs text-neutral-500">
            Source-reported survey years (1970–71 through 2023–24). Discrete benchmark observations; not interpolated.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cropRecords}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="crop_year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Hectares', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip formatter={(val: any) => [val ? `${Number(val).toLocaleString()} ha` : 'N/A']} />
              <Legend />
              <Bar dataKey="rice_area_ha" fill="#f97316" name="Paddy/Rice Area (ha)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wheat_area_ha" fill="#3b82f6" name="Wheat Area (ha)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Crop Yield Evolution Chart */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Crop Yield Trajectory (kg/ha)</h3>
            <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">PAU BENCHMARKS</span>
          </div>
          <p className="mb-4 text-xs text-neutral-500">
            Official average yield reported by PAU / Department of Agriculture for Ludhiana district.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cropRecords}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="crop_year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'kg/ha', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip formatter={(val: any) => [val ? `${Number(val).toLocaleString()} kg/ha` : 'N/A']} />
              <Legend />
              <Bar dataKey="rice_yield_kg_ha" fill="#10b981" name="Rice Yield (kg/ha)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wheat_yield_kg_ha" fill="#6366f1" name="Wheat Yield (kg/ha)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Block-level Production (2016-17) */}
      <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Block-Wise Crop Production Benchmarks (2016–17)</h2>
            <p className="text-xs text-neutral-500">
              Official data from Ludhiana District Administration, Chief Agriculture Office (11 administrative blocks).
            </p>
          </div>
          <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
            Units as reported by Chief Agriculture Office
          </span>
        </div>

        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={blockRecords}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="block" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="paddy_production_reported" fill="#f97316" name="Paddy Production (reported)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wheat_production_reported" fill="#3b82f6" name="Wheat Production (reported)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-700">
              <tr>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">Crop Year</th>
                <th className="px-4 py-3 text-right">Paddy Production</th>
                <th className="px-4 py-3 text-right">Wheat Production</th>
                <th className="px-4 py-3">Reporting Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {blockRecords.map((b) => (
                <tr key={b.block} className="hover:bg-neutral-50/50">
                  <td className="px-4 py-2.5 font-medium text-neutral-900">{b.block}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{b.crop_year}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700">
                    {b.paddy_production_reported?.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-blue-700">
                    {b.wheat_production_reported?.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{b.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advisory & Cropping Cycle Guide */}
      <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-primary-900">
          <FileText size={20} className="text-primary-700" />
          Agronomic Rotation Dynamics & Farmer Advisory Insights
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-neutral-100">
            <div className="flex items-center gap-2 font-semibold text-neutral-900">
              <Sprout size={18} className="text-orange-500" />
              Kharif Season (Paddy/Rice)
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              Paddy is transplanted in June–July and harvested in October–November. Because traditional puddle-transplanted rice demands continuous field ponding, it constitutes the largest seasonal aquifer drawdown in Ludhiana.
              The advisory engine promotes <strong>Alternate Wetting and Drying (AWD)</strong>, <strong>laser leveling</strong>, and <strong>Direct Seeded Rice (DSR)</strong> to reduce water demand by 15–25% while conserving yields.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-neutral-100">
            <div className="flex items-center gap-2 font-semibold text-neutral-900">
              <Wheat size={18} className="text-blue-500" />
              Rabi Season (Wheat)
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              Wheat is sown in November and harvested in April. It requires substantially less water (~4–5 irrigations across critical stages like crown root initiation and grain filling).
              Advisory rules focus on precise irrigation scheduling and retention of residue/mulch using happy seeders to preserve soil moisture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
