import type { Author, ResearchPaper } from "../types/index.js";
import { getCache, setCache, TTL } from "./cacheService.js";

const BASE = "https://api.semanticscholar.org/graph/v1";

interface SSPaper {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: { name: string }[];
  year?: number;
  citationCount?: number;
  publicationDate?: string;
  externalIds?: { ArXiv?: string; DOI?: string };
  url?: string;
  publicationVenue?: { name?: string };
}

function toResearchPaper(p: SSPaper, university = "General", slug = "general"): ResearchPaper {
  const arxiv = p.externalIds?.ArXiv;
  const url =
    p.url ??
    (arxiv ? `https://arxiv.org/abs/${arxiv}` : `https://www.semanticscholar.org/paper/${p.paperId}`);

  return {
    id: `ss-${p.paperId}`,
    title: p.title ?? "Untitled",
    abstract: p.abstract ?? "",
    authors: (p.authors ?? []).map((a) => ({ name: a.name })),
    university,
    universitySlug: slug,
    source: "semantic-scholar",
    sourceUrl: url,
    publishedAt: p.publicationDate ?? `${p.year ?? new Date().getFullYear()}-01-01`,
    year: p.year ?? new Date().getFullYear(),
    citationCount: p.citationCount,
    categories: p.publicationVenue?.name ? [p.publicationVenue.name] : [],
  };
}

async function ssFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ResearchDigest/1.0 (mailto:research@local.dev)" },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await fetch(url, {
      headers: { "User-Agent": "ResearchDigest/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!retry.ok) throw new Error(`Semantic Scholar rate limited: ${retry.status}`);
    return retry.json() as Promise<T>;
  }
  if (!res.ok) throw new Error(`Semantic Scholar error: ${res.status}`);
  return res.json() as Promise<T>;
}

const FIELDS =
  "title,abstract,authors,year,citationCount,publicationDate,externalIds,url,publicationVenue";

export async function searchPapers(
  query: string,
  limit = 10,
  university = "General",
  slug = "general"
): Promise<ResearchPaper[]> {
  const cacheKey = `ss:search:${query}:${limit}`;
  const cached = getCache<ResearchPaper[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    query,
    fields: FIELDS,
    limit: String(limit),
  });

  const data = await ssFetch<{ data?: SSPaper[] }>(
    `${BASE}/paper/search?${params}`
  );
  const papers = (data.data ?? []).map((p) => toResearchPaper(p, university, slug));
  setCache(cacheKey, papers, TTL.semantic, "semantic-scholar");
  return papers;
}

export async function getPaperById(paperId: string): Promise<ResearchPaper | null> {
  const cacheKey = `ss:paper:${paperId}`;
  const cached = getCache<ResearchPaper>(cacheKey);
  if (cached) return cached;

  const cleanId = paperId.replace(/^ss-/, "");
  const params = new URLSearchParams({
    fields: `${FIELDS},references,citations`,
  });

  try {
    const p = await ssFetch<SSPaper>(`${BASE}/paper/${cleanId}?${params}`);
    const paper = toResearchPaper(p);
    setCache(cacheKey, paper, TTL.semantic, "semantic-scholar");
    return paper;
  } catch {
    return null;
  }
}

export async function searchByUniversity(
  universityName: string,
  topic = "artificial intelligence",
  limit = 10
): Promise<ResearchPaper[]> {
  const query = `${topic} ${universityName}`;
  const papers = await searchPapers(query, limit * 2, universityName, slugify(universityName));
  return papers.filter((p) => p.year >= 2023).slice(0, limit);
}

export async function getRelatedPapers(paperId: string, limit = 6): Promise<ResearchPaper[]> {
  const cleanId = paperId.replace(/^ss-/, "").replace(/^arxiv-/, "");
  try {
    if (paperId.startsWith("ss-")) {
      const params = new URLSearchParams({ fields: "references" });
      const data = await ssFetch<{ references?: SSPaper[] }>(
        `${BASE}/paper/${cleanId}?${params}`
      );
      return (data.references ?? []).slice(0, limit).map((p) => toResearchPaper(p));
    }
    const results = await searchPapers(`arxiv:${cleanId}`, limit);
    return results;
  } catch {
    return searchPapers("machine learning transformers", limit);
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
