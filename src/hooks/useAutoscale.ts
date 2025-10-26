import { useCallback, useEffect, useRef, useState } from "react";

type Size = { width: number; height: number };

/**
 * Calcola un fattore di scala per far stare un "design size" (base)
 * dentro un contenitore, mantenendo il ratio. Usa transform: scale().
 */
export function useAutoscale(base: Size) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const pw = parent.clientWidth;
    const ph = parent.clientHeight || window.innerHeight;
    const sx = pw / base.width;
    const sy = ph / base.height;
    const s = Math.max(0.5, Math.min(sx, sy)); // limiti di buon senso
    setScale(s);
  }, [base.width, base.height]);

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(() => recalc());
    const parent = ref.current?.parentElement;
    if (parent) ro.observe(parent);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      ro.disconnect();
    };
  }, [recalc]);

  return { ref, scale };
}