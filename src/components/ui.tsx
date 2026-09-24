import { Droplets } from 'lucide-react';

export function WaterBackground({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ opacity }}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        <defs>
          <pattern id="water-pattern" height="80" patternUnits="userSpaceOnUse" width="80" x="0" y="0">
            <path d="M0 40 Q20 20 40 40 T80 40" fill="none" stroke="#237a47" strokeWidth="1" />
            <path d="M0 55 Q20 35 40 55 T80 55" fill="none" stroke="#237a47" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect fill="url(#water-pattern)" height="100%" width="100%" />
      </svg>
    </div>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm"
        style={{ width: size, height: size }}
      >
        <Droplets size={size * 0.6} />
      </div>
      <span className="font-bold tracking-tight text-primary-900" style={{ fontSize: size * 0.5 }}>
        GW Forecast
      </span>
    </div>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Low: 'bg-green-100 text-green-800 border-green-300',
    Moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    High: 'bg-orange-100 text-orange-800 border-orange-300',
    Critical: 'bg-red-100 text-red-800 border-red-300',
  };
  const cls = colors[level] || colors['Moderate'];
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}>
      {level} Risk
    </span>
  );
}

export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function DataLabel({ label, value, tag }: { label: string; value: React.ReactNode; tag?: 'OBSERVED' | 'FORECAST' | 'ADVISORY' }) {
  const tagColors: Record<string, string> = {
    OBSERVED: 'bg-blue-100 text-blue-700',
    FORECAST: 'bg-amber-100 text-amber-700',
    ADVISORY: 'bg-purple-100 text-purple-700',
  };
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
        {tag && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tagColors[tag]}`}>{tag}</span>}
      </div>
      <span className="text-lg font-bold text-neutral-900">{value}</span>
    </div>
  );
}
