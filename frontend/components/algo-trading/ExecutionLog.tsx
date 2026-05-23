"use client";
import { useEffect, useRef } from "react";
import type { LogEntry } from "@/types/algoTrading";
import styles from "@/app/algo-trading/algo-trading.module.css";

export interface ExecutionLogProps {
  logs: LogEntry[];
  maxHeight?: string;
  bare?: boolean;
}

function formatLogLine(log: LogEntry): string {
  const d = new Date(log.timestamp);
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  const time = `${d.toTimeString().slice(0, 8)}.${ms}`;
  return `[${time}] [${log.level}] ${log.message}`;
}

export function ExecutionLog({ logs, maxHeight = "260px", bare = false }: ExecutionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayLogs = logs.length > 100 ? logs.slice(-100) : logs;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  const body = (
    <div
      ref={scrollRef}
      className={styles.terminalBody}
      style={{ maxHeight }}
      tabIndex={0}
      role="log"
      aria-live="polite"
      aria-label="Algorithm execution log"
    >
      {displayLogs.map((log) => (
        <div key={log.id} className={`${styles.terminalLine} ${styles[`term${log.level}`]}`}>
          {formatLogLine(log)}
        </div>
      ))}
    </div>
  );

  if (bare) return body;

  return (
    <div className={styles.terminalWrap}>
      <div className={styles.terminalHeader}>Execution Log</div>
      {body}
      <p className={styles.disclaimer}>Simulated data. Not financial advice.</p>
    </div>
  );
}
