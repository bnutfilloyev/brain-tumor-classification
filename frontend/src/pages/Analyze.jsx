import { useEffect, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { UploadCloud, Sparkles, Send, RotateCcw, FileText, ScanLine, X, Save } from "lucide-react";
import { Analyze as AnalyzeApi, AI, AIStream, Patients, Studies } from "../lib/api";
import { PageHeader, TypingDots } from "../components/ui";
import { toast } from "../components/Toast";
import Markdown from "../components/Markdown";
import CompareSlider from "../components/CompareSlider";
import { CLASS_COLORS, CLASS_BADGE } from "../lib/constants";

export default function Analyze() {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [saved, setSaved] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [chatting, setChatting] = useState(false);
  const chatEnd = useRef(null);

  useEffect(() => { Patients.list().then(setPatients).catch(() => {}); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const isDicom = file && /\.(dcm|dicom)$/i.test(file.name);

  const onDrop = (files) => {
    if (!files.length) return;
    const f = files[0];
    setFile(f);
    setResult(null);
    setSummary(null);
    setChat([]);
    setSaved(false);
    // Preview only for standard images (DICOM can't render in <img>)
    if (/\.(dcm|dicom)$/i.test(f.name)) setPreview(null);
    else setPreview(URL.createObjectURL(f));
  };

  const runAnalyze = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await AnalyzeApi.run(file, {
        patientId: patientId || undefined,
        save: !!patientId,
      });
      setResult(res);
      if (patientId) {
        setSaved(true);
        toast(t("analyze.savedToast"), "success");
      }
    } catch (e) {
      toast((e.response?.data?.detail || e.message), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveToPatient = async () => {
    if (!patientId || !result) return;
    try {
      await Studies.save({
        patient_id: Number(patientId),
        class_id: result.class_id,
        class_name: result.class_name,
        confidence: result.confidence,
        all_scores: result.all_scores,
        image_url: result.image_url,
        gradcam_url: result.gradcam_url,
        source_format: result.dicom_metadata ? "dicom" : "image",
        dicom_metadata: result.dicom_metadata,
      });
      setSaved(true);
      toast(t("analyze.savedToast"), "success");
    } catch (e) {
      toast((e.response?.data?.detail || e.message), "error");
    }
  };

  const clearFile = () => { setFile(null); setPreview(null); };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/dicom": [".dcm", ".dicom"],
      "application/octet-stream": [".dcm"],
    },
  });

  const genSummary = async () => {
    setSummarizing(true);
    setSummary("");
    try {
      await AIStream.summary(
        {
          class_name: result.class_name,
          confidence: result.confidence,
          language: i18n.language,
        },
        (full) => setSummary(full)
      );
    } catch (e) {
      toast(e.message || "Error", "error");
    } finally {
      setSummarizing(false);
    }
  };

  const send = async () => {
    if (!msg.trim()) return;
    const next = [...chat, { role: "user", content: msg }];
    setChat(next);
    setMsg("");
    setChatting(true);
    try {
      await AIStream.chat(
        {
          messages: next,
          class_name: result?.class_name,
          confidence: result?.confidence,
          language: i18n.language,
        },
        (full) => setChat([...next, { role: "assistant", content: full }])
      );
    } catch (e) {
      toast(e.message || "Error", "error");
    } finally {
      setChatting(false);
    }
  };

  const reset = () => {
    setResult(null); setSummary(null); setChat([]);
    setFile(null); setPreview(null); setSaved(false);
  };

  return (
    <>
      <PageHeader title={t("analyze.title")} subtitle={t("analyze.subtitle")} />

      {!result && (
        <div className="card p-6 max-w-2xl mx-auto">
          <div className="mb-4">
            <label className="label">{t("analyze.assignPatient")}</label>
            <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">—</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.medical_record_no})</option>
              ))}
            </select>
            {patientId && <p className="text-xs text-brand-600 mt-1.5">✓ {t("analyze.savePrompt")}</p>}
          </div>

          {busy ? (
            <div className="flex flex-col items-center py-10 fade-in">
              <div className="scan-line relative overflow-hidden h-40 w-40 rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-slate-50 grid place-items-center">
                <ScanLine size={44} className="text-brand-300 animate-pulse" strokeWidth={1.5} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">{t("analyze.analyzing")}</p>
            </div>
          ) : file ? (
            <div className="fade-in">
              <div className="relative rounded-2xl border-2 border-brand-200 bg-slate-50 p-4 flex flex-col items-center">
                <button onClick={clearFile} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
                {preview ? (
                  <img src={preview} alt="preview" className="h-44 rounded-xl object-contain" />
                ) : (
                  <div className="h-44 w-44 grid place-items-center text-brand-400">
                    <FileText size={56} strokeWidth={1.5} />
                  </div>
                )}
                <p className="mt-3 text-sm text-slate-600 font-medium truncate max-w-full">
                  {file.name}{isDicom && <span className="ml-2 badge bg-indigo-50 text-indigo-700">DICOM</span>}
                </p>
              </div>
              <button className="btn-primary w-full mt-4" onClick={runAnalyze}>
                <ScanLine size={18} /> {t("analyze.runAnalysis")}
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud size={48} className="mx-auto text-brand-400" strokeWidth={1.5} />
              <p className="mt-4 font-semibold text-slate-700">{t("analyze.drop")}</p>
              <p className="text-sm text-slate-400 mt-1">{t("analyze.dropHint")}</p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 fade-in">
          {/* Left: image + result */}
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">{t("analyze.result")}</h3>
                <button className="btn-ghost py-1.5" onClick={reset}>
                  <RotateCcw size={15} /> {t("analyze.newScan")}
                </button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`badge text-sm px-3 py-1.5 ${CLASS_BADGE[result.class_name]}`}>
                  {result.class_name}
                </span>
                <span className="text-2xl font-extrabold text-slate-800">
                  {result.confidence.toFixed(1)}%
                </span>
              </div>

              <div className="max-w-xs mx-auto">
                <CompareSlider
                  before={result.image_url}
                  after={result.gradcam_url}
                  beforeLabel={t("analyze.original")}
                  afterLabel={t("analyze.heatmap")}
                />
              </div>
              {result.gradcam_url && (
                <p className="text-xs text-slate-400 text-center mt-2">{t("analyze.gradcamHint")}</p>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100">
                {saved ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <Save size={16} /> {t("analyze.savedToast")}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                    <div className="flex-1">
                      <label className="label">{t("analyze.assignPatient")}</label>
                      <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                        <option value="">—</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.medical_record_no})</option>
                        ))}
                      </select>
                    </div>
                    <button className="btn-primary sm:shrink-0" onClick={saveToPatient} disabled={!patientId}>
                      <Save size={16} /> {t("common.save")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-4">{t("analyze.scores")}</h3>
              <div className="space-y-3">
                {Object.entries(result.all_scores).map(([cls, val]) => (
                  <div key={cls}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{cls}</span>
                      <span className="font-semibold text-slate-500">{val}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: CLASS_COLORS[cls] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.dicom_metadata && (
              <div className="card p-6">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} /> {t("analyze.dicomMeta")}
                </h3>
                <dl className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {Object.entries(result.dicom_metadata).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-slate-700">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* Right: AI summary + chat */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-brand-500" /> {t("analyze.aiSummary")}
              </h3>
              {summary ? (
                <Markdown>{summary}</Markdown>
              ) : summarizing ? (
                <TypingDots label={t("common.loading")} />
              ) : (
                <button className="btn-primary" onClick={genSummary}>
                  <Sparkles size={16} />
                  {t("analyze.generateSummary")}
                </button>
              )}
            </div>

            <div className="card p-6 flex flex-col" style={{ minHeight: 360 }}>
              <h3 className="font-bold text-slate-800 mb-3">{t("analyze.askAI")}</h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-80 mb-3 pr-1">
                {chat.map((m, i) => (
                  <div key={i} className={`flex msg-in ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap bg-brand-600 text-white">
                        {m.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%] rounded-2xl px-4 py-2 bg-slate-100">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    )}
                  </div>
                ))}
                {chatting && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={t("analyze.chatPlaceholder")}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="btn-primary px-3" onClick={send} disabled={chatting}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
