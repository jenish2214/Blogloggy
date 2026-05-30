"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Treemap, ResponsiveContainer } from "recharts";
import { getBasicFinancials } from "@/lib/finnhub";
import type { SnapshotPosition } from "@/lib/trading/portfolioSnapshot";
import styles from "./features.module.css";

type ViewMode = "day" | "pnl" | "weight" | "beta";

function colorForValue(mode: ViewMode, value: number) {
  if (mode === "weight") return "rgba(99, 102, 241, 0.55)";
  if (value >= 2) return "#34d399";
  if (value >= 0) return "#6ee7b7";
  if (value >= -2) return "#f87171";
  return "#ef4444";
}

interface TreemapNode {
  [key: string]: string | number | undefined;
  name: string;
  marketValue: number;
  displayValue: number;
  fill: string;
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  beta?: number;
  betaContrib?: number;
}

interface Props {
  positions: SnapshotPosition[];
}

function CustomCell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  displayValue?: number;
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, displayValue, fill } = props;
  if (width < 4 || height < 4) return null;
  const showLabel = width > 48 && height > 36;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--border)" strokeWidth={1} rx={4} />
      {showLabel && name && (
        <>
          <text x={x + 8} y={y + 18} fill="#0f172a" fontSize={11} fontWeight={700}>
            {name}
          </text>
          <text x={x + 8} y={y + 32} fill="#0f172a" fontSize={10} opacity={0.85}>
            {displayValue != null
              ? `${displayValue >= 0 && displayValue < 100 ? "+" : ""}${displayValue.toFixed(1)}${Math.abs(displayValue) >= 100 || displayValue < -50 ? "" : "%"}`
              : ""}
          </text>
        </>
      )}
    </g>
  );
}

export function PortfolioHeatmap({ positions }: Props) {
  const [mode, setMode] = useState<ViewMode>("day");
  const [betas, setBetas] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<TreemapNode | null>(null);

  useEffect(() => {
    const syms = positions.map((p) => p.symbol);
    void Promise.all(
      syms.map(async (s) => {
        const f = await getBasicFinancials(s);
        return { s, beta: f?.metric?.beta ?? 1 };
      })
    ).then((rows) => {
      const map: Record<string, number> = {};
      for (const r of rows) map[r.s] = r.beta ?? 1;
      setBetas(map);
    });
  }, [positions]);

  const { treeData, totalValue } = useMemo(() => {
    const tv = positions.reduce((s, p) => s + Math.max(p.marketValue, 0), 0) || 1;
    const portfolioBeta = positions.reduce(
      (s, p) => s + (betas[p.symbol] ?? 1) * (p.marketValue / tv),
      0
    );

    const nodes: TreemapNode[] = positions
      .filter((p) => p.marketValue > 0)
      .map((p) => {
        const beta = betas[p.symbol] ?? 1;
        const weightPct = (p.marketValue / tv) * 100;
        const betaContrib = beta * (p.marketValue / tv);
        let displayValue = p.dayChangePct ?? 0;
        if (mode === "pnl") displayValue = p.unrealizedPnlPct ?? 0;
        if (mode === "weight") displayValue = weightPct;
        if (mode === "beta") displayValue = portfolioBeta > 0 ? (betaContrib / portfolioBeta) * 100 : 0;

        return {
          name: p.symbol,
          symbol: p.symbol,
          marketValue: p.marketValue,
          displayValue,
          fill: colorForValue(mode, displayValue),
          qty: p.qty,
          avgPrice: p.avgPrice,
          currentPrice: p.currentPrice,
          unrealizedPnl: p.unrealizedPnl,
          unrealizedPnlPct: p.unrealizedPnlPct,
          beta,
          betaContrib,
        };
      });

    return { treeData: nodes, totalValue: tv };
  }, [positions, betas, mode]);

  const modeLabels: Record<ViewMode, string> = {
    day: "Day %",
    pnl: "Total P&L %",
    weight: "Weight %",
    beta: "Beta contrib",
  };

  if (treeData.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No positions to display.</p>
    );
  }

  return (
    <div>
      <div className={styles.heatModeBar}>
        {(Object.keys(modeLabels) as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.heatModeBtn} ${mode === m ? styles.heatModeActive : ""}`}
            onClick={() => {
              setMode(m);
              setSelected(null);
            }}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      <div className={styles.heatWrap}>
        <ResponsiveContainer width="100%" height={320}>
          <Treemap
            data={treeData}
            dataKey="marketValue"
            aspectRatio={4 / 3}
            stroke="var(--border)"
            content={<CustomCell />}
            onClick={(node) => {
              const payload = node as unknown as TreemapNode;
              if (payload?.symbol) setSelected(payload);
            }}
          />
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className={styles.drillPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{selected.symbol}</h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {selected.qty} shares · β {selected.beta?.toFixed(2) ?? "—"}
                {selected.betaContrib != null &&
                  ` · ${(selected.betaContrib * 100).toFixed(1)}% of portfolio beta`}
              </p>
            </div>
            <Link
              href={`/trade?symbol=${encodeURIComponent(selected.symbol)}`}
              className="btn btn-primary btn-sm"
            >
              Trade →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
              marginTop: 12,
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
            }}
          >
            <div>
              <div style={{ color: "var(--text-muted)" }}>Market value</div>
              <strong>${selected.marketValue.toLocaleString()}</strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Avg / Last</div>
              <strong>
                ${selected.avgPrice.toFixed(2)} / ${selected.currentPrice.toFixed(2)}
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>Unrealized P&L</div>
              <strong style={{ color: selected.unrealizedPnl >= 0 ? "var(--up)" : "var(--down)" }}>
                {selected.unrealizedPnl >= 0 ? "+" : ""}$
                {selected.unrealizedPnl.toFixed(0)} ({selected.unrealizedPnlPct.toFixed(1)}%)
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)" }}>% of book</div>
              <strong>{((selected.marketValue / totalValue) * 100).toFixed(1)}%</strong>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setSelected(null)}
          >
            Close panel
          </button>
        </div>
      )}
    </div>
  );
}
