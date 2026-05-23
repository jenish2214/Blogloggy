"use client";
import { useEffect, useState } from "react";
import { marketApi, type IndexItem } from "@/lib/api";
import styles from "./MarketIndices.module.css";

const REFRESH_MS = 15_000;

export function MarketIndices() {
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      marketApi.getIndices()
        .then(({ indices: data }) => {
          if (!alive) return;
          setIndices(data);
          setLastUpdated(new Date());
          setLoading(false);
        })
        .catch(() => { if (alive) setLoading(false); });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.labelRow}>
          <span className={styles.liveDot} />
          <span className={styles.label}>Global indices · live</span>
        </div>
        {lastUpdated && (
          <span className={styles.updated}>{lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
      <div className={styles.scroll}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.indexItem}>
                <div className="skeleton" style={{ width: "80%", height: 10, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "60%", height: 14 }} />
              </div>
            ))
          : indices.filter(Boolean).map((idx) => {
              const up = (idx.changePct ?? 0) >= 0;
              return (
                <div key={idx.symbol} className={styles.indexItem}>
                  <div className={styles.indexName}>{idx.name}</div>
                  <div className={styles.indexRow}>
                    <span className={styles.indexPrice}>
                      {idx.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={up ? styles.indexChgUp : styles.indexChgDown}>
                      {up ? "+" : ""}{idx.changePct?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
