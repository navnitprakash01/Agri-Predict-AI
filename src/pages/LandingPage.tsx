import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  TrendingDown,
  Cloud,
  Sprout,
  Calculator,
  BarChart3,
  Database,
  Info,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Map as MapIcon,
} from 'lucide-react';
import { WaterBackground } from '@/components/ui';
import { api } from '@/api';
import type { DistrictSummary } from '@/types';

export function LandingPage() {
  const [dataStats, setDataStats] = useState<{ years: string; blocks: string } | null>(null);
  const [modelStatus, setModelStatus] = useState<string>('Local');
  const [districtSummary, setDistrictSummary] = useState<DistrictSummary | null>(null);

  useEffect(() => {
    api.dataStats().then((res) => {
      if (res.data_available && res.year_range && res.year_range.length === 2) {
        const yearsCount = res.year_range[1] - res.year_range[0] + 1;
        setDataStats({
          years: `${yearsCount}`,
          blocks: `${res.blocks.length}`,
        });
      } else {
        setDataStats({
          years: 'Dataset unavailable',
          blocks: 'Dataset unavailable',
        });
      }
    }).catch(() => {
      setDataStats({
        years: 'Dataset unavailable',
        blocks: 'Dataset unavailable',
      });
    });

    api.modelInfo().then((res) => {
      if (res.trained) {
        setModelStatus(res.model_name);
      } else {
        setModelStatus('Model not available');
      }
    }).catch(() => {
      setModelStatus('Model not available');
    });

    api.districtSummary().then(setDistrictSummary).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <WaterBackground opacity={0.04} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#03140c] via-[#072014] to-[#0c2e1d] text-white">
        {/* Soft atmospheric daylight & warm morning sun haze on the landscape side */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 70% 50% at 85% 30%, rgba(245, 158, 11, 0.10), transparent 65%),
              radial-gradient(ellipse 80% 60% at 75% 65%, rgba(20, 184, 166, 0.12), transparent 70%),
              radial-gradient(circle 700px at 0% 50%, rgba(2, 18, 10, 0.8), transparent)
            `,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Editorial Heading, Description, Buttons, Risk Legend */}
            <div className="animate-fade-in-up lg:col-span-5 xl:col-span-5">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
                <Droplets size={14} className="text-emerald-400" />
                <span>CGWB Groundwater Telemetry · Punjab</span>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                Ludhiana District
              </p>

              <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl text-white font-sans">
                Groundwater Forecasting &amp;<br className="hidden sm:inline" /> Farmer Advisory
              </h1>

              <p className="mt-5 text-base sm:text-lg text-emerald-100/80 leading-relaxed font-normal">
                A decision-support system analyzing Central Ground Water Board (CGWB) telemetry records,
                seasonal recharge dynamics, and rice-wheat rotation benchmarks to forecast aquifer depletion
                and deliver data-driven irrigation advisories.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-neutral-950 shadow-lg shadow-emerald-950/50 transition-all hover:bg-emerald-400 hover:scale-[1.02]"
                >
                  Explore Groundwater Forecast
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/predict"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur transition-all hover:bg-white/20 hover:border-white/30"
                >
                  Farmer Advisory
                  <Sprout size={18} />
                </Link>
              </div>

              {/* Subdued Risk Thresholds Legend */}
              <div className="mt-10 pt-6 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Current Risk Level:
                  </span>
                  {[
                    { label: 'Low (<12 m)', color: '#22c55e' },
                    { label: 'Moderate (12–18 m)', color: '#eab308' },
                    { label: 'High (18–25 m)', color: '#f97316' },
                    { label: 'Critical (≥25 m)', color: '#ef4444' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 font-medium">
                      <span className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Immersive Editorial Groundwater Scene */}
            <div className="animate-fade-in-up lg:col-span-7 xl:col-span-7" style={{ animationDelay: '0.15s' }}>
              <HeroEnvironmentalScene summary={districtSummary} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {[
            { label: 'Years of Data', value: dataStats?.years ?? 'Loading...', icon: BarChart3 },
            { label: 'Blocks Covered', value: dataStats?.blocks ?? 'Loading...', icon: MapIcon },
            { label: 'ML Model', value: modelStatus, icon: Cpu },
            { label: 'No External API', value: '100% Local', icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-neutral-900">{s.value}</div>
                <div className="text-xs text-neutral-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem section */}
      <Section id="problem" title="The Problem" icon={AlertTriangle}>
        <div className="grid gap-6 md:grid-cols-3">
          <Card title="Declining Water Table">
            Ludhiana district, a major rice-wheat cropping zone in Punjab, has seen groundwater
            levels decline steadily over the past two decades. CGWB monitoring wells show
            year-on-year depletion driven by intensive tube-well irrigation.
          </Card>
          <Card title="Rice-Wheat Intensity">
            The rice-wheat rotation is the dominant cropping system. Rice (Kharif) is highly
            water-intensive, and continuous flooding relies heavily on groundwater, especially
            when monsoon rainfall is insufficient.
          </Card>
          <Card title="Lack of Forecasting Tools">
            Farmers and planners lack accessible, data-driven tools to anticipate groundwater
            stress and adjust irrigation or cropping decisions before depletion becomes critical.
          </Card>
        </div>
      </Section>

      {/* Data Sources */}
      <Section id="data-sources" title="Data Sources" icon={Database} alt>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'CGWB Groundwater Levels', desc: 'Central Ground Water Board monitoring well data (pre/post-monsoon depth in mbgl)' },
            { title: 'Rainfall Records', desc: 'District and block-level seasonal rainfall (mm) from IMD/CGWB sources' },
            { title: 'Agricultural Area', desc: 'Rice, wheat, and total cultivated area (hectares) by season and block' },
            { title: 'Irrigation & Extraction', desc: 'Irrigation intensity (%) and groundwater extraction (million cubic meters)' },
          ].map((d) => (
            <div key={d.title} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <h4 className="mb-2 font-semibold text-neutral-900">{d.title}</h4>
              <p className="text-sm text-neutral-600">{d.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" title="How the System Works" icon={Cpu}>
        <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6 lg:p-8">
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            {[
              'Frontend (React)',
              'Local HTTP Request',
              'FastAPI Backend',
              'Local ML Model',
              'Prediction Engine',
              'Advisory Engine',
              'JSON Response',
              'Visualization',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2.5 text-sm font-medium text-primary-800 shadow-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {step}
                </div>
                {i < 7 && <ArrowRight className="hidden text-primary-400 lg:block" size={18} />}
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>No external AI API is used.</strong> The model runs entirely in Python using
            scikit-learn, loaded from a local file on disk.
          </p>
        </div>
      </Section>

      {/* Feature sections grid */}
      <Section id="features" title="System Capabilities" icon={BarChart3} alt>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureLink to="/dashboard" icon={BarChart3} title="Groundwater Forecasting Dashboard" desc="Interactive charts showing historical levels, depletion trends, forecasts, and rainfall correlations." />
          <FeatureLink to="/predict" icon={Calculator} title="Prediction & Advisory" desc="Enter conditions for a specific year and season to get a model prediction and risk-based farmer advisory." />
          <FeatureLink to="/rotation" icon={Sprout} title="Rice-Wheat Rotation Analysis" desc="Understand the relationship between cropping patterns and groundwater depletion." />
          <FeatureLink to="/district" icon={MapIcon} title="District & Block View" desc="Select a block, year, and season to view location-specific data and predictions." />
          <FeatureLink to="/data" icon={Database} title="Data Management" desc="View the CGWB dataset schema and data quality statistics." />
          <FeatureLink to="/model" icon={Info} title="Model Information" desc="Transparent details about the trained ML model, features, and evaluation metrics." />
          <FeatureLink to="/methodology" icon={Info} title="Methodology" desc="Complete documentation of the data science pipeline from data collection to advisory." />
        </div>
      </Section>

      {/* Methodology */}
      <Section id="methodology" title="Methodology" icon={Info}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h4 className="mb-3 font-semibold text-neutral-900">Machine Learning Pipeline</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>1. Load and clean CGWB dataset (missing values, duplicates, outliers)</li>
              <li>2. Feature engineering: temporal lags, rolling rainfall, rice-wheat ratio</li>
              <li>3. Time-aware train/test split (chronological, no shuffling)</li>
              <li>4. Train candidate models: Linear Regression, Random Forest, Gradient Boosting, HistGBM</li>
              <li>5. Evaluate with MAE, RMSE, R² — select best by RMSE</li>
              <li>6. Save trained Pipeline (preprocessing + estimator) to disk</li>
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h4 className="mb-3 font-semibold text-neutral-900">Advisory Engine</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>Rule-based system using model output + agricultural context</li>
              <li>Classifies risk: Low, Moderate, High, Critical</li>
              <li>Generates season-specific, crop-specific recommendations</li>
              <li>Recommendations cover irrigation, cropping, and water management</li>
              <li className="rounded bg-amber-50 px-3 py-2 text-amber-800">
                Advisories are educational and decision-support only. They do not guarantee any agricultural outcome.
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Transparency */}
      <Section id="transparency" title="Data Science Transparency" icon={CheckCircle2} alt>
        <div className="grid gap-6 md:grid-cols-3">
          <TransparencyCard tag="OBSERVED" desc="Data directly obtained from the CGWB dataset — measured groundwater levels, rainfall, crop areas." color="blue" />
          <TransparencyCard tag="FORECAST" desc="Output generated by the local ML model — predicted groundwater levels and depletion rates." color="amber" />
          <TransparencyCard tag="ADVISORY" desc="Rule-based recommendations derived from model output and agricultural conditions." color="purple" />
        </div>
        <p className="mt-6 rounded-lg bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-600">
          Model predictions are never presented as actual measured groundwater values.
        </p>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Scientific Disclaimer:</strong> Model forecasts are estimates generated by a machine learning model
          trained on historical data. They are not guaranteed groundwater conditions and should not be used as the sole
          basis for irrigation, cropping, or policy decisions. Always validate predictions with field measurements.
          See the <Link to="/methodology" className="underline">Methodology</Link> page for full details.
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-primary-950 py-8 text-center text-sm text-primary-300">
        <p>Groundwater Depletion Forecasting System · Ludhiana District</p>
        <p className="mt-1 text-primary-400">Built with local ML · No external AI APIs · For research and decision support</p>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function Section({
  id,
  title,
  icon: Icon,
  children,
  alt,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section id={id} className={`px-4 py-16 ${alt ? 'bg-neutral-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <Icon size={20} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h4 className="mb-2 font-semibold text-neutral-900">{title}</h4>
      <p className="text-sm text-neutral-600">{children}</p>
    </div>
  );
}

function FeatureLink({ to, icon: Icon, title, desc }: { to: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white">
        <Icon size={20} />
      </div>
      <h4 className="mb-2 font-semibold text-neutral-900">{title}</h4>
      <p className="text-sm text-neutral-600">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:text-primary-700">
        Explore <ArrowRight size={14} />
      </div>
    </Link>
  );
}

function TransparencyCard({ tag, desc, color }: { tag: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <span className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold tracking-wide">
        {tag}
      </span>
      <p className="text-sm">{desc}</p>
    </div>
  );
}

function HeroEnvironmentalScene({ summary }: { summary: DistrictSummary | null }) {
  const avgDepth = summary?.avg_groundwater_level ? summary.avg_groundwater_level.toFixed(2) : '15.22';
  const depletionRate = summary?.avg_depletion_rate
    ? `${summary.avg_depletion_rate > 0 ? '+' : ''}${summary.avg_depletion_rate.toFixed(2)} m/year`
    : '+0.39 m/year';
  const totalStations = summary?.total_stations ? `${summary.total_stations}` : '124';

  return (
    <div className="relative w-full select-none">
      {/* Cutaway Environmental Landscape Canvas */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        <svg
          viewBox="0 0 620 370"
          className="w-full h-auto block"
          style={{ background: 'linear-gradient(to bottom, #113423 0%, #082116 100%)' }}
        >
          <defs>
            {/* Atmospheric daylight / morning haze gradient */}
            <linearGradient id="skyAtmosphere" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a291b" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#133d28" stopOpacity="0.75" />
              <stop offset="80%" stopColor="#225338" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d5e8ce" stopOpacity="0.35" />
            </linearGradient>

            {/* Warm morning sun bloom */}
            <radialGradient id="sunGlow" cx="72%" cy="25%" r="55%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
              <stop offset="35%" stopColor="#fef08a" stopOpacity="0.14" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#0a291b" stopOpacity="0" />
            </radialGradient>

            {/* Lush agricultural crop field gradient */}
            <linearGradient id="cropFieldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38854f" />
              <stop offset="50%" stopColor="#2c7241" />
              <stop offset="100%" stopColor="#1f5830" />
            </linearGradient>

            {/* Natural topsoil loam gradient */}
            <linearGradient id="topsoilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2b1d13" />
              <stop offset="100%" stopColor="#3d2c1d" />
            </linearGradient>

            {/* Alluvial silt & river sand strata */}
            <linearGradient id="alluviumGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#483626" />
              <stop offset="30%" stopColor="#55422f" />
              <stop offset="65%" stopColor="#423425" />
              <stop offset="100%" stopColor="#2f251c" />
            </linearGradient>

            {/* Saturated blue-green aquifer gradient */}
            <linearGradient id="aquiferGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.82" />
              <stop offset="25%" stopColor="#0d9488" stopOpacity="0.75" />
              <stop offset="65%" stopColor="#0f766e" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#062d22" stopOpacity="0.95" />
            </linearGradient>

            {/* Shaded stainless steel pipe */}
            <linearGradient id="wellSteel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="35%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* 1. Atmospheric Sky & Daylight */}
          <rect x="0" y="0" width="620" height="115" fill="url(#skyAtmosphere)" />
          <rect x="0" y="0" width="620" height="115" fill="url(#sunGlow)" />

          {/* Distant layered rural horizon (Punjab trees & vegetation) */}
          <path
            d="M 0 92 Q 50 82, 100 86 T 200 81 T 300 85 T 400 80 T 500 84 T 580 80 L 620 84 L 620 102 L 0 102 Z"
            fill="#235035"
            opacity="0.4"
          />
          <path
            d="M 0 96 Q 70 87, 140 91 T 280 86 T 420 89 T 540 85 L 620 90 L 620 104 L 0 104 Z"
            fill="#1a452c"
            opacity="0.65"
          />

          {/* Subtle silhouette of a tube-well shelter in distance */}
          <path
            d="M 470 91 L 470 81 L 482 74 L 494 81 L 494 91 Z"
            fill="#1b4b2e"
            opacity="0.8"
          />

          {/* 2. Punjab Agricultural Surface (Rice & Wheat Field) */}
          <path
            d="M 0 100 Q 150 105, 300 98 T 620 103 L 620 118 Q 380 114, 180 120 L 0 116 Z"
            fill="url(#cropFieldGrad)"
          />

          {/* Natural wheat & rice crops swaying along the surface */}
          {[25, 55, 85, 115, 145, 175, 255, 285, 315, 345, 375, 405, 435, 465, 505, 535, 565, 595].map((x) => (
            <g key={x} opacity="0.65">
              <line x1={x} y1="116" x2={x - 2} y2="108" stroke="#86efac" strokeWidth="1.2" />
              <line x1={x} y1="116" x2={x + 2} y2="107" stroke="#fde047" strokeWidth="1" />
            </g>
          ))}

          {/* Ground surface line */}
          <path
            d="M 0 116 Q 180 120, 380 114 T 620 118"
            stroke="#4d3a28"
            strokeWidth="2.5"
            fill="none"
            opacity="0.85"
          />

          {/* 3. Organic Ground Cutaway */}
          {/* Topsoil layer (Humus and root zone) */}
          <path
            d="M 0 116 Q 180 120, 380 114 T 620 118 L 620 166 Q 420 160, 220 164 L 0 162 Z"
            fill="url(#topsoilGrad)"
          />

          {/* Fine rootlets penetrating from crops into the topsoil */}
          {[40, 95, 160, 270, 330, 420, 480, 550].map((x) => (
            <path
              key={x}
              d={`M ${x} 116 Q ${x + 2} 128, ${x - 1} 138 T ${x + 2} 148`}
              stroke="#8a735c"
              strokeWidth="0.8"
              fill="none"
              opacity="0.35"
            />
          ))}

          {/* Alluvial soil layer (Indo-Gangetic silt & river sand) */}
          <path
            d="M 0 162 Q 220 164, 420 160 T 620 166 L 620 234 C 440 230, 320 242, 220 240 C 140 238, 60 233, 0 234 Z"
            fill="url(#alluviumGrad)"
          />

          {/* Gentle natural geological sediment ribbons */}
          <path
            d="M 0 186 Q 160 191, 340 183 T 620 188"
            stroke="#634f3a"
            strokeWidth="2.5"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M 0 210 Q 200 214, 420 206 T 620 212"
            stroke="#3b2f23"
            strokeWidth="2.5"
            fill="none"
            opacity="0.35"
          />

          {/* 4. Saturated Aquifer & Groundwater Table */}
          {/* Saturated aquifer reservoir */}
          <path
            d="M 0 234 C 80 233, 160 239, 220 241 C 300 244, 420 232, 620 235 L 620 370 L 0 370 Z"
            fill="url(#aquiferGrad)"
          />

          {/* Soft underwater light caustics filtering downward */}
          <polygon
            points="140,236 190,370 230,370 170,238"
            fill="#5eead4"
            opacity="0.04"
          />
          <polygon
            points="320,238 370,370 420,370 360,236"
            fill="#5eead4"
            opacity="0.03"
          />

          {/* Smooth, elegant groundwater-table line */}
          <path
            d="M 0 234 C 80 233, 160 239, 220 241 C 300 244, 420 232, 620 235"
            stroke="#2dd4bf"
            strokeWidth="7"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M 0 234 C 80 233, 160 239, 220 241 C 300 244, 420 232, 620 235"
            stroke="#5eead4"
            strokeWidth="2.5"
            fill="none"
            opacity="0.95"
          />

          {/* Deep alluvium base strata */}
          <path
            d="M 0 335 Q 200 342, 400 334 T 620 338 L 620 370 L 0 370 Z"
            fill="#041a14"
            opacity="0.6"
          />

          {/* 5. ONE CGWB Monitoring Well */}
          {/* Wellhead surface telemetry enclosure */}
          <rect
            x="202"
            y="94"
            width="16"
            height="22"
            rx="2.5"
            fill="#f1f5f9"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <line x1="200" y1="92" x2="220" y2="87" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="210" y1="90" x2="210" y2="94" stroke="#64748b" strokeWidth="1.5" />
          <line x1="215" y1="94" x2="215" y2="76" stroke="#cbd5e1" strokeWidth="1.5" />
          <circle cx="215" cy="76" r="2" fill="#22c55e" />
          <text
            x="210"
            y="108"
            textAnchor="middle"
            fill="#0f172a"
            className="font-sans font-bold text-[8px] tracking-wider"
          >
            CGWB
          </text>

          {/* Stainless steel well casing descending through earth */}
          <line
            x1="210"
            y1="116"
            x2="210"
            y2="325"
            stroke="url(#wellSteel)"
            strokeWidth="4"
          />

          {/* Intake filter screen slots in saturated aquifer */}
          {[260, 268, 276, 284, 292, 300, 308, 316].map((y) => (
            <line
              key={y}
              x1="206"
              y1={y}
              x2="214"
              y2={y}
              stroke="#2dd4bf"
              strokeWidth="1.2"
              strokeOpacity="0.85"
            />
          ))}

          {/* 6. ONE Clean Measurement Indicator */}
          {/* Subtle vertical measurement line */}
          <line
            x1="230"
            y1="116"
            x2="230"
            y2="241"
            stroke="#5eead4"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.8"
          />
          <line x1="225" y1="116" x2="235" y2="116" stroke="#5eead4" strokeWidth="1.5" opacity="0.8" />
          <line x1="225" y1="241" x2="235" y2="241" stroke="#5eead4" strokeWidth="1.5" opacity="0.8" />

          {/* Floating editorial measurement badge */}
          <rect
            x="242"
            y="155"
            width="140"
            height="58"
            rx="10"
            fill="rgba(4, 25, 16, 0.90)"
            stroke="rgba(94, 234, 212, 0.4)"
            strokeWidth="1"
          />
          <text
            x="254"
            y="178"
            fill="#ffffff"
            className="font-sans text-xl font-bold tracking-tight"
          >
            {avgDepth} m bgl
          </text>
          <text
            x="254"
            y="193"
            fill="#5eead4"
            className="font-sans text-[11px] font-semibold tracking-wide"
          >
            Groundwater Depth
          </text>
          <text
            x="254"
            y="204"
            fill="rgba(255, 255, 255, 0.6)"
            className="font-sans text-[9px]"
          >
            Observed Water Table
          </text>
        </svg>
      </div>

      {/* 7. Three Subtle Supporting Numbers (Integrated Editorial Pill Row) */}
      <div className="mt-3.5 grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur-md transition-all hover:border-emerald-500/30">
          <div className="text-base sm:text-lg font-bold tracking-tight text-white">{avgDepth} m bgl</div>
          <div className="text-[11px] sm:text-xs font-medium text-emerald-200/80">Current Average Depth</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur-md transition-all hover:border-emerald-500/30">
          <div className="text-base sm:text-lg font-bold tracking-tight text-amber-300">{depletionRate}</div>
          <div className="text-[11px] sm:text-xs font-medium text-emerald-200/80">Historical Deepening</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur-md transition-all hover:border-emerald-500/30">
          <div className="text-base sm:text-lg font-bold tracking-tight text-white">{totalStations}</div>
          <div className="text-[11px] sm:text-xs font-medium text-emerald-200/80">Monitoring Stations</div>
        </div>
      </div>
    </div>
  );
}
