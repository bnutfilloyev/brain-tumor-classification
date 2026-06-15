export const CLASS_COLORS = {
  Glioma: "#ef4444",
  Meningioma: "#f59e0b",
  Notumor: "#10b981",
  Pituitary: "#6366f1",
};

export const CLASS_BADGE = {
  Glioma: "bg-red-50 text-red-700",
  Meningioma: "bg-amber-50 text-amber-700",
  Notumor: "bg-emerald-50 text-emerald-700",
  Pituitary: "bg-indigo-50 text-indigo-700",
};

export const fmtDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
};
