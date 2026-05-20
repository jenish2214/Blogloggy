"use client";

import { useEffect, useState } from "react";

export function CountUp({
  target,
  duration = 1200,
  suffix = "",
}: {
  target: number;
  duration?: number;
  suffix?: string;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(elapsed / duration, 1);
      const progress = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(progress * target));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}
