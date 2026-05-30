const KEY = "quantdesk:daily-loss-limit";

export function getDailyLossLimit(): number {
  if (typeof window === "undefined") return 2500;
  const raw = localStorage.getItem(KEY);
  const n = raw ? Number(raw) : 2500;
  return Number.isFinite(n) && n > 0 ? n : 2500;
}

export function setDailyLossLimit(amount: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(Math.max(100, amount)));
}
