import type { FeedItem } from "../types/index.js";
import { getCache, setCache, TTL } from "./cacheService.js";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const SEARCH_TOPICS = [
  "Artificial intelligence",
  "Machine learning",
  "Large language model",
  "MIT Computer Science",
  "Stanford University research",
  "Quantum computing",
];

interface WikiSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  timestamp?: string;
}

async function wikiSearch(query: string, limit = 2): Promise<WikiSearchResult[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    format: "json",
    srlimit: String(limit),
    origin: "*",
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { "User-Agent": "ResearchDigest/1.0 (research-digest; contact@localhost)" },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    query?: { search?: WikiSearchResult[] };
  };

  return data.query?.search ?? [];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}

export async function fetchWikipediaHighlights(limit = 14): Promise<FeedItem[]> {
  const cacheKey = `wikipedia:highlights:${limit}`;
  const cached = getCache<FeedItem[]>(cacheKey);
  if (cached) return cached;

  const results = await Promise.allSettled(
    SEARCH_TOPICS.map((q) => wikiSearch(q, 2))
  );

  const seen = new Set<number>();
  const items: FeedItem[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      if (seen.has(hit.pageid)) continue;
      seen.add(hit.pageid);
      const pubDate = hit.timestamp
        ? new Date(hit.timestamp).toISOString()
        : new Date().toISOString();

      items.push({
        id: `wiki-${hit.pageid}`,
        title: hit.title,
        link: `https://en.wikipedia.org/?curid=${hit.pageid}`,
        pubDate,
        contentSnippet: stripHtml(hit.snippet).slice(0, 400),
        source: "wikipedia",
        sourceUrl: "https://www.wikipedia.org",
        logoKey: "wikipedia",
        newsCategory: "reference",
        handle: "Wikipedia",
      });
    }
  }

  const sorted = items.slice(0, limit);
  setCache(cacheKey, sorted, TTL.rss, "wikipedia");
  return sorted;
}
