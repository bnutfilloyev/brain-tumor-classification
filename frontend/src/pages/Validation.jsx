import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ComposedChart, Line, Area, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
  ReferenceLine, ReferenceArea,
} from "recharts";
import { Metrics } from "../lib/api";
import { PageHeader, StatCard, Spinner, EmptyState } from "../components/ui";
import { CLASS_BADGE } from "../lib/constants";
import { Repeat, Crosshair, AlertTriangle, Boxes, ArrowRight, Sigma } from "lucide-react";

const STRATEGY_COLOR = {
  "From scratch": "#94a3b8",
  "Transfer (feature extraction)": "#38bdf8",
  "Transfer (fine-tuned)": "#137f84",
};
const STRATEGY_BADGE = {
  "From scratch": "bg-slate-100 text-slate-600",
  "Transfer (feature extraction)": "bg-sky-50 text-sky-700",
  "Transfer (fine-tuned)": "bg-brand-50 text-brand-700",
};

/* ---------------- Cross-validation ---------------- */
function CVSection({ cv, t }) {
  if (!cv) return null;
  const data = cv.folds.map((f) => ({
    name: `${f.fold}`,
    Accuracy: +(f.accuracy * 100).toFixed(1),
    "Macro F1": +(f.macro_f1 * 100).toFixed(1),
  }));
  const mean = cv.mean.accuracy * 100;
  const std = cv.std.accuracy * 100;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Repeat size={17} className="text-brand-500" /> {t("validation.cvTitle")}
        </h3>
        <span className="badge bg-brand-50 text-brand-700">k = {cv.k}</span>
      </div>
      <p className="text-xs text-slate-400 mb-5">{cv.model} · {t("validation.cvHint")}</p>

      <div className="flex items-end gap-6 mb-5">
        <div>
          <div className="text-3xl font-extrabold text-slate-800 leading-none">
            {mean.toFixed(1)}<span className="text-lg text-slate-400">%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t("validation.meanAcc")} <span className="text-brand-600 font-semibold">± {std.toFixed(1)}</span>
          </div>
        </div>
        <div className="border-l border-slate-100 pl-6">
          <div className="text-3xl font-extrabold text-slate-800 leading-none">
            {(cv.mean.macro_f1 * 100).toFixed(1)}<span className="text-lg text-slate-400">%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t("validation.meanF1")} <span className="text-indigo-500 font-semibold">± {(cv.std.macro_f1 * 100).toFixed(1)}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 14, right: 14, left: -8 }}>
          <defs>
            <linearGradient id="cvBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1ba0a3" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#1ba0a3" stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} tickFormatter={(v) => `${t("validation.fold")} ${v}`} />
          <YAxis domain={[80, 100]} allowDataOverflow ticks={[80, 85, 90, 95, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          <Legend />
          {/* ±std band + mean line */}
          <ReferenceArea y1={mean - std} y2={mean + std} fill="url(#cvBand)" stroke="none" />
          <ReferenceLine y={mean} stroke="#137f84" strokeDasharray="5 4"
            label={{ value: `μ ${mean.toFixed(1)}%`, position: "right", fontSize: 10, fill: "#137f84" }} />
          <Bar dataKey="Macro F1" barSize={26} fill="#e0e7ff" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="Accuracy" stroke="#1ba0a3" strokeWidth={2.5}
            dot={{ r: 4, fill: "#1ba0a3", strokeWidth: 0 }} activeDot={{ r: 6 }}>
            <LabelList dataKey="Accuracy" position="top" fontSize={10} fill="#475569" formatter={(v) => `${v}`} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2">{t("validation.cvBand")}</p>
    </div>
  );
}

