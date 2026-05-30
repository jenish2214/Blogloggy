"use client";

import { useEffect, useState } from "react";
import {
  canPlaceMarketOrders,
  getMarketStatusLabel,
  getUSMarketStatus,
  isUSMarketOpen,
} from "@/lib/trading/marketHours";
import styles from "./MarketStatusBanner.module.css";

export function MarketStatusBanner() {
  const [status, setStatus] = useState(getUSMarketStatus());
  const [label, setLabel] = useState(getMarketStatusLabel());

  useEffect(() => {
    const tick = () => {
      setStatus(getUSMarketStatus());
      setLabel(getMarketStatusLabel());
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const tradingAllowed = canPlaceMarketOrders();
  const isLive = isUSMarketOpen();

  return (
    <div
      className={`${styles.banner} ${status === "weekend" ? styles.frozen : isLive ? styles.live : styles.closed}`}
      role="status"
    >
      <span className={styles.dot} aria-hidden />
      <div className={styles.text}>
        <strong>{label}</strong>
        {!tradingAllowed && <span className={styles.sub}>Weekend — US equities paused</span>}
      </div>
      <span className={styles.badge}>
        {status === "weekend" ? "FROZEN" : isLive ? "LIVE" : "CLOSED"}
      </span>
    </div>
  );
}
