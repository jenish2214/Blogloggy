export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  isAdmin: boolean;
  experienceLevel: string | null;
  yearsExperience: number | null;
  primaryInterest: string | null;
  profileCompletedAt: string | null;
  termsAcceptedAt: string | null;
  loginCount: number;
  logoutCount: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  enabledFeatures: string[];
};
