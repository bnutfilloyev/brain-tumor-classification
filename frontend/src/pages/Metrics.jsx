import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, LabelList, ReferenceLine,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { Metrics } from "../lib/api";
import { PageHeader, StatCard, Spinner } from "../components/ui";
import { CLASS_COLORS } from "../lib/constants";
import { Target, Gauge, Scale } from "lucide-react";

function ConfusionMatrix({ data, t }) {
  const { classes, confusion_matrix } = data;
  const [pct, setPct] = useState(false);
  const rowSums = confusion_matrix.map((r) => r.reduce((a, b) => a + b, 0));
  const max = Math.max(...confusion_matrix.flat());

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-slate-800">{t("metrics.confusionMatrix")}</h3>
          <p className="text-xs text-slate-400 mb-4">{t("metrics.cmHint")}</p>
        </div>
        <div className="flex gap-1 text-xs bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setPct(false)} className={`px-2.5 py-1 rounded-md font-medium ${!pct ? "bg-white shadow-sm text-brand-700" : "text-slate-400"}`}>
            {t("metrics.count")}
          </button>
          <button onClick={() => setPct(true)} className={`px-2.5 py-1 rounded-md font-medium ${pct ? "bg-white shadow-sm text-brand-700" : "text-slate-400"}`}>
            %
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse mx-auto">
          <thead>
            <tr>
              <th className="p-2"></th>
              <th colSpan={classes.length} className="text-xs text-slate-400 font-medium pb-1">{t("metrics.predicted")}</th>
            </tr>
            <tr>
              <th className="p-2"></th>
              {classes.map((c) => (
                <th key={c} className="px-2 py-1 text-xs font-medium text-slate-500">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confusion_matrix.map((row, i) => (
              <tr key={i}>
                <th className="px-2 py-1 text-xs font-medium text-slate-500 text-right">{classes[i]}</th>
                {row.map((val, j) => {
                  const frac = rowSums[i] ? val / rowSums[i] : 0;
                  const intensity = pct ? frac : val / max;
                  const isDiag = i === j;
                  const bg = isDiag
                    ? `rgba(19,127,132,${0.15 + intensity * 0.75})`
                    : `rgba(239,68,68,${0.08 + intensity * 0.5})`;
                  const shown = pct ? `${(frac * 100).toFixed(1)}%` : val;
                  return (
                    <td key={j} className="p-0.5">
                      <div
                        title={`${classes[i]} → ${classes[j]}: ${val} (${(frac * 100).toFixed(1)}%)`}
                        className="h-12 w-12 sm:h-14 sm:w-16 grid place-items-center rounded-lg text-xs sm:text-sm font-semibold transition-transform hover:scale-105 cursor-default"
                        style={{ background: val === 0 ? "#f8fafc" : bg, color: intensity > 0.5 ? "#fff" : "#334155" }}
                      >
                        {shown}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ROCChart({ roc, t }) {
  const classes = Object.keys(roc);
  // Build merged data keyed by fpr index
  const points = roc[classes[0]].fpr.map((fpr, idx) => {
    const row = { fpr };
    classes.forEach((c) => { row[c] = roc[c].tpr[idx]; });
    return row;
  });
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800">{t("metrics.roc")}</h3>
        <span className="badge bg-slate-100 text-slate-500">{t("metrics.zoomed")}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{t("metrics.rocHint")}</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 5, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis dataKey="fpr" type="number" domain={[0, 0.25]} allowDataOverflow ticks={[0, 0.05, 0.1, 0.15, 0.2, 0.25]} tick={{ fontSize: 11 }} label={{ value: "FPR", position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis domain={[0.75, 1]} allowDataOverflow ticks={[0.75, 0.8, 0.85, 0.9, 0.95, 1]} tick={{ fontSize: 11 }} label={{ value: "TPR", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip formatter={(v) => v.toFixed(3)} />
          <Legend />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#cbd5e1" strokeDasharray="4 4" ifOverflow="hidden" />
          {classes.map((c) => (
            <Line key={c} type="monotone" dataKey={c} stroke={CLASS_COLORS[c]} dot={{ r: 2 }} strokeWidth={2.5}
              name={`${c} (AUC ${roc[c].auc})`} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PRChart({ pr, t }) {
  const classes = Object.keys(pr);
  const points = pr[classes[0]].recall.map((recall, idx) => {
    const row = { recall };
    classes.forEach((c) => { row[c] = pr[c].precision[idx]; });
    return row;
  });
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800">{t("metrics.pr")}</h3>
        <span className="badge bg-slate-100 text-slate-500">{t("metrics.zoomed")}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{t("metrics.prHint")}</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 5, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis dataKey="recall" type="number" domain={[0.5, 1]} allowDataOverflow ticks={[0.5, 0.6, 0.7, 0.8, 0.9, 1]} tick={{ fontSize: 11 }} label={{ value: "Recall", position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis domain={[0.75, 1]} allowDataOverflow ticks={[0.75, 0.8, 0.85, 0.9, 0.95, 1]} tick={{ fontSize: 11 }} label={{ value: "Precision", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip formatter={(v) => v.toFixed(3)} />
          <Legend />
          {classes.map((c) => (
            <Line key={c} type="monotone" dataKey={c} stroke={CLASS_COLORS[c]} dot={{ r: 2 }} strokeWidth={2.5}
              name={`${c} (AP ${pr[c].ap})`} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerClassBars({ perClass, t }) {
  const data = perClass.map((c) => ({
    name: c.class,
    Precision: +(c.precision * 100).toFixed(1),
    Recall: +(c.recall * 100).toFixed(1),
    F1: +(c.f1 * 100).toFixed(1),
  }));
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800">{t("metrics.perClass")}</h3>
        <span className="badge bg-slate-100 text-slate-500">{t("metrics.zoomed")}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{t("metrics.perClassHint")}</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 18, right: 6 }} barCategoryGap="22%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[80, 100]} allowDataOverflow ticks={[80, 85, 90, 95, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          {[["Precision", "#1ba0a3"], ["Recall", "#6366f1"], ["F1", "#f59e0b"]].map(([k, color]) => (
            <Bar key={k} dataKey={k} fill={color} radius={[3, 3, 0, 0]}>
              <LabelList dataKey={k} position="top" fontSize={9} fill="#64748b" formatter={(v) => v.toFixed(0)} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CalibrationChart({ calibration, t }) {
  const data = calibration.bins.map((b) => ({
    confidence: +(b.confidence * 100).toFixed(0),
    accuracy: +(b.accuracy * 100).toFixed(1),
    perfect: +(b.confidence * 100).toFixed(0),
  }));
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">{t("metrics.calibration")}</h3>
        <span className="badge bg-brand-50 text-brand-700">ECE {(calibration.ece * 100).toFixed(2)}%</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis dataKey="confidence" type="number" domain={[50, 100]} tick={{ fontSize: 11 }}
            label={{ value: t("metrics.predConfidence"), position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis domain={[50, 100]} tick={{ fontSize: 11 }}
            label={{ value: t("metrics.observedAcc"), angle: -90, position: "insideLeft", fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="perfect" stroke="#cbd5e1" dot={false} strokeWidth={2} strokeDasharray="5 4" name={t("metrics.perfectCal")} />
          <Line type="monotone" dataKey="accuracy" stroke="#1ba0a3" strokeWidth={2.5} name={t("metrics.model")} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2">{t("metrics.calHint")}</p>
    </div>
  );
}

function EmbeddingScatter({ embedding, t }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">{t("metrics.embedding")}</h3>
        <span className="text-xs text-slate-400">{embedding.n} samples</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} domain={["dataMin", "dataMax"]} />
          <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} domain={["dataMin", "dataMax"]} />
          <ZAxis range={[40, 40]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          {embedding.classes.map((cls) => (
            <Scatter
              key={cls}
              name={cls}
              data={embedding.points.filter((p) => p.class === cls)}
              fill={CLASS_COLORS[cls]}
              fillOpacity={0.7}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2">{t("metrics.embHint")}</p>
    </div>
  );
}

export default function MetricsPage() {
  const { t } = useTranslation();
  const [perf, setPerf] = useState(null);
  const [ds, setDs] = useState(null);
  const [train, setTrain] = useState(null);
  const [emb, setEmb] = useState(null);

  useEffect(() => {
    Metrics.performance().then(setPerf).catch(() => {});
    Metrics.dataset().then(setDs).catch(() => {});
    Metrics.training().then(setTrain).catch(() => {});
    Metrics.embedding().then(setEmb).catch(() => {});
  }, []);

  if (!perf) return <Spinner label={t("common.loading")} />;

  const dsData = ds
    ? ds.classes.map((c) => ({
        name: c,
        [t("metrics.trainSet")]: ds.train_counts[c],
        [t("metrics.testSet")]: ds.test_counts[c],
      }))
    : [];

  return (
    <>
      <PageHeader title={t("metrics.title")} subtitle={t("metrics.subtitle")} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Target} label={t("metrics.accuracy")} countUp={perf.accuracy * 100} suffix="%" decimals={1} accent="emerald" />
        <StatCard icon={Gauge} label={t("metrics.macroF1")} countUp={perf.macro_avg.f1 * 100} suffix="%" decimals={1} accent="brand" />
        <StatCard icon={Scale} label={t("metrics.weightedF1")} countUp={perf.weighted_avg.f1 * 100} suffix="%" decimals={1} accent="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <PerClassBars perClass={perf.per_class} t={t} />
        <ConfusionMatrix data={perf} t={t} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ROCChart roc={perf.roc} t={t} />
        {perf.pr ? <PRChart pr={perf.pr} t={t} /> : <div />}
      </div>

      {(perf.calibration || emb) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {perf.calibration && <CalibrationChart calibration={perf.calibration} t={t} />}
          {emb && <EmbeddingScatter embedding={emb} t={t} />}
        </div>
      )}

      {train && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-slate-800 mb-4">{t("metrics.trainingHistory")}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={train.history} margin={{ top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#1ba0a3" dot={false} strokeWidth={2} name={t("metrics.accCurve")} />
              <Line type="monotone" dataKey="val_accuracy" stroke="#6366f1" dot={false} strokeWidth={2} strokeDasharray="4 3" name={`val_${t("metrics.accCurve")}`} />
              <Line type="monotone" dataKey="loss" stroke="#ef4444" dot={false} strokeWidth={2} name={t("metrics.lossCurve")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-class table */}
      <div className="card overflow-x-auto mb-6">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="px-5 py-3 font-medium">{t("metrics.classes")}</th>
              <th className="px-5 py-3 font-medium">{t("metrics.precision")}</th>
              <th className="px-5 py-3 font-medium">{t("metrics.recall")}</th>
              <th className="px-5 py-3 font-medium">{t("metrics.f1")}</th>
              <th className="px-5 py-3 font-medium">{t("metrics.support")}</th>
            </tr>
          </thead>
          <tbody>
            {perf.per_class.map((c) => (
              <tr key={c.class} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-semibold text-slate-700">{c.class}</td>
                <td className="px-5 py-3 text-slate-600">{(c.precision * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-slate-600">{(c.recall * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-slate-600">{(c.f1 * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-slate-500">{c.support}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ds && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-1">{t("metrics.dataset")}</h3>
          <p className="text-xs text-slate-400 mb-4">{ds.name} · {ds.total_train + ds.total_test} images</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey={t("metrics.trainSet")} fill="#1ba0a3" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t("metrics.testSet")} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
