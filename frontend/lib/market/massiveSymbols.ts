/** Map portfolio symbols → Massive (Polygon) tickers. */

const YAHOO_ONLY: Record<string, string> = {
  CRUDE_OIL: "CL=F",
  GOLD: "GC=F",
  NATURAL_GAS: "NG=F",
};

/** portfolio symbol → Massive ticker (null = skip to next provider). */
export function toMassiveSymbol(symbol: string): string | null {
  const s = symbol.toUpperCase().trim();

  if (s in YAHOO_ONLY || s.includes("=F")) return null;

  if (s.endsWith("-USD")) {
    const base = s.replace("-USD", "");
    return `X:${base}USD`;
  }

  if (s.includes("=X")) {
    const pair = s.replace("=X", "").replace("/", "");
    if (pair.length === 6) return `C:${pair}`;
  }

  if (s === "GOLD") return "X:XAUUSD";

  return s;
}
