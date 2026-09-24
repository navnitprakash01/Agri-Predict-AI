import { useState, useEffect, useCallback } from 'react';
import { Database, FileText, CheckCircle2, AlertCircle, Table2, Copy } from 'lucide-react';
import { api } from '@/api';
import type { HistoricalDataPoint, DataStats } from '@/types';
import { LoadingSpinner, ErrorBanner } from '@/components/ui';

export function DataPage() {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, histRes] = await Promise.all([
        api.dataStats(),
        api.historicalData({ limit: 2000 }).catch(() => ({ count: 0, data: [] as HistoricalDataPoint[] })),
      ]);
      setStats(statsRes);
      setData(histRes.data);
      if (!statsRes.data_available && statsRes.message) {
        setError(statsRes.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner label="Loading dataset..." />;

  const displayData = showAll ? data : data.slice(0, 50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Data Management</h1>
        <p className="mt-1 text-neutral-600">View the CGWB dataset schema, data quality statistics, and raw observations</p>
      </div>

      {/* Dataset unavailable state */}
      {stats && !stats.data_available && (
        <div className="mb-8 rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-orange-600" size={28} />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Dataset Unavailable</h2>
              <p className="text-sm text-neutral-600">{stats.message || 'Place the CGWB CSV file at backend/data/cgwb_data.csv to enable data features.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Schema documentation */}
      <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <FileText size={20} className="text-primary-600" />
          CSV Schema Documentation
        </h2>
        <p className="mb-4 text-sm text-neutral-600">
          The CGWB dataset should be placed at <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">backend/data/cgwb_data.csv</code> with the following columns:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="py-2 pr-4 font-semibold text-neutral-700">Column</th>
                <th className="py-2 pr-4 font-semibold text-neutral-700">Type</th>
                <th className="py-2 pr-4 font-semibold text-neutral-700">Description</th>
              </tr>
            </thead>
            <tbody>
              {SCHEMA.map((col) => (
                <tr key={col.name} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 font-mono text-xs text-primary-700">{col.name}</td>
                  <td className="py-2 pr-4 text-neutral-600">{col.type}</td>
                  <td className="py-2 pr-4 text-neutral-600">{col.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data quality stats from backend */}
      {stats && stats.data_available && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Database} label="Total Rows" value={stats.total_rows} />
            <StatCard icon={Table2} label="Columns" value={stats.total_columns} />
            <StatCard icon={Copy} label="Duplicate Rows" value={stats.duplicate_rows} />
            <StatCard icon={AlertCircle} label="Missing Values" value={stats.missing_values} />
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CheckCircle2} label="Complete Rows" value={stats.complete_rows} />
            <StatCard icon={AlertCircle} label="Incomplete Rows" value={stats.incomplete_rows} />
            <StatCard label="Year Range" value={stats.year_range.length === 2 ? `${stats.year_range[0]}–${stats.year_range[1]}` : '—'} />
            <StatCard label="Blocks" value={stats.blocks.length} />
          </div>

          {/* Missing values by column */}
          {Object.keys(stats.missing_by_column).length > 0 && (
            <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <AlertCircle size={20} className="text-primary-600" />
                Missing Values by Column (Raw CSV)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left">
                      <th className="py-2 pr-4 font-semibold text-neutral-700">Column</th>
                      <th className="py-2 pr-4 font-semibold text-neutral-700">Missing Count</th>
                      <th className="py-2 pr-4 font-semibold text-neutral-700">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.missing_by_column).map(([col, count]) => (
                      <tr key={col} className="border-b border-neutral-50">
                        <td className="py-2 pr-4 font-mono text-xs text-primary-700">{col}</td>
                        <td className="py-2 pr-4 text-neutral-600">{count}</td>
                        <td className="py-2 pr-4 text-neutral-600">
                          {stats.total_rows > 0 ? ((count / stats.total_rows) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Data table */}
      {data.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <Database size={20} className="text-primary-600" />
              Real CGWB Observations {showAll ? `(${data.length} rows)` : `(${data.length} rows, showing first 50)`}
            </h2>
            <button
              onClick={() => setShowAll(!showAll)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {showAll ? 'Show first 50' : 'Show all'}
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  {['Date', 'Location', 'Latitude', 'Longitude', 'Round', 'GW Depth (mbgl)', 'District'].map((h) => (
                    <th key={h} className="whitespace-nowrap py-2 pr-4 font-semibold text-neutral-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-neutral-900">{row.date}</td>
                    <td className="whitespace-nowrap py-2 pr-4 font-medium text-neutral-900">{row.location || row.block}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-neutral-600">{row.latitude?.toFixed(4) ?? '—'}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-neutral-600">{row.longitude?.toFixed(4) ?? '—'}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-neutral-600">
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold uppercase">
                        {row.measurement || row.season}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 font-bold text-primary-700">
                      {(row.groundwater_level_m_bgl ?? row.groundwater_level_m)?.toFixed(2)} mbgl
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-neutral-500">{row.district || 'Ludhiana'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Scientific Provenance:</strong> The dataset comprises 1,809 actual observational records collected from CGWB monitoring wells across Ludhiana district from 1994 to 2025.
        Duplicate station/date readings are averaged to preserve valid well measurements without data loss. No synthetic groundwater values or fabricated rainfall/crop variables are introduced.
      </div>
    </div>
  );
}

const SCHEMA = [
  { name: 'state', type: 'string', desc: 'State name (Punjab)' },
  { name: 'district', type: 'string', desc: 'District name (Ludhiana)' },
  { name: 'location', type: 'string', desc: 'Station location or village name' },
  { name: 'latitude', type: 'float', desc: 'Station GPS latitude coordinate' },
  { name: 'longitude', type: 'float', desc: 'Station GPS longitude coordinate' },
  { name: 'date', type: 'string', desc: 'Observation date (YYYY-MM-DD)' },
  { name: 'groundwater_level_m_bgl', type: 'float', desc: 'Observed groundwater depth in meters below ground level (mbgl)' },
  { name: 'measurement', type: 'string', desc: 'Observation round: pre (Pre-Monsoon, May) or jan (Winter, January)' },
];

function StatCard({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      {Icon && (
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
          <Icon size={16} />
        </div>
      )}
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}
