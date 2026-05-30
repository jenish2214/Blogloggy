"use client";

import { useEffect, useState } from "react";
import type { AssetClass } from "@/lib/store/portfolio";
import {
  canPlaceMarketOrders,
  getMarketCalendarStatus,
  getMarketStatusLabel,
  detectMarketCalendar,
  type MarketHoursContext,
} from "@/lib/trading/marketHours";
import styles from "@/components/portfolio/MarketStatusBanner.module.css";

export function TradeSymbolMarketBanner({
  symbol,
  assetClass,
}: {
  symbol: string;
  assetClass: AssetClass;
}) {
  const ctx: MarketHoursContext = { symbol, assetClass };

  const [label, setLabel] = useState(() => getMarketStatusLabel(ctx));
  const [status, setStatus] = useState(() =>
    getMarketCalendarStatus(detectMarketCalendar(ctx))
  );

  useEffect(() => {
    const tick = () => {
      setLabel(getMarketStatusLabel(ctx));
      setStatus(getMarketCalendarStatus(detectMarketCalendar(ctx)));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [symbol, assetClass]);

  const tradingAllowed = canPlaceMarketOrders(ctx);
  const isLive = status === "open";

  return (
    <div
      className={`${styles.banner} ${status === "weekend" ? styles.frozen : isLive ? styles.live : styles.closed}`}
      role="status"
    >
      <span className={styles.dot} aria-hidden />
      <div className={styles.text}>
        <strong>{label}</strong>
        {!tradingAllowed && (
          <span className={styles.sub}>
            New orders for this symbol are blocked until the market reopens (crypto trades 24/7).
          </span>
        )}
        {tradingAllowed && isLive && (
          <span className={styles.sub}>Market open · live prices · orders accepted</span>
        )}
        {tradingAllowed && !isLive && status !== "weekend" && (
          <span className={styles.sub}>After hours · paper orders use last available price</span>
        )}
      </div>
      <span className={styles.badge}>
        {status === "weekend" ? "FROZEN" : isLive ? "LIVE" : "CLOSED"}
      </span>
    </div>
  );
}
