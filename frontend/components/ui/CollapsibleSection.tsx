"use client";

import { useEffect, useId, useState } from "react";
import styles from "./CollapsibleSection.module.css";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  /** Controlled open state from parent (e.g. URL) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  subtitle,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  const storageKey = `qd-collapse-${id}`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const headingId = useId();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored !== null) setInternalOpen(stored === "1");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(next);
      try {
        sessionStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
    onOpenChange?.(next);
  };

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        id={headingId}
        onClick={toggle}
      >
        <span className={styles.chevron} data-open={isOpen}>
          ▾
        </span>
        <span className={styles.titles}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
        {badge && <span className={styles.badge}>{badge}</span>}
      </button>
      {isOpen && (
        <div id={`panel-${id}`} className={styles.panel} role="region" aria-labelledby={headingId}>
          {children}
        </div>
      )}
    </section>
  );
}
