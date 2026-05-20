/** Category slugs used for /topics/:slug pages (same as backend CATEGORIES). */
export const TOPIC_SLUGS = [
  "ai-ml",
  "nlp",
  "systems",
  "math",
  "physics",
  "biomedical",
  "robotics",
  "universities",
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export function isTopicSlug(slug?: string | null): slug is TopicSlug {
  return !!slug && (TOPIC_SLUGS as readonly string[]).includes(slug);
}

export function topicHref(slug?: string | null): string | null {
  return isTopicSlug(slug) ? `/topics/${slug}` : null;
}