/* ---------------- Model comparison ---------------- */
function ComparisonSection({ comp, t }) {
  if (!comp) return null;
  const data = comp.models
    .filter((m) => m.accuracy != null)
    .map((m) => ({
      name: m.name.replace(/ \(.*\)/, ""),
      Accuracy: +(m.accuracy * 100).toFixed(1),
      strategy: m.strategy,
      deployed: m.deployed,
    }));

  return (
    <div className="card p-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
        <Boxes size={17} className="text-brand-500" /> {t("validation.compTitle")}
      </h3>
      <p className="text-xs text-slate-400 mb-5">{t("validation.compHint")} · {comp.test_samples} {t("metrics.support").toLowerCase()}</p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 44 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
          <XAxis type="number" domain={[55, 100]} allowDataOverflow tick={{ fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: "#f8fafc" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          <Bar dataKey="Accuracy" radius={[0, 5, 5, 0]} barSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.deployed ? "#0f7d82" : (STRATEGY_COLOR[d.strategy] || "#cbd5e1")} />
            ))}
            <LabelList dataKey="Accuracy" position="right" fontSize={11} fontWeight={600} fill="#475569" formatter={(v) => `${v}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 mb-4 text-xs">
        {Object.entries(STRATEGY_COLOR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} /> {k}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-700" /> {t("validation.deployed")}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/60">
              <th className="px-4 py-2.5 font-medium">{t("validation.model")}</th>
              <th className="px-4 py-2.5 font-medium">{t("validation.strategy")}</th>
              <th className="px-4 py-2.5 font-medium">{t("metrics.accuracy")}</th>
              <th className="px-4 py-2.5 font-medium">{t("metrics.macroF1")}</th>
              <th className="px-4 py-2.5 font-medium">{t("validation.params")}</th>
            </tr>
          </thead>
          <tbody>
            {comp.models.slice().reverse().map((m) => (
              <tr key={m.name} className={`border-t border-slate-50 ${m.deployed ? "bg-brand-50/40" : ""}`}>
                <td className="px-4 py-2.5 font-semibold text-slate-700">
                  {m.name.replace(/ \(.*\)/, "")}
                  {m.deployed && <span className="ml-2 badge bg-brand-100 text-brand-700">{t("validation.deployed")}</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${STRATEGY_BADGE[m.strategy] || "bg-slate-100 text-slate-600"}`}>{m.strategy}</span>
                </td>
                <td className="px-4 py-2.5 font-semibold text-slate-700">{m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{m.macro_f1 != null ? `${(m.macro_f1 * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-4 py-2.5 text-slate-500">{m.params_m}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-relaxed">{t("validation.compNote")}</p>
    </div>
  );
}

/* ---------------- Misclassification gallery ---------------- */
function MisclassSection({ mis, t }) {
  if (!mis || !mis.items?.length) return null;
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle size={17} className="text-amber-500" /> {t("validation.errTitle")}
        </h3>
        <span className="badge bg-amber-50 text-amber-700">
          {mis.misclassified}/{mis.total_test} · {(mis.error_rate * 100).toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">{t("validation.errHint")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {mis.items.map((it, i) => (
          <div key={i} className="rounded-xl border border-slate-200 overflow-hidden card-hover bg-white">
            <div className="relative">
              <img src={it.image} alt="" className="w-full aspect-square object-cover" />
              <span className="absolute top-2 right-2 badge bg-black/55 text-white backdrop-blur">
                {it.confidence.toFixed(0)}%
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <span className={`badge ${CLASS_BADGE[it.true]}`}>{it.true}</span>
                <ArrowRight size={13} className="text-slate-300" />
                <span className={`badge ${CLASS_BADGE[it.predicted]}`}>{it.predicted}</span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${it.confidence}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Statistical significance ---------------- */
function SignificanceSection({ sig, t }) {
  if (!sig || !sig.mcnemar_vs_deployed?.length) return null;
  const ci = sig.confidence_intervals || {};
  const depCI = sig.deployed ? ci[sig.deployed] : null;
  const short = (n) => n.replace(/ \(.*\)/, "");
  return (
    <div className="card p-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
        <Sigma size={17} className="text-brand-500" /> {t("validation.sigTitle")}
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        {t("validation.sigHint")} · n = {sig.n_test} · {sig.n_bootstrap.toLocaleString()} {t("validation.bootstraps")}
      </p>

      {depCI && (
        <div className="mb-4 text-sm text-slate-600">
          {t("validation.deployedCI")}:{" "}
          <b className="text-slate-800">{(depCI.accuracy * 100).toFixed(1)}%</b>{" "}
          <span className="text-slate-400">
            (95% CI [{(depCI.ci_low * 100).toFixed(1)}%, {(depCI.ci_high * 100).toFixed(1)}%])
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 bg-slate-50/60">
              <th className="px-4 py-2.5 font-medium">{t("validation.sigVs")}</th>
              <th className="px-4 py-2.5 font-medium">95% CI</th>
              <th className="px-4 py-2.5 font-medium">b / c</th>
              <th className="px-4 py-2.5 font-medium">p-value</th>
              <th className="px-4 py-2.5 font-medium">{t("validation.sigResult")}</th>
            </tr>
          </thead>
          <tbody>
            {sig.mcnemar_vs_deployed.map((r) => {
              const c = ci[r.vs];
              return (
                <tr key={r.vs} className="border-t border-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{short(r.vs)}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {c ? `[${(c.ci_low * 100).toFixed(1)}, ${(c.ci_high * 100).toFixed(1)}]%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{r.discordant_deployed_only} / {r.discordant_other_only}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700">{r.p_value < 0.001 ? "<0.001" : r.p_value.toFixed(3)}</td>
                  <td className="px-4 py-2.5">
                    {r.significant
                      ? <span className="badge bg-emerald-50 text-emerald-700">{t("validation.sigYes")}</span>
                      : <span className="badge bg-slate-100 text-slate-500">{t("validation.sigNo")}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-relaxed">{t("validation.sigNote")}</p>
    </div>
  );
}

export default function Validation() {
  const { t } = useTranslation();
  const [val, setVal] = useState(null);
  const [mis, setMis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Metrics.validation().then(setVal).catch(() => {}),
      Metrics.misclassified().then(setMis).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label={t("common.loading")} />;

  const cv = val?.cross_validation;
  const comp = val?.model_comparison;
  const sig = val?.significance;
  const hasAny = cv || comp || mis?.items?.length;
  const deployed = comp?.models?.find((m) => m.deployed);
  const best = comp?.models?.reduce((a, b) => ((b.accuracy || 0) > (a?.accuracy || 0) ? b : a), null);

  return (
    <>
      <PageHeader title={t("validation.title")} subtitle={t("validation.subtitle")} />
      {!hasAny ? (
        <EmptyState icon={AlertTriangle} text={t("validation.empty")} />
      ) : (
        <>
          {/* highlight row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cv && (
              <StatCard icon={Repeat} accent="emerald" label={t("validation.cvAcc")}
                value={<span>{(cv.mean.accuracy * 100).toFixed(1)}%<span className="text-sm text-slate-400 font-bold"> ±{(cv.std.accuracy * 100).toFixed(1)}</span></span>} />
            )}
            {deployed && (
              <StatCard icon={Crosshair} accent="brand" label={t("validation.testAcc")} countUp={deployed.accuracy * 100} suffix="%" decimals={1} />
            )}
            {comp && (
              <StatCard icon={Boxes} accent="indigo" label={t("validation.modelsCompared")} countUp={comp.models.length} />
            )}
            {mis && (
              <StatCard icon={AlertTriangle} accent="amber" label={t("validation.errorRate")} countUp={mis.error_rate * 100} suffix="%" decimals={1} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CVSection cv={cv} t={t} />
              <ComparisonSection comp={comp} t={t} />
            </div>
            <SignificanceSection sig={sig} t={t} />
            <MisclassSection mis={mis} t={t} />
          </div>
        </>
      )}
    </>
  );
}
