import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

// Simple module-level event bus — call toast(msg, type) from anywhere.
const listeners = new Set();
let seq = 0;

export function toast(message, type = "success") {
  const item = { id: ++seq, message, type };
  listeners.forEach((l) => l(item));
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const STYLES = {
  success: "border-emerald-200 text-emerald-700",
  error: "border-red-200 text-red-700",
  info: "border-brand-200 text-brand-700",
};

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const add = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, 3500);
    };
    listeners.add(add);
    return () => listeners.delete(add);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {items.map((it) => {
        const Icon = ICONS[it.type] || Info;
        return (
          <div
            key={it.id}
            className={`msg-in card flex items-center gap-3 pl-4 pr-3 py-3 border ${STYLES[it.type] || STYLES.info} min-w-[260px] max-w-sm`}
          >
            <Icon size={18} />
            <span className="text-sm text-slate-700 flex-1">{it.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== it.id))}
              className="text-slate-300 hover:text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
