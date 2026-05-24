"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMarketStatusLabel, getUSMarketStatus, isUSMarketOpen } from "@/lib/trading/marketHours";
import styles from "./DashboardCommandBar.module.css";

export function DashboardCommandBar() {
  const [now, setNow] = useState<Date | null>(null);
  const [status, setStatus] = useState<ReturnType<typeof getUSMarketStatus>>("closed");
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      setStatus(getUSMarketStatus(d));
      setLabel(getMarketStatusLabel(d));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const live = status === "open" && isUSMarketOpen();

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.brand}>QuantDesk</span>
        <span className={styles.sep}>|</span>
        <span className={styles.tag}>Paper Trading Terminal</span>
      </div>
      <div className={styles.center}>
        <span className={`${styles.status} ${live ? styles.statusLive : status === "weekend" ? styles.statusFrozen : styles.statusClosed}`}>
          <span className={styles.statusDot} aria-hidden />
          {label}
        </span>
        {now && (
          <span className={styles.clock}>
            {now.toLocaleString("en-US", {
              timeZone: "America/New_York",
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}{" "}
            ET
          </span>
        )}
      </div>
      <div className={styles.actions}>
        <Link href="/trade" className="btn btn-primary btn-sm">
          Trade
        </Link>
        <Link href="/portfolio" className="btn btn-ghost btn-sm">
          Portfolio
        </Link>
        <Link href="/quant-lab" className="btn btn-ghost btn-sm">
          Quant Lab
        </Link>
      </div>
    </div>
  );
}
