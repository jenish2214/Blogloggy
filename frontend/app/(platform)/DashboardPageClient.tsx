"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  DashboardEarnings,
  DashboardMarketIndices,
  DashboardMarketWatch,
  DashboardSuggestions,
  DashboardTicker,
} from "@/components/dashboard/DashboardWidgets";
import {
  buildDashboardFromSummary,
  buildGuestDashboard,
} from "@/lib/dashboard/buildUserDashboard";
import {
  DASHBOARD_KPIS,
  DASHBOARD_QUICK_ACTIONS,
  DASHBOARD_WORKSPACES,
  type DashboardKpi,
  type DashboardWorkspace,
} from "@/lib/dashboard/dashboardData";
import type {
  DashboardBenchmark,
  DashboardBookSummary,
  DashboardSummaryPayload,
  DashboardTotals,
} from "@/lib/dashboard/types";
import { dashboardApi } from "@/lib/api";
import { getClientCache } from "@/lib/clientFetchCache";
import { useDocumentVisible } from "@/lib/hooks/useDocumentVisible";
import styles from "@/app/(platform)/dashboard.module.css";

const CACHE_KEY = "GET:/api/dashboard";
const LIVE_POLL_MS = 20_000;

function guestPayloadFallback(): DashboardSummaryPayload {
  const g = buildGuestDashboard();
  return {
    guest: true,
    portfolio: {
      accountLabel: "Guest",
      cash: 100_000,
      totalValue: 100_000,
      startingCapital: 100_000,
      totalPnl: 0,
      totalPnlPct: 0,
      openPositions: 0,
      orderCount: 0,
      invested: 0,
    },
    firm: { aum: 0, clientBooks: 0, openPositions: 0 },
    totals: {
      totalPortfolioValue: 100_000,
      totalStartingCapital: 100_000,
      totalPnl: 0,
      totalPnlPct: 0,
      totalCash: 100_000,
      totalInvested: 0,
      unrealizedPnl: 0,
      bookCount: 0,
      openPositions: 0,
      lastUpdated: new Date().toISOString(),
    },
    books: [],
    benchmark: null,
    activity: { watchlistSymbols: 0, walletTransactions: 0, clientBooks: 0 },
  };
}

type DashboardViewState = {
  guest: boolean;
  greeting: string;
  subtitle: string;
  kpis: DashboardKpi[];
  workspaces: DashboardWorkspace[];
  totals: DashboardTotals | null;
  books: DashboardBookSummary[];
  benchmark: DashboardBenchmark | null;
};

function stateFromPayload(data: DashboardSummaryPayload): DashboardViewState {
  if (data.guest) {
    const guestView = buildGuestDashboard();
    return {
      guest: true,
      greeting: guestView.greeting,
      subtitle: guestView.subtitle,
      kpis: DASHBOARD_KPIS,
      workspaces: guestView.workspaces,
      totals: null,
      books: [],
      benchmark: null,
    };
  }
  const view = buildDashboardFromSummary(data);
  return {
    guest: false,
    greeting: view.greeting,
    subtitle: view.subtitle,
    kpis: view.kpis ?? DASHBOARD_KPIS,
    workspaces: view.workspaces,
    totals: view.totals ?? data.totals,
    books: view.books ?? data.books,
    benchmark: view.benchmark ?? data.benchmark,
  };
}

export function DashboardPageClient() {
  const visible = useDocumentVisible();
  const cachedOnMount = getClientCache<DashboardSummaryPayload>(CACHE_KEY);
  const cachedState = cachedOnMount ? stateFromPayload(cachedOnMount) : null;

  const [loading, setLoading] = useState(!cachedState);
  const [refreshing, setRefreshing] = useState(false);
  const [guest, setGuest] = useState(cachedState?.guest ?? true);
  const [greeting, setGreeting] = useState(cachedState?.greeting ?? "Dashboard");
  const [subtitle, setSubtitle] = useState(
    cachedState?.subtitle ?? "Paper trading overview · live market data"
  );
  const [kpis, setKpis] = useState<DashboardKpi[]>(cachedState?.kpis ?? DASHBOARD_KPIS);
  const [workspaces, setWorkspaces] = useState<DashboardWorkspace[]>(
    cachedState?.workspaces ?? DASHBOARD_WORKSPACES
  );
  const [totals, setTotals] = useState<DashboardTotals | null>(cachedState?.totals ?? null);
  const [books, setBooks] = useState<DashboardBookSummary[]>(cachedState?.books ?? []);
  const [benchmark, setBenchmark] = useState<DashboardBenchmark | null>(
    cachedState?.benchmark ?? null
  );
  const [quickActions] = useState(DASHBOARD_QUICK_ACTIONS);

  const applyState = useCallback((next: DashboardViewState) => {
    setGuest(next.guest);
    setGreeting(next.greeting);
    setSubtitle(next.subtitle);
    setKpis(next.kpis);
    setWorkspaces(next.workspaces);
    setTotals(next.totals);
    setBooks(next.books);
    setBenchmark(next.benchmark);
  }, []);

  const loadDashboard = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true);
      try {
        const data = await dashboardApi.get(force);
        applyState(stateFromPayload(data));
      } catch {
        applyState(stateFromPayload(guestPayloadFallback()));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyState]
  );

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    const onRefresh = () => void loadDashboard(true);
    window.addEventListener("wallet-updated", onRefresh);
    window.addEventListener("quantdesk:order-placed", onRefresh);
    return () => {
      window.removeEventListener("wallet-updated", onRefresh);
      window.removeEventListener("quantdesk:order-placed", onRefresh);
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (guest || !visible) return;
    const id = setInterval(() => void loadDashboard(true), LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [guest, visible, loadDashboard]);

  if (loading) {
    return (
      <div className={styles.root} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.skeleton} style={{ minHeight: 140 }}>
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonBar} style={{ width: "55%" }} />
        </div>
        <div className={styles.kpiRow}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} style={{ minHeight: 100 }}>
              <span className={styles.skeletonBar} />
              <span className={styles.skeletonBar} style={{ width: "40%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {guest ? null : <DashboardTicker />}
      <DashboardView
        greeting={greeting}
        subtitle={subtitle}
        kpis={kpis}
        quickActions={quickActions}
        workspaces={workspaces}
        portfolioTotals={totals}
        portfolioBooks={books}
        benchmark={benchmark}
        portfolioRefreshing={refreshing}
        marketWatch={<DashboardMarketWatch />}
        marketIndices={<DashboardMarketIndices />}
        earnings={<DashboardEarnings />}
        suggestions={<DashboardSuggestions />}
      />
    </>
  );
}
