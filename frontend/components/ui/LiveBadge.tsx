export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="live-badge">
      <span className="live-badge-dot animate-pulse-dot" />
      {label}
    </span>
  );
}
