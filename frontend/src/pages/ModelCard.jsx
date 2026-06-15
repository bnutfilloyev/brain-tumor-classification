import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Cpu, GraduationCap, Database, Target, ShieldAlert, AlertTriangle, FileBadge,
} from "lucide-react";
import { Metrics } from "../lib/api";
import { PageHeader, Spinner } from "../components/ui";

function Row({ k, v }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-1.5 border-b border-slate-50 last:border-0 text-sm">
      <span className="sm:w-40 sm:shrink-0 text-slate-400 font-medium sm:font-normal">{k}</span>
      <span className="text-slate-700">{v}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
        <Icon size={17} className="text-brand-500" /> {title}
      </h3>
      {children}
    </div>
  );
}

function pct(x) {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

export default function ModelCard() {
  const { t } = useTranslation();
  const [card, setCard] = useState(null);

  useEffect(() => { Metrics.modelcard().then(setCard).catch(() => {}); }, []);
  if (!card) return <Spinner label={t("common.loading")} />;

  const e = card.evaluation || {};

  return (
    <>
      <PageHeader title={t("modelcard.title")} subtitle={t("modelcard.subtitle")} />

      {/* headline */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-brand-50/60 to-white border-brand-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-brand-600 text-white grid place-items-center">
            <FileBadge size={24} />
          </div>
          <div>
            <div className="font-extrabold text-slate-800 text-lg">{card.name}</div>
            <div className="text-xs text-slate-400">v{card.version} · {card.task}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            [t("modelcard.testAcc"), pct(e.test_accuracy)],
            [t("modelcard.cvAcc"), e.cv_mean_accuracy != null ? `${pct(e.cv_mean_accuracy)} ± ${(e.cv_std_accuracy * 100).toFixed(1)}` : "—"],
            [t("modelcard.macroF1"), pct(e.macro_f1)],
            ["ECE", e.ece != null ? `${(e.ece * 100).toFixed(2)}%` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-white rounded-xl border border-slate-100 p-3">
              <div className="text-lg font-extrabold text-slate-800">{v}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{k}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section icon={Cpu} title={t("modelcard.architecture")}>
          <Row k="Backbone" v={card.architecture.backbone} />
          <Row k="Input" v={card.architecture.input} />
          <Row k="Head" v={card.architecture.head} />
          <Row k="Output" v={card.architecture.output} />
          <Row k={t("modelcard.params")} v={`${card.architecture.params_million}M`} />
          {e.temperature != null && <Row k="Temperature (T)" v={e.temperature} />}
        </Section>

        <Section icon={GraduationCap} title={t("modelcard.training")}>
          <Row k={t("modelcard.strategy")} v={card.training.strategy} />
          <Row k="Phase 1" v={card.training.phase_1} />
          <Row k="Phase 2" v={card.training.phase_2} />
          <Row k="Loss" v={card.training.loss} />
          <Row k={t("modelcard.augmentation")} v={card.training.augmentation} />
          <Row k="Calibration" v={card.training.calibration} />
        </Section>

        <Section icon={Database} title={t("modelcard.data")}>
          <Row k="Dataset" v={card.data.dataset} />
          <Row k="Split" v={card.data.split} />
          <Row k={t("modelcard.preprocessing")} v={card.data.preprocessing} />
          <Row k="Source" v={<a className="text-brand-600 underline break-all" href={card.data.source_url} target="_blank" rel="noreferrer">{card.data.source_url}</a>} />
          {e.test_samples && <Row k={t("modelcard.testSamples")} v={e.test_samples} />}
        </Section>

        <Section icon={Target} title={t("modelcard.intendedUse")}>
          <Row k={t("modelcard.primary")} v={card.intended_use.primary} />
          <Row k={t("modelcard.users")} v={card.intended_use.users} />
          <Row k={t("modelcard.outOfScope")} v={card.intended_use.out_of_scope} />
        </Section>

        <Section icon={ShieldAlert} title={t("modelcard.ethics")}>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            {card.ethical_considerations.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Section>

        <Section icon={AlertTriangle} title={t("modelcard.caveats")}>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
            {card.caveats.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Section>
      </div>
    </>
  );
}
