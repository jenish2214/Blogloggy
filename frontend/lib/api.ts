import type {
  DailyDigest,
  FeedItem,
  NewsCategory,
  ResearchCategory,
  ResearchPaper,
  UniversityConfig,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetchJSON<{ status: string; paidApis: boolean }>("/health"),

  categories: () =>
    fetchJSON<{ categories: ResearchCategory[] }>("/categories"),

  category: (slug: string, limit = 20) =>
    fetchJSON<{
      category: ResearchCategory;
      papers: ResearchPaper[];
      feed: FeedItem[];
    }>(`/categories/${encodeURIComponent(slug)}?limit=${limit}`),

  research: (limit = 30) =>
    fetchJSON<{ papers: ResearchPaper[] }>(`/research?limit=${limit}`),

  researchAll: () =>
    fetchJSON<{
      papers: ResearchPaper[];
      universityPapers: ResearchPaper[];
      news: FeedItem[];
      sourceLog: string[];
    }>("/research/all"),

  researchDirectory: () =>
    fetchJSON<{
      topics: {
        slug: string;
        name: string;
        description: string;
        icon: string;
        paperCount: number;
        memberLabel: string;
        latestTitle?: string;
        latestDate?: string;
      }[];
      authors: {
        slug: string;
        name: string;
        paperCount: number;
        topics: string[];
        university?: string;
        latestTitle?: string;
        latestDate?: string;
      }[];
      refreshedAt: string;
    }>("/research/directory"),

  author: (slug: string) =>
    fetchJSON<{
      author: {
        slug: string;
        name: string;
        paperCount: number;
        topics: string[];
        university?: string;
      };
      papers: ResearchPaper[];
      topics: { slug: string; name: string; count: number }[];
    }>(`/research/authors/${encodeURIComponent(slug)}`),

  universityPapers: (limit = 8) =>
    fetchJSON<{ papers: ResearchPaper[] }>(`/research/universities?limit=${limit}`),

  newsHub: () =>
    fetchJSON<{
      spotlight: FeedItem[];
      technology: FeedItem[];
      labs: FeedItem[];
      university: FeedItem[];
      research: FeedItem[];
      reference: FeedItem[];
      all: FeedItem[];
      refreshedAt: string;
      fetchNote: string;
    }>("/research/news/hub"),

  news: (limit = 60, category?: NewsCategory) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (category) params.set("category", category);
    return fetchJSON<{
      items: FeedItem[];
      refreshedAt: string;
      category: NewsCategory | "all";
    }>(`/research/news?${params}`);
  },

  article: (id: string) =>
    fetchJSON<{ article: FeedItem; related: FeedItem[] }>(
      `/research/article/${encodeURIComponent(id)}`
    ),

  liveFeed: (sources?: string[]) => {
    const q = sources?.length ? `?sources=${sources.join(",")}` : "";
    return fetchJSON<{ items: FeedItem[]; refreshedAt: string }>(
      `/research/live${q}`
    );
  },

  paper: (id: string) =>
    fetchJSON<{
      paper: ResearchPaper;
      related: ResearchPaper[];
      resolvedVia?: string;
    }>(`/research/paper/${encodeURIComponent(id)}`),

  digest: () => fetchJSON<DailyDigest>("/digest"),

  universities: () =>
    fetchJSON<{
      universities: (UniversityConfig & { description: string })[];
      overview: {
        slug: string;
        name: string;
        accentColor: string;
        paperCount: number;
        lastUpdated: string;
        latestTitles: string[];
      }[];
    }>("/universities"),

  university: (slug: string) =>
    fetchJSON<{
      university: UniversityConfig & { description: string };
      papers: ResearchPaper[];
      feed: FeedItem[];
      researchers: { name: string; count: number }[];
      topCited: ResearchPaper[];
    }>(`/universities/${encodeURIComponent(slug)}`),
};
