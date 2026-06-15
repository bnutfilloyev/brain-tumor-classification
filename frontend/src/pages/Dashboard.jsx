import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Users, Layers, ScanLine, Target } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Metrics } from "../lib/api";
import { PageHeader, StatCard, Spinner } from "../components/ui";
import { CLASS_COLORS, CLASS_BADGE, fmtDate } from "../lib/constants";

export default function Dashboard() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [perf, setPerf] = useState(null);

  useEffect(() => {
    Metrics.overview().then(setOverview).catch(() => {});
    Metrics.performance().then(setPerf).catch(() => {});
  }, []);

  if (!overview) return <Spinner label={t("common.loading")} />;

  const dist = Object.entries(overview.class_distribution || {}).map(
    ([name, value]) => ({ name, value })
  );
  const distTotal = dist.reduce((a, b) => a + b.value, 0) || 1;

  const activity = overview.daily_activity || [];
  const actTotal = activity.reduce((a, b) => a + b.count, 0);
  const actAvg = activity.length ? actTotal / activity.length : 0;
  const actPeak = activity.reduce((a, b) => Math.max(a, b.count), 0);
  const fmtDay = (d) => (d ? d.slice(5).replace("-", "/") : "");

  return (
    <>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label={t("dashboard.totalPatients")} countUp={overview.total_patients} accent="brand" />
        <StatCard icon={Layers} label={t("dashboard.totalStudies")} countUp={overview.total_studies} accent="indigo" />
        <StatCard icon={ScanLine} label={t("dashboard.totalPredictions")} countUp={overview.total_predictions} accent="amber" />
        {perf ? (
          <StatCard icon={Target} label={t("dashboard.avgConfidence")} countUp={perf.accuracy * 100} suffix="%" decimals={1} accent="emerald" />
        ) : (
          <StatCard icon={Target} label={t("dashboard.avgConfidence")} value="—" accent="emerald" />
        )}
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-slate-800">{t("dashboard.activity")}</h3>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-lg font-extrabold text-slate-800">{actTotal}</div>
              <div className="text-[11px] text-slate-400">{t("dashboard.total")}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-brand-600">{actAvg.toFixed(1)}</div>
              <div className="text-[11px] text-slate-400">{t("dashboard.avgPerDay")}</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-800">{actPeak}</div>
              <div className="text-[11px] text-slate-400">{t("dashboard.peak")}</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={activity} margin={{ top: 5, right: 12, left: -12 }}>
            <defs>
              <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1ba0a3" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1ba0a3" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={fmtDay} interval={3} tickMargin={8} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
            <Tooltip
              labelFormatter={(d) => fmtDate(d)}
              formatter={(v) => [v, t("dashboard.totalPredictions")]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <ReferenceLine y={actAvg} stroke="#94a3b8" strokeDasharray="5 4"
              label={{ value: `avg ${actAvg.toFixed(0)}`, position: "right", fontSize: 10, fill: "#94a3b8" }} />
            <Area type="monotone" dataKey="count" stroke="#0f7d82" strokeWidth={2.5}
              fill="url(#actGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-4">{t("dashboard.classDistribution")}</h3>
          {dist.length === 0 ? (
            <p className="text-slate-400 text-sm py-10 text-center">{t("common.noData")}</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dist} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}
                      paddingAngle={3} stroke="none">
                      {dist.map((d) => (
                        <Cell key={d.name} fill={CLASS_COLORS[d.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [`${v} (${((v / distTotal) * 100).toFixed(1)}%)`, n]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-slate-800 leading-none">{distTotal}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{t("dashboard.totalPredictions")}</div>
                  </div>
                </div>
              </div>
              <div className="w-full flex-1 space-y-2.5">
                {dist.slice().sort((a, b) => b.value - a.value).map((d) => {
                  const pct = (d.value / distTotal) * 100;
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_COLORS[d.name] }} />
                          <span className="text-slate-600">{d.name}</span>
                        </span>
                        <span className="text-slate-400">
                          <b className="text-slate-700">{d.value}</b> · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CLASS_COLORS[d.name] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">{t("dashboard.recent")}</h3>
            <Link to="/patients" className="text-sm font-semibold text-brand-600">
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="space-y-2">
            {(overview.recent_predictions || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  {p.image_path ? (
                    <img src={p.image_path} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-slate-100" />
                  )}
                  <div>
                    <div className="font-medium text-slate-700 text-sm">{p.patient_name || "—"}</div>
                    <div className="text-xs text-slate-400">{fmtDate(p.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${CLASS_BADGE[p.class_name] || "bg-slate-100 text-slate-600"}`}>
                    {p.class_name}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 w-14 text-right">
                    {p.confidence?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
            {(overview.recent_predictions || []).length === 0 && (
              <p className="text-slate-400 text-sm py-8 text-center">{t("common.noData")}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
