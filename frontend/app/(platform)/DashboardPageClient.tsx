"use client";

import { useMemo } from "react";
import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  DashboardEarnings,
  DashboardMarketIndices,
  DashboardMarketWatch,
  DashboardSuggestions,
  DashboardTicker,
} from "@/components/dashboard/DashboardWidgets";
import {
  DASHBOARD_KPIS,
  DASHBOARD_QUICK_ACTIONS,
  DASHBOARD_WORKSPACES,
  dashboardGreeting,
} from "@/lib/dashboard/dashboardData";

export function DashboardPageClient() {
  const greeting = useMemo(() => dashboardGreeting(), []);

  return (
    <>
      <DashboardTicker />
      <DashboardView
        greeting={greeting}
        kpis={DASHBOARD_KPIS}
        quickActions={DASHBOARD_QUICK_ACTIONS}
        workspaces={DASHBOARD_WORKSPACES}
        marketWatch={<DashboardMarketWatch />}
        marketIndices={<DashboardMarketIndices />}
        earnings={<DashboardEarnings />}
        suggestions={<DashboardSuggestions />}
      />
    </>
  );
}
