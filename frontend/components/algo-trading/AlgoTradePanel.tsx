"use client";
import { useState } from "react";
import Link from "next/link";
import { useAlgoTradingStore } from "@/store/algoTradingStore";
import { usePortfolioStore } from "@/lib/store/portfolio";
import {
  executePaperOrder,
  exitPositionFull,
  getPortfolioPosition,
  qtyFromNotional,
  sellPercentPaper,
} from "@/lib/algoPortfolioBridge";
import { getSymbolConfig } from "@/types/algoTrading";
import { useLivePricesOptional } from "@/components/algo-trading/LivePriceProvider";
import styles from "@/app/(platform)/algo-trading/algo-trading.module.css";

function fmtPrice(n: number, forex?: boolean) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: forex ? 4 : 2,
    maximumFractionDigits: forex ? 4 : 2,
  });
}

export function AlgoTradePanel({ embedded = false }: { embedded?: boolean }) {
  const { symbol, currentPrice, positionSize, lastTradeMessage, openPosition } = useAlgoTradingStore();
  const { cash, positions } = usePortfolioStore();
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const cfg = getSymbolConfig(symbol);
  const pos = positions[cfg.portfolioSymbol];
  const liveFeed = useLivePricesOptional();
  const liveMkt = pos?.currentPrice ?? liveFeed?.livePrices[cfg.portfolioSymbol];
  const tradePrice = liveMkt ?? currentPrice;
  const displayMsg = msg || lastTradeMessage;

  const run = async (fn: () => Promise<{ success: boolean; message: string }>) => {
    setLoading(true);
    setMsg("");
    const res = await fn();
    setMsg(res.message);
    setLoading(false);
  };

  const buyNotional = () =>
    run(() => {
      const q = qtyFromNotional(tradePrice, positionSize, cfg.assetClass);
      return executePaperOrder({ symbol, side: "buy", qty: q, price: tradePrice });
    });

  const buyCustom = () =>
    run(() => {
      const q = parseFloat(qty);
      if (!q || q <= 0) return Promise.resolve({ success: false, message: "Enter valid quantity" });
      return executePaperOrder({ symbol, side: "buy", qty: q, price: tradePrice });
    });

  const sellCustom = () =>
    run(() => {
      const q = parseFloat(qty);
      if (!q || q <= 0) return Promise.resolve({ success: false, message: "Enter valid quantity" });
      return executePaperOrder({ symbol, side: "sell", qty: q, price: tradePrice });
    });

  const sellPct = (pct: number) => run(() => sellPercentPaper(symbol, tradePrice, pct));

  const exitPosition = () => run(() => exitPositionFull(symbol, tradePrice));

  const hasOpenPosition = !!openPosition || !!(pos && pos.qty > 0);

  const maxBuyQty = qtyFromNotional(tradePrice, cash, cfg.assetClass);

  const inner = (
    <div className={styles.tradeBody}>
      {!embedded && (
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Paper Trade</span>
          <Link href="/portfolio" className="btn btn-ghost btn-sm">Portfolio →</Link>
        </div>
      )}

      {embedded && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <Link href="/portfolio" className="btn btn-ghost btn-sm">Portfolio →</Link>
        </div>
      )}

      <div className={styles.tradeSymbol}>
          <strong>{cfg.label}</strong>
          <span className={styles.tradePrice}>
            ${fmtPrice(tradePrice, cfg.assetClass === "forex")}
            {liveMkt != null && (
              <span style={{ fontSize: "0.65rem", color: "var(--up)", marginLeft: 6 }}>LIVE</span>
            )}
          </span>
        </div>

        <div className={styles.tradeStats}>
          <div>
            <span className={styles.tradeStatLabel}>Cash</span>
            <span className={styles.tradeStatVal}>${cash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
          <div>
            <span className={styles.tradeStatLabel}>Position</span>
            <span className={styles.tradeStatVal}>
              {pos ? `${pos.qty} @ $${pos.avgPrice.toFixed(2)}` : "—"}
            </span>
          </div>
        </div>

        <label className={styles.inputLabel}>
          Quantity (optional)
          <input
            className="input"
            type="number"
            min="0"
            step={cfg.assetClass === "stock" ? 1 : 0.0001}
            placeholder={`Max buy ~${maxBuyQty}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>

        <div className={styles.tradeBtnRow}>
          <button type="button" className="btn btn-buy btn-sm" disabled={loading} onClick={buyNotional}>
            Buy ${positionSize.toLocaleString()}
          </button>
          <button type="button" className="btn btn-buy btn-sm" disabled={loading || !qty} onClick={buyCustom}>
            Buy Qty
          </button>
        </div>

        <div className={styles.tradeBtnRow}>
          <button type="button" className="btn btn-sell btn-sm" disabled={loading || !pos} onClick={sellCustom}>
            Sell Qty
          </button>
          <button type="button" className="btn btn-sell btn-sm" disabled={loading || !pos} onClick={() => sellPct(100)}>
            Sell All
          </button>
        </div>

        <div className={styles.sellPctRow}>
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={loading || !getPortfolioPosition(symbol)}
              onClick={() => sellPct(pct)}
            >
              {pct}%
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`btn btn-sell ${styles.exitPositionBtn}`}
          disabled={loading || !hasOpenPosition}
          onClick={exitPosition}
        >
          Exit Position
        </button>

        {displayMsg && (
          <div className={styles.tradeMsg}>{displayMsg}</div>
        )}

        <p className={styles.disclaimerInline}>
          Trades sync to your paper portfolio. Buy to auto-start live session.
        </p>
    </div>
  );

  if (embedded) return inner;
  return <div className={`card ${styles.tradePanel}`}>{inner}</div>;
}
