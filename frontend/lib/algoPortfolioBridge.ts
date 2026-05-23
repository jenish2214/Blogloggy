import type { AssetClass } from "@/lib/store/portfolio";
import { usePortfolioStore } from "@/lib/store/portfolio";
import { executePlaceOrder } from "@/lib/trading/placeOrder";
import type { AlgoAssetClass, AlgoSymbol } from "@/types/algoTrading";
import { getSymbolConfig } from "@/types/algoTrading";
import { useAlgoTradingStore } from "@/store/algoTradingStore";

export function qtyFromNotional(price: number, notional: number, assetClass: AlgoAssetClass): number {
  if (price <= 0) return 0;
  const raw = notional / price;
  if (assetClass === "crypto" || assetClass === "forex") return Math.round(raw * 10000) / 10000;
  return Math.max(1, Math.floor(raw));
}

export async function executePaperOrder(params: {
  symbol: AlgoSymbol;
  side: "buy" | "sell";
  qty: number;
  price: number;
}): Promise<{ success: boolean; message: string }> {
  const cfg = getSymbolConfig(params.symbol);
  if (params.qty <= 0) return { success: false, message: "Invalid quantity" };

  const res = await executePlaceOrder({
    symbol: cfg.portfolioSymbol,
    name: cfg.name,
    assetClass: cfg.assetClass as AssetClass,
    side: params.side,
    qty: params.qty,
    orderType: "market",
    currentPrice: params.price,
  });

  if (res.success && params.side === "buy") {
    useAlgoTradingStore.getState().armSessionFromOrder({ qty: params.qty, price: params.price });
  }

  return res;
}

export function getPortfolioPosition(symbol: AlgoSymbol) {
  const cfg = getSymbolConfig(symbol);
  return usePortfolioStore.getState().positions[cfg.portfolioSymbol] ?? null;
}

export async function sellAllPaper(symbol: AlgoSymbol, price: number) {
  const pos = getPortfolioPosition(symbol);
  if (!pos || pos.qty <= 0) return { success: false, message: `No portfolio position in ${symbol}` };
  return executePaperOrder({ symbol, side: "sell", qty: pos.qty, price });
}

export async function exitPositionFull(
  symbol: AlgoSymbol,
  price: number
): Promise<{ success: boolean; message: string }> {
  const store = useAlgoTradingStore.getState();
  const messages: string[] = [];

  const algoClosed = store.closeOpenPositionAtPrice(price);
  if (algoClosed) {
    messages.push(`Algo exit: PnL $${algoClosed.pnl.toFixed(2)}`);
    if (store.syncToPortfolio) {
      const res = await executePaperOrder({ symbol, side: "sell", qty: algoClosed.qty, price });
      if (res.success) messages.push(res.message);
    }
  }

  const portPos = getPortfolioPosition(symbol);
  if (portPos && portPos.qty > 0) {
    const res = await sellAllPaper(symbol, price);
    if (res.success) messages.push(res.message);
    else if (!algoClosed) return res;
  }

  if (messages.length === 0) {
    return { success: false, message: "No open position to exit" };
  }

  useAlgoTradingStore.setState({ lastTradeMessage: messages.join(" · ") });
  return { success: true, message: messages.join(" · ") };
}

export async function sellPercentPaper(symbol: AlgoSymbol, price: number, pct: number) {
  const pos = getPortfolioPosition(symbol);
  if (!pos || pos.qty <= 0) return { success: false, message: `No position to sell` };
  const cfg = getSymbolConfig(symbol);
  let qty = (pos.qty * pct) / 100;
  if (pct >= 100) qty = pos.qty;
  else if (cfg.assetClass === "stock") qty = Math.floor(qty);
  else qty = Math.round(qty * 10000) / 10000;
  if (qty <= 0) return { success: false, message: "Sell quantity too small" };
  return executePaperOrder({ symbol, side: "sell", qty: Math.min(qty, pos.qty), price });
}
