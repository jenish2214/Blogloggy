"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function RefreshButton({
  onRefresh,
  loading = false,
  label = "Refresh",
}: {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  label?: string;
}) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    setSpinning(true);
    await onRefresh();
    setTimeout(() => setSpinning(false), 500);
  };

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm refresh-btn"
      onClick={handleClick}
      disabled={loading}
      aria-label={label}
    >
      <RefreshCw
        size={16}
        className={`refresh-spin ${spinning || loading ? "spinning" : ""}`}
      />
      {label}
    </button>
  );
}
