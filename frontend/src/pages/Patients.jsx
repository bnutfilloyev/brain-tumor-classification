import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, UserRound } from "lucide-react";
import { Patients as PatientsApi } from "../lib/api";
import { PageHeader, Modal, Spinner, EmptyState } from "../components/ui";
import { toast } from "../components/Toast";
import { fmtDate } from "../lib/constants";

const empty = { full_name: "", gender: "male", birth_date: "", medical_record_no: "", phone: "", notes: "" };

export default function Patients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = (query = "") => {
    setList(null);
    PatientsApi.list(query).then(setList);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = (p) => {
    setForm({ ...empty, ...p, birth_date: p.birth_date || "" });
    setEditId(p.id);
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, birth_date: form.birth_date || null };
    try {
      if (editId) await PatientsApi.update(editId, payload);
      else await PatientsApi.create(payload);
      setModal(false);
      load(q);
      toast(t("common.save") + " ✓", "success");
    } catch (e) {
      toast((e.response?.data?.detail || e.message), "error");
    }
  };

  const remove = async (id) => {
    if (!confirm(t("patients.deleteConfirm"))) return;
    try {
      await PatientsApi.remove(id);
      load(q);
      toast(t("common.delete") + " ✓", "success");
    } catch (e) {
      toast((e.response?.data?.detail || e.message), "error");
    }
  };

  return (
    <>
      <PageHeader
        title={t("patients.title")}
        subtitle={t("patients.subtitle")}
        action={
          <button className="btn-primary" onClick={openNew}>
            <Plus size={18} /> {t("patients.new")}
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t("common.search")}
              value={q}
              onChange={(e) => { setQ(e.target.value); load(e.target.value); }}
            />
          </div>
        </div>

        {!list ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={UserRound} text={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="px-5 py-3 font-medium">{t("patients.name")}</th>
                <th className="px-5 py-3 font-medium">{t("patients.mrn")}</th>
                <th className="px-5 py-3 font-medium">{t("patients.gender")}</th>
                <th className="px-5 py-3 font-medium">{t("patients.birthDate")}</th>
                <th className="px-5 py-3 font-medium text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer"
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-700">{p.full_name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{p.medical_record_no || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 capitalize">{t(`patients.${p.gender}`, p.gender || "—")}</td>
                  <td className="px-5 py-3.5 text-slate-500">{fmtDate(p.birth_date)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" onClick={() => openEdit(p)}>
                        <Pencil size={16} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-red-50 text-red-500" onClick={() => remove(p.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? t("patients.edit") : t("patients.new")}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t("patients.name")}</label>
            <input className="input" required value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("patients.gender")}</label>
              <select className="input" value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">{t("patients.male")}</option>
                <option value="female">{t("patients.female")}</option>
                <option value="other">{t("patients.other")}</option>
              </select>
            </div>
            <div>
              <label className="label">{t("patients.birthDate")}</label>
              <input type="date" className="input" value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t("patients.mrn")}</label>
              <input className="input" value={form.medical_record_no || ""}
                onChange={(e) => setForm({ ...form, medical_record_no: e.target.value })} />
            </div>
            <div>
              <label className="label">{t("patients.phone")}</label>
              <input className="input" value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t("patients.notes")}</label>
            <textarea className="input" rows={3} value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn-primary">{t("common.save")}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
