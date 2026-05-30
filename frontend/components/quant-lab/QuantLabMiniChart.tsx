"use client";

import { useEffect, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { marketApi } from "@/lib/api";
import { useChartDimensions } from "@/lib/useChartDimensions";
import { useQuantLabStore } from "@/lib/store/quantLab";
import styles from "./quant-lab.module.css";

interface QuantLabMiniChartProps {
  range?: string;
  interval?: string;
  height?: number;
  title?: string;
}

export function QuantLabMiniChart({
  range = "3mo",
  interval = "1d",
  height = 220,
  title = "Price chart",
}: QuantLabMiniChartProps) {
  const { activeSymbol } = useQuantLabStore();
  const chartDims = useChartDimensions(height);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<Array<{ i: number; price: number; label: string }>>([]);
  const [meta, setMeta] = useState<{ name: string; changePct: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void marketApi
      .getChart(activeSymbol, range, interval)
      .then(({ chart }) => {
        if (cancelled) return;
        const candles = chart.candles.filter((c) => c.close > 0);
        const rows = candles.map((c, i) => ({
          i,
          price: c.close,
          label: new Date(c.time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        }));
        const first = candles[0]?.close ?? 0;
        const last = candles[candles.length - 1]?.close ?? 0;
        const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
        setData(rows);
        setMeta({ name: chart.name || activeSymbol, changePct });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeSymbol, range, interval]);

  if (loading) {
    return (
      <div className={styles.chartPanel}>
        <div className={styles.sectionHeader}>{title}</div>
        <div className={styles.skeletonCard} style={{ height }} />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className={styles.chartPanel}>
        <div className={styles.sectionHeader}>{title}</div>
        <p className={styles.emptyState}>Chart unavailable for {activeSymbol}.</p>
      </div>
    );
  }

  const up = (meta?.changePct ?? 0) >= 0;
  const stroke = up ? "var(--up)" : "var(--down)";

  return (
    <div className={styles.chartPanel}>
      <div className={styles.chartPanelHead}>
        <span className={styles.sectionHeader}>{title}</span>
        <span className={styles.chartMeta}>
          {meta?.name} · {activeSymbol} ·{" "}
          <span className={up ? styles.upText : styles.downText}>
            {up ? "+" : ""}
            {(meta?.changePct ?? 0).toFixed(2)}% ({range})
          </span>
        </span>
      </div>
      <div ref={chartDims.ref} className={styles.chartWrap} style={{ height }}>
        {chartDims.ready && (
          <ComposedChart width={chartDims.width} height={chartDims.height} data={data}>
            <defs>
              <linearGradient id="qlChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.2} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval="preserveStartEnd" minTickGap={40} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={52} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
                fontSize: 12,
              }}
              formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Close"]}
            />
            <Area type="monotone" dataKey="price" fill="url(#qlChartFill)" stroke="none" />
            <Line type="monotone" dataKey="price" stroke={stroke} dot={false} strokeWidth={2} />
          </ComposedChart>
        )}
      </div>
    </div>
  );
}
