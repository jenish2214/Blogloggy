"use client";

import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  badge,
  actions,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`page-main page-shell ${wide ? "page-shell-wide" : ""}`}>
      <div className="container">
        <header className="page-shell-header">
          <div className="page-shell-intro">
            {badge && <span className="page-shell-badge">{badge}</span>}
            <h1 className="page-shell-title">{title}</h1>
            {subtitle && <p className="page-shell-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-shell-actions">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
