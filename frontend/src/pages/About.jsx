import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/ui";
import { Brain, Cpu, Database, ShieldCheck } from "lucide-react";

export default function About() {
  const { t } = useTranslation();

  const items = [
    { icon: Cpu, titleKey: "about.archTitle", bodyKey: "about.archBody" },
    { icon: Database, titleKey: "about.dataTitle", bodyKey: "about.dataBody" },
    { icon: Brain, titleKey: "about.clinicTitle", bodyKey: "about.clinicBody" },
    { icon: ShieldCheck, titleKey: "about.useTitle", bodyKey: "about.useBody" },
  ];

  return (
    <>
      <PageHeader title={t("about.title")} subtitle={t("about.subtitle")} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((it) => (
          <div key={it.titleKey} className="card p-6">
            <div className="h-11 w-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mb-4">
              <it.icon size={22} />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">{t(it.titleKey)}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{t(it.bodyKey)}</p>
          </div>
        ))}
      </div>
      <div className="card p-6 mt-6 bg-brand-50/40 border-brand-100">
        <p className="text-sm text-brand-800">{t("disclaimer")}</p>
      </div>
    </>
  );
}
