import type { User } from "@supabase/supabase-js";

/** Bump when welcome / profile flow changes. */
export const ONBOARDING_VERSION = "2026-05-25-profile";

export const WELCOME_TERMS_PATH = "/welcome/terms";
export const WELCOME_PROFILE_PATH = "/welcome/profile";
export const WELCOME_ABOUT_PATH = "/welcome/about";

export const WELCOME_PATHS = [
  WELCOME_TERMS_PATH,
  WELCOME_PROFILE_PATH,
  WELCOME_ABOUT_PATH,
] as const;

export type OnboardingStep = "complete";

/** Terms / profile onboarding removed — signed-in users go straight to the app. */
export function hasAcceptedTerms(_user: User | null | undefined): boolean {
  return true;
}

export function hasCompletedProfile(_user: User | null | undefined): boolean {
  return true;
}

export function hasCompletedOnboarding(user: User | null | undefined): boolean {
  return !!user;
}

export function getOnboardingStep(_user: User | null | undefined): OnboardingStep {
  return "complete";
}

export function getOnboardingRedirect(_user: User | null | undefined): string {
  return "/";
}

export function isWelcomePath(path: string): boolean {
  return WELCOME_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export const TERMS_PATH = WELCOME_TERMS_PATH;
