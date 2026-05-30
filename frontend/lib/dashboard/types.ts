/** Server payload for GET /api/dashboard — no UI types */

export type DashboardBookSummary = {
  portfolioId: string;
  clientId: string | null;
  accountLabel: string;
  accountType: "personal" | "client";
  clientName?: string | null;
  totalValue: number;
  startingCapital: number;
  totalPnl: number;
  totalPnlPct: number;
  cash: number;
  invested: number;
  openPositions: number;
  orderCount?: number;
};

export type DashboardTotals = {
  /** Sum of all books — live marks */
  totalPortfolioValue: number;
  totalStartingCapital: number;
  totalPnl: number;
  totalPnlPct: number;
  totalCash: number;
  totalInvested: number;
  unrealizedPnl: number;
  bookCount: number;
  openPositions: number;
  lastUpdated: string;
};

export type DashboardBenchmark = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
};

export type DashboardScope = "all" | "book";

export type DashboardSummaryPayload = {
  guest: boolean;
  /** All books vs single active book */
  scope?: DashboardScope;
  activePortfolioId?: string | null;
  activeAccountLabel?: string | null;
  personalAum?: number;
  clientAum?: number;
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
  profile?: {
    fullName: string;
    experienceLevel: string | null;
    primaryInterest: string | null;
    profileCompleted: boolean;
  };
  portfolio: {
    accountLabel: string;
    cash: number;
    totalValue: number;
    startingCapital: number;
    totalPnl: number;
    totalPnlPct: number;
    openPositions: number;
    orderCount: number;
    invested: number;
  };
  firm: {
    aum: number;
    clientBooks: number;
    openPositions: number;
  };
  totals: DashboardTotals;
  books: DashboardBookSummary[];
  benchmark: DashboardBenchmark | null;
  activity: {
    watchlistSymbols: number;
    walletTransactions: number;
    clientBooks: number;
  };
};
