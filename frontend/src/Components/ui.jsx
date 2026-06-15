import CountUp from "./CountUp";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, accent = "brand", countUp, suffix = "", decimals = 0, trend }) {
  const ring = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  }[accent];
  return (
    <div className="card card-hover p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl grid place-items-center shrink-0 ${ring}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-extrabold text-slate-800 truncate">
          {countUp ? <CountUp value={countUp} suffix={suffix} decimals={decimals} /> : value}
        </div>
        <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 truncate">
          {label}
          {trend && <span className="text-xs font-semibold text-emerald-600">{trend}</span>}
        </div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <div className="h-9 w-9 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}

export function TypingDots({ label }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <span className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </span>
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      {Icon && <Icon size={44} strokeWidth={1.5} />}
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  );
}
