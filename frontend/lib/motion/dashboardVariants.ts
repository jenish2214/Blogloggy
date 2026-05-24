/** Shared motion presets for the market dashboard. */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function dashboardStagger(reduce: boolean | null, delay = 0.04) {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : delay,
        delayChildren: reduce ? 0 : 0.06,
      },
    },
  };
}

export function fadeUp(reduce: boolean | null, distance = 16) {
  if (reduce) {
    return {
      hidden: { opacity: 1, y: 0 },
      show: { opacity: 1, y: 0 },
    };
  }
  return {
    hidden: { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.42, ease: EASE_OUT },
    },
  };
}

export function fadeIn(reduce: boolean | null) {
  if (reduce) {
    return {
      hidden: { opacity: 1 },
      show: { opacity: 1 },
    };
  }
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: 0.35, ease: EASE_OUT },
    },
  };
}

export function scaleIn(reduce: boolean | null) {
  if (reduce) {
    return {
      hidden: { opacity: 1, scale: 1 },
      show: { opacity: 1, scale: 1 },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.97 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.38, ease: EASE_OUT },
    },
  };
}
