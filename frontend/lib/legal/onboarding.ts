import type { User } from "@supabase/supabase-js";

/** Bump when welcome copy changes — users must re-accept. */
export const ONBOARDING_VERSION = "2026-05-24";

export const WELCOME_TERMS_PATH = "/welcome/terms";
/** Legacy — redirects to terms */
export const WELCOME_ABOUT_PATH = "/welcome/about";

export const WELCOME_PATHS = [WELCOME_TERMS_PATH, WELCOME_ABOUT_PATH] as const;

export type OnboardingStep = "welcome" | "complete";

function meta(user: User | null | undefined) {
  return user?.user_metadata ?? {};
}

/** User read motto & purpose and applied acceptance — dashboard unlocked. */
export function hasCompletedOnboarding(user: User | null | undefined): boolean {
  const m = meta(user);
  return (
    m.onboarding_version === ONBOARDING_VERSION &&
    typeof m.terms_accepted_at === "string" &&
    m.terms_accepted_at.length > 0 &&
    typeof m.privacy_policy_accepted_at === "string" &&
    m.privacy_policy_accepted_at.length > 0 &&
    typeof m.onboarding_applied_at === "string" &&
    m.onboarding_applied_at.length > 0
  );
}

export function getOnboardingStep(user: User | null | undefined): OnboardingStep {
  if (!user || hasCompletedOnboarding(user)) return "complete";
  return "welcome";
}

export function getOnboardingRedirect(user: User | null | undefined): string {
  return getOnboardingStep(user) === "complete" ? "/" : WELCOME_TERMS_PATH;
}

export function isWelcomePath(path: string): boolean {
  return WELCOME_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** @deprecated */
export function hasAcceptedTerms(user: User | null | undefined): boolean {
  return hasCompletedOnboarding(user);
}

export const TERMS_PATH = WELCOME_TERMS_PATH;
