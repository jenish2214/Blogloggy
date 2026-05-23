"use client";

import type { ReactNode } from "react";
import styles from "./welcome.module.css";

interface WelcomePageShellProps {
  step?: 1 | 2;
  singleStep?: boolean;
  stepLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
  footer: ReactNode;
}

export function WelcomePageShell({
  step = 1,
  singleStep = false,
  stepLabel,
  title,
  subtitle,
  badge,
  children,
  footer,
}: WelcomePageShellProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <div className={styles.logoMark}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <polyline
              points="3,16 7,10 11,13 15,6 19,9"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <div className={styles.brandName}>QuantDesk</div>
          <div className={styles.brandSub}>Education first · paper trading demo</div>
        </div>
      </div>

      {!singleStep && (
        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.stepOn : ""}`}>
            <span className={styles.stepNum}>1</span>
            <span>Terms</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepOn : ""}`}>
            <span className={styles.stepNum}>2</span>
            <span>About us</span>
          </div>
        </div>
      )}

      <article className={styles.card}>
        <header className={styles.head}>
          {badge && <span className={styles.badge}>{badge}</span>}
          <p className={styles.stepLabel}>{stepLabel}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>{subtitle}</p>
        </header>
        <div className={styles.body}>{children}</div>
        <footer className={styles.foot}>{footer}</footer>
      </article>
    </div>
  );
}
