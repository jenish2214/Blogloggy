"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { API_HEALTH_LINK } from "@/lib/apiErrors";

type ApiErrorStateProps = {
  message?: string | null;
  onRetry?: () => void;
  /** section = home blocks; compact = marquee; page = full PageState card */
  variant?: "section" | "compact" | "page";
  title?: string;
};

export function ApiErrorState({
  message,
  onRetry,
  variant = "section",
  title = "API unavailable",
}: ApiErrorStateProps) {
  const isPage = variant === "page";

  return (
    <div
      className={`api-error-state api-error-state-${variant}`}
      role="alert"
      aria-live="polite"
    >
      <div className={isPage ? "page-state-error-card" : "api-error-state-inner"}>
        <ServerCrash size={isPage ? 28 : 22} className="api-error-icon" aria-hidden />
        <h3 className="api-error-title">{title}</h3>
        {message && <p className="api-error-message">{message}</p>}
        <p className="api-error-hint page-state-sub">
          Run <code>npm run dev</code> from the project root, then open{" "}
          <a href={API_HEALTH_LINK} target="_blank" rel="noopener noreferrer">
            API health check
          </a>
          .
        </p>
        {onRetry && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
            <RefreshCw size={14} aria-hidden style={{ marginRight: 6 }} />
            Retry API
          </button>
        )}
      </div>
    </div>
  );
}
