"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { PageLoading } from "@/components/shared/PageLoading";
import { RefreshingBar } from "@/components/shared/RefreshingBar";
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
  DASHBOARD_QUICK_ACTIONS,
  DASHBOARD_WORKSPACES,
  type DashboardKpi,
  type DashboardWorkspace,
} from "@/lib/dashboard/dashboardData";
import type {
  DashboardBenchmark,
  DashboardBookSummary,
  DashboardScope,
  DashboardSummaryPayload,
  DashboardTotals,
} from "@/lib/dashboard/types";
import { dashboardApi } from "@/lib/api";
import { getClientCache } from "@/lib/clientFetchCache";
import { useDocumentVisible } from "@/lib/hooks/useDocumentVisible";
import { useActiveBookStore } from "@/lib/store/activeBook";
import styles from "@/app/(platform)/dashboard.module.css";

const LIVE_POLL_MS = 20_000;

function dashboardCacheKey(portfolioId?: string, clientId?: string | null) {
  const params = new URLSearchParams();
  if (portfolioId) params.set("portfolioId", portfolioId);
  if (clientId) params.set("clientId", clientId);
  const qs = params.toString();
  return qs ? `GET:/api/dashboard?${qs}` : "GET:/api/dashboard";
}

const GUEST_KPIS: DashboardKpi[] = [
  {
    label: "Sign in",
    value: "Required",
    note: "Your dashboard shows only your personal and client books",
    trend: "Paper trading",
    change: "Free",
    changeDirection: "neutral",
  },
];

type DashboardViewState = {
  guest: boolean;
  greeting: string;
  subtitle: string;
  kpis: DashboardKpi[];
  workspaces: DashboardWorkspace[];
  totals: DashboardTotals | null;
  books: DashboardBookSummary[];
  benchmark: DashboardBenchmark | null;
  scope: DashboardScope;
  activePortfolioId: string | null;
  personalAum: number;
  clientAum: number;
};

function stateFromPayload(data: DashboardSummaryPayload): DashboardViewState {
  if (data.guest) {
    const guestView = buildGuestDashboard();
    return {
      guest: true,
      greeting: guestView.greeting,
      subtitle: guestView.subtitle,
      kpis: GUEST_KPIS,
      workspaces: guestView.workspaces,
      totals: null,
      books: [],
      benchmark: null,
      scope: "all",
      activePortfolioId: null,
      personalAum: 0,
      clientAum: 0,
    };
  }
  const view = buildDashboardFromSummary(data);
  return {
    guest: false,
    greeting: view.greeting,
    subtitle: view.subtitle,
    kpis: view.kpis ?? [],
    workspaces: view.workspaces,
    totals: view.totals ?? data.totals,
    books: view.books ?? data.books,
    benchmark: view.benchmark ?? data.benchmark,
    scope: data.scope ?? "all",
    activePortfolioId: data.activePortfolioId ?? null,
    personalAum: data.personalAum ?? 0,
    clientAum: data.clientAum ?? 0,
  };
}

export function DashboardPageClient() {
  const visible = useDocumentVisible();
  const activeBook = useActiveBookStore((s) => s.activeBook);

  const cacheKey = useMemo(
    () => dashboardCacheKey(activeBook?.portfolioId, activeBook?.clientId),
    [activeBook?.portfolioId, activeBook?.clientId]
  );

  const cachedOnMount = getClientCache<DashboardSummaryPayload>(cacheKey);
  const cachedState = cachedOnMount ? stateFromPayload(cachedOnMount) : null;

  const [loading, setLoading] = useState(!cachedState);
  const [refreshing, setRefreshing] = useState(false);
  const [guest, setGuest] = useState(cachedState?.guest ?? true);
  const [greeting, setGreeting] = useState(cachedState?.greeting ?? "Dashboard");
  const [subtitle, setSubtitle] = useState(
    cachedState?.subtitle ?? "Sign in to see your personal and client book data"
  );
  const [kpis, setKpis] = useState<DashboardKpi[]>(cachedState?.kpis ?? GUEST_KPIS);
  const [workspaces, setWorkspaces] = useState<DashboardWorkspace[]>(
    cachedState?.workspaces ?? DASHBOARD_WORKSPACES
  );
  const [totals, setTotals] = useState<DashboardTotals | null>(cachedState?.totals ?? null);
  const [books, setBooks] = useState<DashboardBookSummary[]>(cachedState?.books ?? []);
  const [benchmark, setBenchmark] = useState<DashboardBenchmark | null>(
    cachedState?.benchmark ?? null
  );
  const [scope, setScope] = useState<DashboardScope>(cachedState?.scope ?? "all");
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(
    cachedState?.activePortfolioId ?? null
  );
  const [personalAum, setPersonalAum] = useState(cachedState?.personalAum ?? 0);
  const [clientAum, setClientAum] = useState(cachedState?.clientAum ?? 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickActions] = useState(DASHBOARD_QUICK_ACTIONS);

  useEffect(() => {
    void useActiveBookStore.persist.rehydrate();
  }, []);

  const applyState = useCallback((next: DashboardViewState) => {
    setGuest(next.guest);
    setGreeting(next.greeting);
    setSubtitle(next.subtitle);
    setKpis(next.kpis);
    setWorkspaces(next.workspaces);
    setTotals(next.totals);
    setBooks(next.books);
    setBenchmark(next.benchmark);
    setScope(next.scope);
    setActivePortfolioId(next.activePortfolioId);
    setPersonalAum(next.personalAum);
    setClientAum(next.clientAum);
  }, []);

  const loadDashboard = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true);
      setLoadError(null);
      try {
        const data = await dashboardApi.get({
          portfolioId: activeBook?.portfolioId,
          clientId: activeBook?.clientId,
          force,
        });
        applyState(stateFromPayload(data));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load dashboard";
        setLoadError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeBook?.portfolioId, activeBook?.clientId, applyState]
  );

  useEffect(() => {
    setLoading(true);
    void loadDashboard(false);
  }, [activeBook?.portfolioId, activeBook?.clientId, loadDashboard]);

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
    return <PageLoading label="Loading your dashboard…" rows={6} />;
  }

  return (
    <>
      <RefreshingBar active={refreshing} />
      {guest ? null : <DashboardTicker />}
      {loadError && !guest ? (
        <p className={styles.disclaimer} role="alert" style={{ color: "var(--down)", marginBottom: 12 }}>
          {loadError}{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadDashboard(true)}>
            Retry
          </button>
        </p>
      ) : null}
      {guest ? (
        <p className={styles.disclaimer} style={{ marginBottom: 16 }}>
          <Link href="/login">Sign in</Link> or <Link href="/signup">create an account</Link> to see your
          portfolio, client books, and watchlist — never another user&apos;s data.
        </p>
      ) : null}
      <DashboardView
        guest={guest}
        greeting={greeting}
        subtitle={subtitle}
        kpis={kpis}
        quickActions={quickActions}
        workspaces={workspaces}
        portfolioTotals={totals}
        portfolioBooks={books}
        benchmark={benchmark}
        portfolioRefreshing={refreshing}
        scope={scope}
        activePortfolioId={activePortfolioId}
        personalAum={personalAum}
        clientAum={clientAum}
        marketWatch={<DashboardMarketWatch />}
        marketIndices={<DashboardMarketIndices />}
        earnings={<DashboardEarnings />}
        suggestions={<DashboardSuggestions />}
      />
    </>
  );
}
