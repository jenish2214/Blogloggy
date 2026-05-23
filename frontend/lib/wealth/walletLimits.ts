/** Per-transaction max deposit (client mandate wallet). */
export const MAX_DEPOSIT_PER_TX = 100_000_000;

/** Max withdrawal per rolling 24 hours per book. */
export const MAX_WITHDRAWAL_24H = 5_000_000;

export function formatWalletLimit(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
