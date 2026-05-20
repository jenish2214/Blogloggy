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

const SOURCE_LETTERS: Record<string, string> = {
  hn: "H",
  techcrunch: "TC",
  verge: "V",
  arstechnica: "A",
  "mit-tr": "M",
  mit: "M",
  harvard: "H",
  stanford: "S",
  oxford: "O",
  cambridge: "C",
  deepmind: "D",
  arxiv: "X",
  anthropic: "A",
  openai: "O",
  wikipedia: "W",
  google: "G",
  blogger: "B",
  blogloggy: "B",
  pubmed: "P",
};

export function sourceAvatarLetter(logoKey: string): string {
  const key = logoKey.toLowerCase();
  if (SOURCE_LETTERS[key]) return SOURCE_LETTERS[key];
  const clean = key.replace(/-rss$/, "").replace(/[^a-z0-9]/g, "");
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  return (logoKey.charAt(0) || "?").toUpperCase();
}
