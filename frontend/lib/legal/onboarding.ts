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

export type OnboardingStep = "terms" | "profile" | "complete";

function meta(user: User | null | undefined) {
  return user?.user_metadata ?? {};
}

/** Users who finished onboarding before the profile step existed. */
export function isLegacyOnboardedUser(user: User | null | undefined): boolean {
  const m = meta(user);
  return (
    typeof m.onboarding_applied_at === "string" &&
    m.onboarding_applied_at.length > 0 &&
    m.onboarding_version !== ONBOARDING_VERSION
  );
}

export function hasAcceptedTerms(user: User | null | undefined): boolean {
  if (isLegacyOnboardedUser(user)) return true;
  const m = meta(user);
  return (
    m.onboarding_version === ONBOARDING_VERSION &&
    typeof m.terms_accepted_at === "string" &&
    m.terms_accepted_at.length > 0 &&
    typeof m.privacy_policy_accepted_at === "string" &&
    m.privacy_policy_accepted_at.length > 0
  );
}

/** Profile form submitted with feature access saved. */
export function hasCompletedProfile(user: User | null | undefined): boolean {
  if (isLegacyOnboardedUser(user)) return true;
  const m = meta(user);
  return typeof m.profile_completed_at === "string" && m.profile_completed_at.length > 0;
}

export function hasCompletedOnboarding(user: User | null | undefined): boolean {
  return hasAcceptedTerms(user) && hasCompletedProfile(user);
}

export function getOnboardingStep(user: User | null | undefined): OnboardingStep {
  if (!user || hasCompletedOnboarding(user)) return "complete";
  if (!hasAcceptedTerms(user)) return "terms";
  return "profile";
}

export function getOnboardingRedirect(user: User | null | undefined): string {
  const step = getOnboardingStep(user);
  if (step === "terms") return WELCOME_TERMS_PATH;
  if (step === "profile") return WELCOME_PROFILE_PATH;
  return "/";
}

export function isWelcomePath(path: string): boolean {
  return WELCOME_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export const TERMS_PATH = WELCOME_TERMS_PATH;
