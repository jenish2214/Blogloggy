"use client";
import { memo, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  Customized,
} from "recharts";
import { computeEMA } from "@/lib/priceDataGenerator";
import { useChartDimensions } from "@/lib/useChartDimensions";
import type { CandleData, SignalEvent } from "@/types/algoTrading";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

export interface LivePriceChartProps {
  symbol: string;
  interval?: string;
  candles: CandleData[];
  strategySignals: SignalEvent[];
}

interface ChartPoint extends CandleData {
  ema20: number | null;
  ema50: number | null;
  signal?: "BUY" | "SELL";
}

function CandlesLayer(props: {
  xAxisMap?: Record<number, { scale: (v: number) => number; bandwidth?: () => number }>;
  yAxisMap?: Record<string, { scale: (v: number) => number }>;
  offset?: { left: number; top: number; width: number; height: number };
  formattedGraphicalItems?: { props?: { data?: ChartPoint[] } }[];
}) {
  const { xAxisMap, yAxisMap, offset, formattedGraphicalItems } = props;
  if (!xAxisMap || !yAxisMap || !offset) return null;

  const xAxis = xAxisMap[0];
  const yAxis = yAxisMap.price ?? yAxisMap[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const data: ChartPoint[] = formattedGraphicalItems?.[0]?.props?.data ?? [];
  const bandwidth = xAxis.bandwidth?.() ?? 8;

  return (
    <g className={styles.candles}>
      {data.map((d, i) => {
        const x = (xAxis.scale(i) ?? 0) + offset.left + bandwidth / 2;
        const yHigh = yAxis.scale(d.high) + offset.top;
        const yLow = yAxis.scale(d.low) + offset.top;
        const yOpen = yAxis.scale(d.open) + offset.top;
        const yClose = yAxis.scale(d.close) + offset.top;
        const up = d.close >= d.open;
        const color = up ? "var(--algo-buy)" : "var(--algo-sell)";
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
        const w = Math.max(bandwidth * 0.6, 3);

        return (
          <g key={d.timestamp}>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
            <rect x={x - w / 2} y={bodyTop} width={w} height={bodyH} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

function SignalDot(props: { cx?: number; cy?: number; payload?: { signal?: string } }) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload?.signal) return null;
  const buy = payload.signal === "BUY";
  const size = 7;
  const points = buy
    ? `${cx},${cy - size} ${cx - size},${cy + size} ${cx + size},${cy + size}`
    : `${cx},${cy + size} ${cx - size},${cy - size} ${cx + size},${cy - size}`;
  return (
    <polygon
      points={points}
      fill={buy ? "var(--algo-buy)" : "var(--algo-sell)"}
      stroke="var(--algo-bg-primary)"
      strokeWidth={1}
    />
  );
}

function LivePriceChartInner({ symbol, candles, strategySignals }: LivePriceChartProps) {
  const chartData = useMemo((): ChartPoint[] => {
    const ema20 = computeEMA(candles, 20);
    const ema50 = computeEMA(candles, 50);
    const signalMap = new Map<number, "BUY" | "SELL">();
    for (const s of strategySignals) {
      signalMap.set(s.timestamp, s.type);
    }

    return candles.map((c, i) => ({
      ...c,
      ema20: ema20[i],
      ema50: ema50[i],
      signal: signalMap.get(c.timestamp),
    }));
  }, [candles, strategySignals]);

  const signalPoints = useMemo(
    () => chartData.filter((d) => d.signal).map((d) => ({ ...d, y: d.close })),
    [chartData]
  );

  const priceDomain = useMemo(() => {
    if (!candles.length) return [0, 1];
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const pad = (Math.max(...highs) - Math.min(...lows)) * 0.05;
    return [Math.min(...lows) - pad, Math.max(...highs) + pad];
  }, [candles]);

  const volMax = useMemo(() => Math.max(...candles.map((c) => c.volume), 1), [candles]);

  const priceChart = useChartDimensions(260);
  const volChart = useChartDimensions(72);

  return (
    <div className={`card ${styles.panel} ${styles.panelActive}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{symbol}</span>
        <span className={styles.panelMeta}>1m · Simulated feed</span>
      </div>
      <div className={styles.chartWrap}>
        <div ref={priceChart.ref} className={styles.chartPriceArea}>
          {priceChart.ready && (
            <ComposedChart width={priceChart.width} height={priceChart.height} data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 9, fill: "var(--algo-text-muted)", fontFamily: "var(--algo-font-mono)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              yAxisId="price"
              domain={priceDomain}
              tick={{ fontSize: 9, fill: "var(--algo-text-secondary)", fontFamily: "var(--algo-font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(2)}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "var(--algo-bg-tertiary)",
                border: "1px solid var(--algo-border)",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "var(--algo-font-mono)",
              }}
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : Number(value);
                if (name === "volume") return [v.toLocaleString("en-IN"), "Vol"];
                return [Number.isFinite(v) ? v.toFixed(2) : String(value), String(name)];
              }}
            />
            <Bar yAxisId="price" dataKey="close" fill="transparent" barSize={8} isAnimationActive={false} />
            <Customized component={CandlesLayer} />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="ema20"
              stroke="var(--algo-accent-secondary)"
              dot={false}
              strokeWidth={1.2}
              isAnimationActive={false}
              name="EMA 20"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="ema50"
              stroke="#22d3ee"
              dot={false}
              strokeWidth={1.2}
              isAnimationActive={false}
              name="EMA 50"
            />
            <Scatter
              yAxisId="price"
              data={signalPoints}
              dataKey="close"
              shape={<SignalDot />}
              isAnimationActive={false}
            />
          </ComposedChart>
          )}
        </div>
        <div ref={volChart.ref} className={styles.chartVolArea}>
          {volChart.ready && (
          <ComposedChart width={volChart.width} height={volChart.height} data={chartData} margin={{ top: 0, right: 12, left: 4, bottom: 4 }}>
            <XAxis dataKey="timeLabel" hide />
            <YAxis hide domain={[0, volMax * 1.2]} />
            <Bar
              dataKey="volume"
              fill="var(--algo-text-muted)"
              opacity={0.35}
              isAnimationActive={false}
            />
          </ComposedChart>
          )}
        </div>
        <div className={styles.chartLegend}>
          <span><i className={styles.legendEma20} /> EMA 20</span>
          <span><i className={styles.legendEma50} /> EMA 50</span>
          <span><i className={styles.legendBuy} /> BUY</span>
          <span><i className={styles.legendSell} /> SELL</span>
        </div>
      </div>
      <p className={styles.disclaimer}>Simulated data. Not financial advice.</p>
    </div>
  );
}

export const LivePriceChart = memo(LivePriceChartInner);
