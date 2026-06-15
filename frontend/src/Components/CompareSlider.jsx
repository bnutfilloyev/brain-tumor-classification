import { useRef, useState, useCallback } from "react";

/**
 * Before/after image comparison slider.
 * `before` = original image URL, `after` = Grad-CAM overlay URL.
 */
export default function CompareSlider({ before, after, beforeLabel, afterLabel, className = "" }) {
  const [pos, setPos] = useState(50);
  const ref = useRef(null);
  const dragging = useRef(false);

  const update = useCallback((clientX) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  const onDown = (e) => {
    dragging.current = true;
    update((e.touches ? e.touches[0] : e).clientX);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    update((e.touches ? e.touches[0] : e).clientX);
  };
  const onUp = () => { dragging.current = false; };

  if (!after) {
    // Nothing to compare — just show the original.
    return <img src={before} alt="" className={`rounded-xl border border-slate-200 ${className}`} />;
  }

  return (
    <div
      ref={ref}
      className={`relative select-none overflow-hidden rounded-xl border border-slate-200 cursor-ew-resize ${className}`}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={onDown}
      onTouchMove={onMove}
      onTouchEnd={onUp}
    >
      <img src={after} alt={afterLabel} className="block w-full" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt={beforeLabel}
          className="block h-full max-w-none"
          style={{ width: ref.current ? ref.current.clientWidth : "100%" }}
          draggable={false}
        />
      </div>

      {/* labels */}
      <span className="absolute top-2 left-2 text-[10px] font-semibold bg-white/85 text-slate-600 px-2 py-0.5 rounded-md">
        {beforeLabel}
      </span>
      <span className="absolute top-2 right-2 text-[10px] font-semibold bg-white/85 text-slate-600 px-2 py-0.5 rounded-md">
        {afterLabel}
      </span>

      {/* handle */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white shadow grid place-items-center text-brand-600 text-xs">
          ↔
        </div>
      </div>
    </div>
  );
}
