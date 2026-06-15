import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `value` over `duration` ms using rAF.
 * Supports an optional suffix (e.g. "%") and decimal places.
 */
export default function CountUp({ value, duration = 800, decimals = 0, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const target = Number(value) || 0;
    let start;
    const step = (ts) => {
      if (start === undefined) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return (
    <span>
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
