"use client";
import { useEffect, useRef, useState } from "react";
import { marketApi, type ChartData } from "@/lib/api";

const RANGES = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "5D", range: "5d", interval: "30m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1wk" },
  { label: "5Y", range: "5y", interval: "1mo" },
];

interface Props {
  symbol: string;
  height?: number;
}

export function PriceChart({ symbol, height = 260 }: Props) {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [range, setRange] = useState(RANGES[0]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ x: number; y: number; price: number; time: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    marketApi.getChart(symbol, range.range, range.interval)
      .then(({ chart: c }) => { setChart(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol, range]);

  const candles = chart?.candles ?? [];
  const closes = candles.map((c) => c.close).filter((v) => v != null);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range_ = max - min || 1;

  const W = 800, H = height;
  const PAD = { top: 10, right: 8, bottom: 24, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / Math.max(closes.length - 1, 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - ((v - min) / range_) * innerH;

  const polyline = closes.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const area = closes.length > 0
    ? `M ${toX(0)} ${toY(closes[0])} ` +
      closes.map((v, i) => `L ${toX(i)} ${toY(v)}`).join(" ") +
      ` L ${toX(closes.length - 1)} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`
    : "";

  const isPositive = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
  const lineColor = isPositive ? "var(--up)" : "var(--down)";
  const areaColor = isPositive ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !closes.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - PAD.left;
    const idx = Math.round((relX / innerW) * (closes.length - 1));
    const clampedIdx = Math.max(0, Math.min(closes.length - 1, idx));
    setHovered({ x: toX(clampedIdx), y: toY(closes[clampedIdx]), price: closes[clampedIdx], time: candles[clampedIdx]?.time });
  };

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => min + (range_ / 4) * i);

  return (
    <div style={{ position: "relative" }}>
      {/* Range selector */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r)}
            style={{
              background: range.label === r.label ? "var(--accent-soft)" : "transparent",
              border: range.label === r.label ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              color: range.label === r.label ? "var(--accent-2)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              padding: "3px 8px",
              borderRadius: 2,
              cursor: "pointer",
              fontWeight: range.label === r.label ? 600 : 400,
            }}
          >
            {r.label}
          </button>
        ))}
        {hovered && (
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            ${hovered.price?.toFixed(2)} · {new Date(hovered.time * 1000).toLocaleDateString()}
          </span>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ width: "100%", height }} />
      ) : closes.length === 0 ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          No chart data available
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height, display: "block", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Y-axis */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} y1={toY(tick)} x2={W - PAD.right} y2={toY(tick)} stroke="var(--border-subtle)" strokeWidth={0.5} />
              <text x={PAD.left - 4} y={toY(tick) + 4} textAnchor="end" fill="var(--text-muted)" style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}>
                {tick >= 1000 ? (tick / 1000).toFixed(1) + "k" : tick.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={area} fill={areaColor} />

          {/* Line */}
          <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" />

          {/* Hover crosshair */}
          {hovered && (
            <>
              <line x1={hovered.x} y1={PAD.top} x2={hovered.x} y2={H - PAD.bottom} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3,3" />
              <circle cx={hovered.x} cy={hovered.y} r={4} fill={lineColor} stroke="var(--bg-base)" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
    </div>
  );
}
