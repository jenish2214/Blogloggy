import { XMLParser } from "fast-xml-parser";
import type { Author, ResearchPaper } from "../types/index.js";
import { getCache, setCache, TTL } from "./cacheService.js";

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export const PUBMED_QUERIES = [
  "artificial intelligence machine learning",
  "neural networks deep learning",
  "harvard stanford MIT research 2024",
] as const;

function parsePubMedXml(xml: string): ResearchPaper[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml);
  const articles = parsed.PubmedArticleSet?.PubmedArticle ?? [];
  const list = Array.isArray(articles) ? articles : [articles];

  return list
    .filter(Boolean)
    .map((article: Record<string, unknown>) => {
      const medline = article.MedlineCitation as Record<string, unknown>;
      const articleData = medline?.Article as Record<string, unknown>;
      const pmid = String((medline?.PMID as Record<string, unknown>)?.["#text"] ?? medline?.PMID ?? "");
      const title = String(articleData?.ArticleTitle ?? "Untitled");
      const abstractBlock = articleData?.Abstract as Record<string, unknown> | undefined;
      const abstractData = abstractBlock?.AbstractText;
      let abstract = "";
      if (typeof abstractData === "string") abstract = abstractData;
      else if (Array.isArray(abstractData)) {
        abstract = abstractData
          .map((a: unknown) => (typeof a === "string" ? a : String((a as Record<string, unknown>)?.["#text"] ?? a)))
          .join(" ");
      } else if (abstractData && typeof abstractData === "object") {
        abstract = String((abstractData as Record<string, unknown>)["#text"] ?? "");
      }

      const authorListBlock = articleData?.AuthorList as Record<string, unknown> | undefined;
      const authorList = authorListBlock?.Author ?? [];
      const authors: Author[] = (Array.isArray(authorList) ? authorList : [authorList])
        .filter(Boolean)
        .map((a: Record<string, unknown>) => {
          const affRaw = a.AffiliationInfo;
          const affEntry = Array.isArray(affRaw) ? affRaw[0] : affRaw;
          const affiliation =
            affEntry && typeof affEntry === "object"
              ? String((affEntry as Record<string, unknown>).Affiliation ?? "")
              : undefined;
          return {
            name: `${a.LastName ?? ""} ${a.ForeName ?? ""}`.trim() || "Unknown",
            affiliation: affiliation || undefined,
          };
        });

      const journal = articleData?.Journal as Record<string, unknown> | undefined;
      const journalIssue = journal?.JournalIssue as Record<string, unknown> | undefined;
      const pubDate = journalIssue?.PubDate as Record<string, unknown>;
      const year = Number(pubDate?.Year ?? new Date().getFullYear());
      const month = String(pubDate?.Month ?? "01").padStart(2, "0");
      const day = String(pubDate?.Day ?? "01").padStart(2, "0");

      return {
        id: `pubmed-${pmid}`,
        title,
        abstract: abstract.replace(/\s+/g, " ").trim(),
        authors,
        university: "Biomedical",
        universitySlug: "biomedical",
        source: "pubmed" as const,
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        publishedAt: `${year}-${month}-${day}`,
        year,
        categories: ["Medicine", "Biology"],
      };
    });
}

export async function fetchPubMedPapers(query: string, retmax = 10): Promise<ResearchPaper[]> {
  const cacheKey = `pubmed:${query}:${retmax}`;
  const cached = getCache<ResearchPaper[]>(cacheKey);
  if (cached) return cached;

  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(retmax),
    sort: "date",
    retmode: "json",
  });

  const searchRes = await fetch(`${BASE}/esearch.fcgi?${searchParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!searchRes.ok) throw new Error(`PubMed search error: ${searchRes.status}`);

  const searchData = (await searchRes.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchData.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const fetchParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "xml",
  });

  const fetchRes = await fetch(`${BASE}/efetch.fcgi?${fetchParams}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!fetchRes.ok) throw new Error(`PubMed fetch error: ${fetchRes.status}`);

  const xml = await fetchRes.text();
  const papers = parsePubMedXml(xml);
  setCache(cacheKey, papers, TTL.pubmed, "pubmed");
  return papers;
}

export async function fetchAllPubMedQueries(): Promise<ResearchPaper[]> {
  const results = await Promise.allSettled(
    PUBMED_QUERIES.map((q) => fetchPubMedPapers(q, 5))
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<ResearchPaper[]>).value);
}

export async function fetchPubMedByPmid(pmid: string): Promise<ResearchPaper | null> {
  const clean = pmid.replace(/^pubmed-/, "");
  const cacheKey = `pubmed:paper:${clean}`;
  const cached = getCache<ResearchPaper>(cacheKey);
  if (cached) return cached;

  const fetchParams = new URLSearchParams({
    db: "pubmed",
    id: clean,
    retmode: "xml",
  });

  try {
    const fetchRes = await fetch(`${BASE}/efetch.fcgi?${fetchParams}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!fetchRes.ok) return null;
    const papers = parsePubMedXml(await fetchRes.text());
    const paper = papers[0] ?? null;
    if (paper) setCache(cacheKey, paper, TTL.pubmed, "pubmed");
    return paper;
  } catch {
    return null;
  }
}
