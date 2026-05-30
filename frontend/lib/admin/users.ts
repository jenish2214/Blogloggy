export type AdminUserStats = {
  totalUsers: number;
  activeToday: number;
  onboardedUsers: number;
  adminUsers: number;
  openPositions: number;
  totalOrders: number;
  pendingAlerts: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  createdAt: string;
  updatedAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  isAdmin: boolean;
  authProvider: string;
  experienceLevel: string | null;
  yearsExperience: number | null;
  primaryInterest: string | null;
  profileCompletedAt: string | null;
  profileCreatedAt: string | null;
  profileUpdatedAt: string | null;
  termsAcceptedAt: string | null;
  onboardingAppliedAt: string | null;
  loginCount: number;
  logoutCount: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  enabledFeatures: string[];
  disabledFeatures: string[];
  portfolioCash: number | null;
  startingCapital: number | null;
  positionCount: number;
  orderCount: number;
  watchlistCount: number;
  messageCount: number;
  alertCount: number;
  clientCount: number;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
  orderedBy: string;
  stats: AdminUserStats;
};
