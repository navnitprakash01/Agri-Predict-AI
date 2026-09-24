import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  Sprout,
  Map,
  Database,
  Info,
  FlaskConical,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui';
import { api } from '@/api';
import type { HealthStatus } from '@/types';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/predict', label: 'Prediction', icon: Calculator },
  { path: '/rotation', label: 'Rice-Wheat Rotation', icon: Sprout },
  { path: '/district', label: 'District View', icon: Map },
  { path: '/data', label: 'Data Management', icon: Database },
  { path: '/model', label: 'Model Info', icon: Info },
  { path: '/methodology', label: 'Methodology', icon: FlaskConical },
];

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-primary-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" onClick={() => setMobileOpen(false)}>
          <Logo size={36} />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <StatusDot
            ok={health?.status === 'healthy' || health?.status === 'degraded'}
            label={health ? 'Backend Online' : 'Backend Offline'}
            okColor="bg-green-500"
            okBg="bg-green-50 text-green-700"
            warnBg="bg-neutral-100 text-neutral-500"
          />
          <StatusDot
            ok={health?.model_loaded ?? false}
            label={health?.model_loaded ? 'Model Loaded' : 'Model Not Loaded'}
            okColor="bg-green-500"
            okBg="bg-green-50 text-green-700"
            warnBg="bg-orange-50 text-orange-700"
          />
          <StatusDot
            ok={health?.dataset_available ?? false}
            label={health?.dataset_available ? 'Dataset Loaded' : 'Dataset Not Loaded'}
            okColor="bg-green-500"
            okBg="bg-green-50 text-green-700"
            warnBg="bg-orange-50 text-orange-700"
          />
        </div>

        <button
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-primary-100 bg-white px-4 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? 'bg-primary-100 text-primary-800' : 'text-neutral-600'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

function StatusDot({
  ok,
  label,
  okColor,
  okBg,
  warnBg,
}: {
  ok: boolean;
  label: string;
  okColor: string;
  okBg: string;
  warnBg: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? okBg : warnBg
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${ok ? okColor : 'bg-neutral-400'}`} />
      {label}
    </div>
  );
}
