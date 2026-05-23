"use client";
import { useEffect, useRef, useState } from "react";

/** Measure a chart container without Recharts ResponsiveContainer (avoids removeChild crashes). */
export function useChartDimensions(defaultHeight = 260) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: defaultHeight });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.floor(width);
      const h = Math.floor(height) || defaultHeight;
      if (w > 0) setSize({ width: w, height: h });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [defaultHeight]);

  const ready = mounted && size.width > 0;

  return { ref, width: size.width, height: size.height, ready };
}
