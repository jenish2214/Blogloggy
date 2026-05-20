export function Skeleton({
  width = "100%",
  height = 16,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton animate-shimmer ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="research-card skeleton-card">
      <Skeleton height={20} width="80%" />
      <Skeleton height={14} width="100%" />
      <Skeleton height={14} width="60%" />
    </div>
  );
}
