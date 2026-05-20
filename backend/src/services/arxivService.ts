import { XMLParser } from "fast-xml-parser";
import type { Author, ResearchPaper } from "../types/index.js";
import { getCache, setCache, TTL } from "./cacheService.js";

const BASE = "https://export.arxiv.org/api/query";

export const ARXIV_QUERIES = {
  ai: "cat:cs.AI OR cat:cs.LG OR cat:cs.NE",
  nlp: "cat:cs.CL",
  systems: "cat:cs.DC OR cat:cs.OS",
  math: "cat:math.ST OR cat:math.PR",
  physics: "cat:physics.app-ph",
  university:
    "cat:cs.AI AND (Harvard OR MIT OR Stanford OR CMU OR Berkeley OR Oxford OR Cambridge)",
} as const;

function parseAuthors(entry: Record<string, unknown>): Author[] {
  const authors = entry.author;
  if (!authors) return [{ name: "Unknown" }];
  const list = Array.isArray(authors) ? authors : [authors];
  return list.map((a: Record<string, unknown>) => ({
    name: String(a.name ?? "Unknown"),
    affiliation: a.affiliation ? String(a.affiliation) : undefined,
  }));
}

function entryToPaper(
  entry: Record<string, unknown>,
  university = "General",
  universitySlug = "general"
): ResearchPaper {
  const idRaw = String(entry.id ?? "");
  const arxivId = idRaw.split("/abs/").pop()?.split("v")[0] ?? idRaw;
  const published = String(entry.published ?? entry.updated ?? new Date().toISOString());
  const summary = String(entry.summary ?? "").replace(/\s+/g, " ").trim();
  const categories = entry.category;
  const cats: string[] = [];
  if (categories) {
    const arr = Array.isArray(categories) ? categories : [categories];
    arr.forEach((c: Record<string, unknown>) => {
      if (c["@_term"]) cats.push(String(c["@_term"]));
    });
  }

  return {
    id: `arxiv-${arxivId}`,
    title: String(entry.title ?? "Untitled").replace(/\s+/g, " ").trim(),
    abstract: summary,
    authors: parseAuthors(entry),
    university,
    universitySlug,
    source: "arxiv",
    sourceUrl: `https://arxiv.org/abs/${arxivId}`,
    publishedAt: published,
    year: new Date(published).getFullYear(),
    categories: cats,
  };
}

export async function fetchArxivPapers(
  searchQuery: string,
  maxResults = 10,
  university = "General",
  universitySlug = "general"
): Promise<ResearchPaper[]> {
  const cacheKey = `arxiv:${searchQuery}:${maxResults}`;
  const cached = getCache<ResearchPaper[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    search_query: searchQuery,
    sortBy: "lastUpdatedDate",
    sortOrder: "descending",
    max_results: String(maxResults),
  });

  const res = await fetch(`${BASE}?${params}`, {
    headers: { "User-Agent": "ResearchDigest/1.0" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`arXiv API error: ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml);
  const feed = parsed.feed ?? {};
  let entries = feed.entry ?? [];
  if (!Array.isArray(entries)) entries = entries ? [entries] : [];

  const papers = entries.map((e: Record<string, unknown>) =>
    entryToPaper(e, university, universitySlug)
  );

  setCache(cacheKey, papers, TTL.arxiv, "arxiv");
  return papers;
}

export async function fetchArxivByCategory(
  category: keyof typeof ARXIV_QUERIES,
  maxResults = 10
): Promise<ResearchPaper[]> {
  return fetchArxivPapers(ARXIV_QUERIES[category], maxResults);
}

export async function searchArxivUniversity(
  query: string,
  university: string,
  slug: string,
  maxResults = 15
): Promise<ResearchPaper[]> {
  return fetchArxivPapers(
    `(${query}) AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL)`,
    maxResults,
    university,
    slug
  );
}

export async function fetchArxivById(arxivId: string): Promise<ResearchPaper | null> {
  const clean = arxivId.replace(/^arxiv-/, "").split("v")[0];
  const cacheKey = `arxiv:paper:${clean}`;
  const cached = getCache<ResearchPaper>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ id_list: clean });
  try {
    const res = await fetch(`${BASE}?${params}`, {
      headers: { "User-Agent": "ResearchDigest/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(await res.text());
    const entry = parsed.feed?.entry;
    if (!entry) return null;
    const e = Array.isArray(entry) ? entry[0] : entry;
    const paper = entryToPaper(e as Record<string, unknown>);
    setCache(cacheKey, paper, TTL.arxiv, "arxiv");
    return paper;
  } catch {
    return null;
  }
}
