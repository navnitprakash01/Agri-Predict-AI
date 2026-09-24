import { useState, useEffect } from 'react';
import { Info, Cpu, Database, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '@/api';
import type { ModelInfo } from '@/types';
import { LoadingSpinner, ErrorBanner } from '@/components/ui';

export function ModelInfoPage() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.modelInfo()
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load model info'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading model information..." />;
  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorBanner message={error} /></div>;
  if (!info) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Model Information</h1>
        <p className="mt-1 text-neutral-600">Transparent details about the trained ML model, features, and evaluation metrics</p>
      </div>

      {/* Status banner */}
      <div className={`mb-8 rounded-2xl border p-6 ${info.trained ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <div className="flex items-center gap-3">
          {info.trained ? (
            <CheckCircle2 className="text-green-600" size={28} />
          ) : (
            <AlertTriangle className="text-orange-600" size={28} />
          )}
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {info.trained ? `Model: ${info.model_name}` : 'Model Not Trained'}
            </h2>
            <p className="text-sm text-neutral-600">
              {info.trained
                ? `Trained on ${info.n_observations} observations from ${info.training_period}`
                : info.message}
            </p>
          </div>
        </div>
      </div>

      {!info.trained && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 font-semibold text-neutral-900">How to train the model</h3>
          <ol className="list-inside list-decimal space-y-1 text-sm text-neutral-600">
            <li>Navigate to the backend directory: <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">cd backend</code></li>
            <li>Install dependencies: <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">pip install -r requirements.txt</code></li>
            <li>Place CGWB data at <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">data/cgwb_data.csv</code></li>
            <li>Run training: <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">python ml/train_model.py</code></li>
          </ol>
        </div>
      )}

      {info.trained && (
        <div className="space-y-6">
          {/* Metrics */}
          {info.metrics && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <TrendingUp size={20} className="text-primary-600" />
                Evaluation Metrics
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="MAE" value={info.metrics.mae.toFixed(4)} desc="Mean Absolute Error (m)" />
                <MetricCard label="RMSE" value={info.metrics.rmse.toFixed(4)} desc="Root Mean Squared Error (m)" />
                <MetricCard label="R²" value={info.metrics.r2.toFixed(4)} desc="Coefficient of Determination" />
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Metrics are computed on the held-out test set (most recent 20% of years). They reflect the model's
                ability to predict groundwater levels on unseen future data.
              </p>
            </div>
          )}

          {/* All model comparison */}
          {info.all_results && Object.keys(info.all_results).length > 1 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <Cpu size={20} className="text-primary-600" />
                Model Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left">
                      <th className="py-2 pr-4 font-semibold text-neutral-700">Model</th>
                      <th className="py-2 pr-4 font-semibold text-neutral-700">MAE</th>
                      <th className="py-2 pr-4 font-semibold text-neutral-700">RMSE</th>
                      <th className="py-2 pr-4 font-semibold text-neutral-700">R²</th>
                      <th className="py-2 pr-4 font-semibold text-neutral-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(info.all_results).map(([name, m]) => (
                      <tr key={name} className="border-b border-neutral-50">
                        <td className="py-2 pr-4 font-medium text-neutral-900">{name}</td>
                        <td className="py-2 pr-4 text-neutral-600">{m.mae.toFixed(4)}</td>
                        <td className="py-2 pr-4 text-neutral-600">{m.rmse.toFixed(4)}</td>
                        <td className="py-2 pr-4 text-neutral-600">{m.r2.toFixed(4)}</td>
                        <td className="py-2 pr-4">
                          {name === info.model_name ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 size={12} /> Selected
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <Info size={20} className="text-primary-600" />
                Training Details
              </h2>
              <dl className="space-y-2 text-sm">
                <DetailRow label="Model Name" value={info.model_name} />
                <DetailRow label="Training Period" value={info.training_period || '—'} />
                {info.test_period && <DetailRow label="Test Period" value={info.test_period} />}
                <DetailRow label="Target Variable" value={info.target || '—'} />
                <DetailRow label="Total Observations" value={info.n_observations?.toString() || '—'} />
                {info.n_train != null && <DetailRow label="Training Rows" value={info.n_train.toString()} />}
                {info.n_test != null && <DetailRow label="Test Rows" value={info.n_test.toString()} />}
                <DetailRow label="Validation Method" value={info.validation_method || '—'} />
                {info.trained_at && <DetailRow label="Trained At" value={new Date(info.trained_at).toLocaleString()} />}
              </dl>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900">
                <Database size={20} className="text-primary-600" />
                Features Used
              </h2>
              <div className="flex flex-wrap gap-2">
                {info.features?.map((f) => (
                  <span key={f} className="rounded-lg bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Architecture note */}
          <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6">
            <h2 className="mb-2 text-lg font-semibold text-primary-900">Architecture</h2>
            <p className="text-sm text-neutral-700">
              The model is a scikit-learn Pipeline (StandardScaler + estimator) saved locally as
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">models/groundwater_model.joblib</code>.
              All inference happens in Python — no external AI API is called at any point.
              To replace the model, simply retrain with <code className="rounded bg-white px-1.5 py-0.5 text-xs">python ml/train_model.py</code>
              or replace the joblib file directly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
      <div className="text-3xl font-bold text-primary-700">{value}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-900">{label}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{desc}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
