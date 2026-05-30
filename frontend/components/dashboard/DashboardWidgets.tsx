"use client";

import dynamic from "next/dynamic";
import styles from "@/app/(platform)/dashboard.module.css";

function WidgetSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeleton} role="status" aria-label={`Loading ${label}`}>
      <span className={styles.skeletonBar} />
      <span className={styles.skeletonBar} style={{ width: "72%" }} />
      <span className={styles.skeletonBar} style={{ width: "48%" }} />
    </div>
  );
}

const LiveMarketWatch = dynamic(
  () => import("@/components/trading/LiveMarketWatch").then((m) => m.LiveMarketWatch),
  { loading: () => <WidgetSkeleton label="market watch" />, ssr: false }
);

const MarketIndices = dynamic(
  () => import("@/components/trading/MarketIndices").then((m) => m.MarketIndices),
  { loading: () => <WidgetSkeleton label="indices" />, ssr: false }
);

const EarningsCalendar = dynamic(
  () => import("@/components/features/EarningsCalendar").then((m) => m.EarningsCalendar),
  { loading: () => <WidgetSkeleton label="earnings" />, ssr: false }
);

const NewUserStockSuggestions = dynamic(
  () =>
    import("@/components/dashboard/NewUserStockSuggestions").then((m) => m.NewUserStockSuggestions),
  { loading: () => <WidgetSkeleton label="suggestions" />, ssr: false }
);

const TickerTape = dynamic(
  () => import("@/components/trading/TickerTape").then((m) => m.TickerTape),
  { loading: () => null, ssr: false }
);

export function DashboardTicker() {
  return <TickerTape />;
}

export function DashboardMarketWatch() {
  return <LiveMarketWatch />;
}

export function DashboardMarketIndices() {
  return <MarketIndices />;
}

export function DashboardEarnings() {
  return <EarningsCalendar compact />;
}

export function DashboardSuggestions() {
  return <NewUserStockSuggestions />;
}
