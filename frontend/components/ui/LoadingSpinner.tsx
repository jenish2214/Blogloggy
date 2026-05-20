"use client";

export function LoadingSpinner({
  label = "Loading…",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? 28 : size === "lg" ? 48 : 36;

  return (
    <div className="loading-spinner-wrap" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-spinner" style={{ width: dim, height: dim }}>
        <span className="loading-bar loading-bar-1" />
        <span className="loading-bar loading-bar-2" />
        <span className="loading-bar loading-bar-3" />
        <span className="loading-bar loading-bar-4" />
      </div>
      {label && <p className="loading-label">{label}</p>}
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="loading-grid" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="loading-grid-card animate-load-fade" style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="skeleton animate-shimmer" style={{ height: 18, width: "70%" }} />
          <div className="skeleton animate-shimmer" style={{ height: 14, width: "100%", marginTop: 12 }} />
          <div className="skeleton animate-shimmer" style={{ height: 14, width: "85%", marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function PageLoader({ label = "Loading page…" }: { label?: string }) {
  return (
    <div className="page-loader">
      <LoadingSpinner size="lg" label={label} />
      <LoadingGrid count={3} />
    </div>
  );
}
