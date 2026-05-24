import type { QuantLabMode } from "@/lib/store/quantLab";

export function greekLabel(key: string, mode: QuantLabMode): string {
  if (mode === "pro") {
    const pro: Record<string, string> = {
      delta: "Δ Delta",
      gamma: "Γ Gamma",
      theta: "Θ Theta",
      vega: "ν Vega",
      sigma: "Vol σ",
    };
    return pro[key] ?? key;
  }
  const beginner: Record<string, string> = {
    delta: "Price Sensitivity",
    gamma: "Delta Change Rate",
    theta: "Time Decay",
    vega: "Volatility Sensitivity",
    sigma: "Volatility",
    S: "Spot Price",
    K: "Strike Price",
    T: "Time (years)",
    r: "Interest Rate",
  };
  return beginner[key] ?? key;
}

export function fmtPrice(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function fmtSignedPrice(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}$${value.toFixed(digits)}`;
}

export function fmtSignedPct(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatMarketCap(billions: number): string {
  if (billions >= 1000) return `${(billions / 1000).toFixed(2)}T`;
  if (billions >= 1) return `${billions.toFixed(2)}B`;
  return `${(billions * 1000).toFixed(0)}M`;
}

export function sentimentTag(bullish: number, bearish: number): string {
  if (bullish > bearish + 10) return "🟢 Bullish";
  if (bearish > bullish + 10) return "🔴 Bearish";
  return "⚪ Neutral";
}
