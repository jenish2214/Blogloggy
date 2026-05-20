import type { NewsCategory } from "@/types";

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  technology: "Technology",
  research: "Research",
  university: "Universities",
  labs: "AI Labs",
  reference: "Wikipedia",
};

export const SOURCE_COLORS: Record<string, string> = {
  hn: "#ff6600",
  techcrunch: "#0a9e01",
  verge: "#e51225",
  arstechnica: "#ff4500",
  "mit-tr": "#a31f34",
  mit: "#750014",
  harvard: "#a51c30",
  stanford: "#8c1515",
  oxford: "#002147",
  cambridge: "#d4af37",
  deepmind: "#4285f4",
  arxiv: "#b31b1b",
  anthropic: "#d4a574",
  openai: "#10a37f",
  wikipedia: "#3366cc",
};

export function sourceColor(logoKey: string): string {
  return SOURCE_COLORS[logoKey] ?? "var(--color-accent-ai)";
}
