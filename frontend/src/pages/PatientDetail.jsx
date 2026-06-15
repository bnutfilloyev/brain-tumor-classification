import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileImage, Sparkles, Activity, FileDown } from "lucide-react";
import { Patients, AI } from "../lib/api";
import { Spinner, EmptyState, TypingDots } from "../components/ui";
import Markdown from "../components/Markdown";
import CompareSlider from "../components/CompareSlider";
import { CLASS_BADGE, fmtDate } from "../lib/constants";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [patient, setPatient] = useState(null);
  const [summarizing, setSummarizing] = useState(null);

  const load = () => Patients.get(id).then(setPatient);
  useEffect(() => { load(); }, [id]);

  const summarize = async (study) => {
    if (!study.prediction) return;
    setSummarizing(study.id);
    try {
      await AI.summary({
        class_name: study.prediction.class_name,
        confidence: study.prediction.confidence,
        language: i18n.language,
        patient_context: `${patient.full_name}, ${patient.gender}`,
      }).then(async (res) => {
        study.prediction.ai_summary = res.summary;
        setPatient({ ...patient });
      });
    } finally {
      setSummarizing(null);
    }
  };

  if (!patient) return <Spinner />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button className="btn-ghost" onClick={() => navigate("/patients")}>
          <ArrowLeft size={18} /> {t("common.back")}
        </button>
        <a
          className="btn-primary"
          href={`/api/patients/${id}/report.pdf`}
          target="_blank"
          rel="noreferrer"
        >
          <FileDown size={18} /> {t("patients.downloadPdf")}
        </a>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center text-xl sm:text-2xl font-bold shrink-0">
            {patient.full_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 truncate">{patient.full_name}</h1>
            <p className="text-slate-500 text-sm truncate">
              {t(`patients.${patient.gender}`, patient.gender)} · {fmtDate(patient.birth_date)} · {patient.medical_record_no || "—"}
            </p>
          </div>
        </div>
        {patient.notes && <p className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-3">{patient.notes}</p>}
      </div>

      <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Activity size={18} /> {t("patients.history")}
      </h2>

      {patient.studies.length === 0 ? (
        <EmptyState icon={FileImage} text={t("patients.noStudies")} />
      ) : (
        <div className="space-y-4">
          {patient.studies
            .slice()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((study) => (
              <div key={study.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      {study.modality} · {study.source_format}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(study.created_at)}</span>
                  </div>
                  {study.prediction && (
                    <div className="flex items-center gap-2">
                      <span className={`badge ${CLASS_BADGE[study.prediction.class_name] || "bg-slate-100"}`}>
                        {study.prediction.class_name}
                      </span>
                      <span className="text-sm font-bold text-slate-600">
                        {study.prediction.confidence.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {study.prediction?.all_scores && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    {study.image_path && (
                      <div className="w-40 shrink-0">
                        <CompareSlider
                          before={study.image_path}
                          after={study.prediction.gradcam_path}
                          beforeLabel={t("analyze.original")}
                          afterLabel={t("analyze.heatmap")}
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      {Object.entries(study.prediction.all_scores).map(([cls, val]) => (
                        <div key={cls} className="flex items-center gap-3 text-xs">
                          <span className="w-24 text-slate-500">{cls}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${val}%` }} />
                          </div>
                          <span className="w-12 text-right text-slate-400">{val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {study.prediction && (
                  <div className="mt-4">
                    {summarizing === study.id ? (
                      <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-4">
                        <TypingDots label={t("common.loading")} />
                      </div>
                    ) : study.prediction.ai_summary ? (
                      <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-4">
                        <Markdown>{study.prediction.ai_summary}</Markdown>
                      </div>
                    ) : (
                      <button className="btn-ghost text-brand-600" onClick={() => summarize(study)}>
                        <Sparkles size={16} />
                        {t("analyze.generateSummary")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </>
  );
}
