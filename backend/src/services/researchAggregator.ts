import type { DailyDigest, DigestEntry, FeedItem, ResearchPaper } from "../types/index.js";
import { getCategory, CATEGORIES, inferCategorySlug } from "../config/categories.js";
import { getUniversity, UNIVERSITIES } from "../config/universities.js";
import {
  fetchArxivById,
  fetchArxivPapers,
  searchArxivUniversity,
} from "./arxivService.js";
import { getCache, setCache, TTL } from "./cacheService.js";
import { fetchWithFallback } from "./fallbackFetcher.js";
import { fetchPubMedByPmid, fetchPubMedPapers } from "./pubmedService.js";
import { fetchAllFeeds, fetchUniversityFeed } from "./rssService.js";
import { fetchWikipediaHighlights } from "./wikipediaService.js";
import { getPaperById, getRelatedPapers, searchByUniversity, searchPapers } from "./semanticService.js";

const PHD_UNIVERSITY_QUERIES = [
  { name: "MIT", slug: "mit", query: "Massachusetts Institute of Technology PhD dissertation AI" },
  { name: "Harvard", slug: "harvard", query: "Harvard University doctoral research machine learning" },
  { name: "Stanford", slug: "stanford", query: "Stanford University PhD artificial intelligence" },
  { name: "Oxford", slug: "oxford", query: "University of Oxford doctoral computer science" },
  { name: "Cambridge", slug: "cambridge", query: "University of Cambridge PhD machine learning" },
  { name: "CMU", slug: "cmu", query: "Carnegie Mellon University doctoral AI research" },
  { name: "Berkeley", slug: "berkeley", query: "UC Berkeley PhD deep learning" },
  { name: "Caltech", slug: "caltech", query: "Caltech doctoral research artificial intelligence" },
];

function cachePaper(paper: ResearchPaper): void {
  setCache(`paper:${paper.id}`, paper, TTL.research, paper.source);
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function dedupePapers(papers: ResearchPaper[]): ResearchPaper[] {
  const seen = new Set<string>();
  return papers.filter((p) => {
    const key = normalizeTitle(p.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enrichPaper(paper: ResearchPaper): ResearchPaper {
  const category = inferCategorySlug(paper);
  return category ? { ...paper, category } : paper;
}

function enrichPapers(papers: ResearchPaper[]): ResearchPaper[] {
  return papers.map(enrichPaper);
}

function feedToPaper(item: FeedItem, label: string, slug: string): ResearchPaper {
  return {
    id: item.id,
    title: item.title,
    abstract: item.contentSnippet,
    authors: [{ name: item.logoKey }],
    university: label,
    universitySlug: slug,
    source: item.source,
    sourceUrl: item.link,
    publishedAt: item.pubDate,
    year: new Date(item.pubDate).getFullYear(),
    category: slug,
  };
}

function excerptSummary(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

export async function getCategoryResearch(
  slug: string,
  limit = 20
): Promise<{ papers: ResearchPaper[]; feed: FeedItem[] }> {
  const category = getCategory(slug);
  if (!category) throw new Error(`Category not found: ${slug}`);

  const cacheKey = `category:${slug}:${limit}`;
  const cached = getCache<{ papers: ResearchPaper[]; feed: FeedItem[] }>(cacheKey);
  if (cached) return cached;

  const tasks: Promise<ResearchPaper[] | FeedItem[]>[] = [
    fetchArxivPapers(category.arxivQuery, limit, category.name, slug),
    searchPapers(category.semanticQuery, limit, category.name, slug),
  ];

  if (slug === "biomedical") {
    tasks.push(
      fetchPubMedPapers("artificial intelligence machine learning", limit).catch(() => [])
    );
  }

  if (slug === "universities") {
    const uniPapers = await Promise.allSettled(
      UNIVERSITIES.slice(0, 4).map((u) =>
        searchByUniversity(u.ssAffiliation, "AI research", 5)
      )
    );
    const merged = uniPapers
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<ResearchPaper[]>).value);
    tasks.push(Promise.resolve(merged));
    tasks.push(fetchAllFeeds());
  }

  const results = await Promise.allSettled(tasks);
  const paperArrays: ResearchPaper[][] = [];
  let feedItems: FeedItem[] = [];

  results.forEach((r) => {
    if (r.status !== "fulfilled") return;
    const val = r.value;
    if (Array.isArray(val) && val.length > 0) {
      if ("link" in (val[0] as FeedItem)) {
        feedItems = val as FeedItem[];
      } else {
        paperArrays.push(val as ResearchPaper[]);
      }
    }
  });

  const feedPapers = feedItems.map((f) => feedToPaper(f, category.name, slug));
  const papers = enrichPapers(
    dedupePapers(paperArrays.flat().concat(feedPapers)).map((p) => ({ ...p, category: slug }))
  )
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);

  const data = { papers, feed: feedItems.slice(0, 10) };
  setCache(cacheKey, data, TTL.research, slug);
  return data;
}

export async function getAggregatedResearch(limit = 30): Promise<ResearchPaper[]> {
  const cacheKey = `research:aggregated:${limit}`;
  const cached = getCache<ResearchPaper[]>(cacheKey);
  if (cached) return cached;

  const samples = await Promise.allSettled(
    CATEGORIES.slice(0, 5).map((c) => getCategoryResearch(c.slug, 8))
  );

  const merged = enrichPapers(
    dedupePapers(
      samples
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<{ papers: ResearchPaper[] }>).value.papers)
    )
  )
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);

  merged.forEach(cachePaper);
  setCache(cacheKey, merged, TTL.research, "aggregated");
  return merged;
}

export async function getTopUniversityPapers(limitPerUni = 8): Promise<ResearchPaper[]> {
  const cacheKey = `research:phd-universities:${limitPerUni}`;
  const cached = getCache<ResearchPaper[]>(cacheKey);
  if (cached) return cached;

  const results = await Promise.allSettled(
    PHD_UNIVERSITY_QUERIES.map(async (u) => {
      const result = await fetchWithFallback<ResearchPaper[]>([
        {
          name: "semantic-scholar",
          fetch: () => searchByUniversity(u.name, "PhD doctoral dissertation AI", limitPerUni),
        },
        {
          name: "arxiv",
          fetch: () =>
            searchArxivUniversity(u.name.split(" ")[0], u.name, u.slug, limitPerUni),
        },
      ]);
      return (result?.data ?? []).map((p) => ({
        ...p,
        university: u.name,
        universitySlug: u.slug,
      }));
    })
  );

  const papers = enrichPapers(
    dedupePapers(
      results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<ResearchPaper[]>).value)
    )
  ).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  papers.forEach(cachePaper);
  setCache(cacheKey, papers, TTL.research, "phd");
  return papers;
}

export interface NewsHubPayload {
  spotlight: FeedItem[];
  technology: FeedItem[];
  labs: FeedItem[];
  university: FeedItem[];
  research: FeedItem[];
  reference: FeedItem[];
  all: FeedItem[];
  refreshedAt: string;
  fetchNote: string;
}

export async function getNewsHub(): Promise<NewsHubPayload> {
  const cacheKey = "news:hub:v2";
  const cached = getCache<NewsHubPayload>(cacheKey);
  if (cached) return cached;

  const [rssR, wikiR, arxivR] = await Promise.allSettled([
    fetchAllFeeds(),
    fetchWikipediaHighlights(14),
    fetchArxivPapers("cat:cs.AI OR cat:cs.LG", 8).then((papers) =>
      papers.map(
        (p): FeedItem => ({
          id: p.id,
          title: p.title,
          link: p.sourceUrl,
          pubDate: p.publishedAt,
          contentSnippet: p.abstract.slice(0, 200),
          source: "arxiv",
          sourceUrl: "https://arxiv.org",
          logoKey: "arxiv",
          newsCategory: "research",
          handle: "arXiv",
        })
      )
    ),
  ]);

  const rss = rssR.status === "fulfilled" ? rssR.value : [];
  const wiki = wikiR.status === "fulfilled" ? wikiR.value : [];
  const arxiv = arxivR.status === "fulfilled" ? arxivR.value : [];

  const all = [...rss, ...wiki, ...arxiv].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  const technology = all.filter((i) => i.newsCategory === "technology");
  const labs = all.filter((i) => i.newsCategory === "labs");
  const university = all.filter((i) => i.newsCategory === "university");
  const research = all.filter((i) => i.newsCategory === "research");
  const reference = all.filter((i) => i.newsCategory === "reference");

  const payload: NewsHubPayload = {
    spotlight: technology.slice(0, 6),
    technology,
    labs,
    university,
    research,
    reference,
    all,
    refreshedAt: new Date().toISOString(),
    fetchNote:
      "Free sources: university RSS, Wikipedia, arXiv, Hacker News, TechCrunch, Anthropic & OpenAI blogs.",
  };

  setCache(cacheKey, payload, TTL.rss, "news-hub");
  return payload;
}

export async function getNewsAndBlogs(
  limit = 60,
  category?: import("../types/index.js").NewsCategory
): Promise<FeedItem[]> {
  const hub = await getNewsHub();
  const buckets: Record<
    import("../types/index.js").NewsCategory,
    FeedItem[]
  > = {
    technology: hub.technology,
    labs: hub.labs,
    university: hub.university,
    research: hub.research,
    reference: hub.reference,
  };
  const list = category ? buckets[category] : hub.all;
  return list.slice(0, limit);
}

export async function getArticleDetail(id: string): Promise<{
  article: FeedItem | null;
  related: FeedItem[];
}> {
  const items = (await getNewsHub()).all;
  const article = items.find((i) => i.id === id) ?? null;
  if (!article) {
    return { article: null, related: [] };
  }
  const related = items
    .filter((i) => i.id !== id && i.newsCategory === article.newsCategory)
    .slice(0, 6);
  return { article, related };
}

export async function getFullResearchHub(): Promise<{
  papers: ResearchPaper[];
  universityPapers: ResearchPaper[];
  news: FeedItem[];
  sourceLog: string[];
}> {
  const sourceLog: string[] = [];
  const papersResult = await fetchWithFallback<ResearchPaper[]>([
    { name: "aggregated", fetch: () => getAggregatedResearch(40) },
    {
      name: "arxiv-ai",
      fetch: () => fetchArxivPapers("cat:cs.AI OR cat:cs.LG", 20),
    },
    {
      name: "semantic",
      fetch: () => searchPapers("machine learning research 2024", 20),
    },
  ]);
  if (papersResult) sourceLog.push(`papers:${papersResult.source}`);

  const uniResult = await fetchWithFallback<ResearchPaper[]>([
    { name: "universities", fetch: () => getTopUniversityPapers(6) },
    {
      name: "arxiv-uni",
      fetch: () =>
        fetchArxivPapers(
          "cat:cs.AI AND (Harvard OR MIT OR Stanford OR Oxford OR Cambridge OR CMU OR Berkeley)",
          15
        ),
    },
  ]);
  if (uniResult) sourceLog.push(`universities:${uniResult.source}`);

  const newsResult = await fetchWithFallback<FeedItem[]>([
    { name: "rss", fetch: () => getNewsAndBlogs(30) },
  ]);
  if (newsResult) sourceLog.push(`news:${newsResult.source}`);

  const papers = enrichPapers(
    dedupePapers([...(papersResult?.data ?? []), ...(uniResult?.data ?? [])])
  ).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  papers.forEach(cachePaper);

  return {
    papers,
    universityPapers: enrichPapers(uniResult?.data ?? []),
    news: newsResult?.data ?? [],
    sourceLog,
  };
}

export function authorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface TopicSummary {
  slug: string;
  name: string;
  description: string;
  icon: string;
  paperCount: number;
  memberLabel: string;
  latestTitle?: string;
  latestDate?: string;
}

export interface AuthorSummary {
  slug: string;
  name: string;
  paperCount: number;
  topics: string[];
  university?: string;
  latestTitle?: string;
  latestDate?: string;
}

export async function getResearchDirectory(): Promise<{
  topics: TopicSummary[];
  authors: AuthorSummary[];
  refreshedAt: string;
}> {
  const cacheKey = "research:directory";
  const cached = getCache<{
    topics: TopicSummary[];
    authors: AuthorSummary[];
    refreshedAt: string;
  }>(cacheKey);
  if (cached) return cached;

  const hub = await getFullResearchHub();
  const allPapers = dedupePapers([...hub.papers, ...hub.universityPapers]);

  const topics: TopicSummary[] = CATEGORIES.map((cat) => {
    const matching = allPapers.filter(
      (p) =>
        p.category === cat.slug ||
        p.categories?.includes(cat.slug) ||
        p.category === cat.name
    );
    const latest = matching[0];
    return {
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      paperCount: matching.length,
      memberLabel: `${matching.length} papers`,
      latestTitle: latest?.title,
      latestDate: latest?.publishedAt,
    };
  });

  const authorMap = new Map<
    string,
    { name: string; papers: ResearchPaper[]; topics: Set<string>; university?: string }
  >();

  allPapers.forEach((p) => {
    p.authors.forEach((a) => {
      const name = a.name.trim();
      if (!name || name.length < 2) return;
      const slug = authorSlug(name);
      const entry = authorMap.get(slug) ?? {
        name,
        papers: [],
        topics: new Set<string>(),
        university: p.university,
      };
      entry.papers.push(p);
      if (p.category) entry.topics.add(p.category);
      if (p.university) entry.university = p.university;
      authorMap.set(slug, entry);
    });
  });

  const authors: AuthorSummary[] = [...authorMap.entries()]
    .map(([slug, data]) => {
      const sorted = [...data.papers].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      const latest = sorted[0];
      return {
        slug,
        name: data.name,
        paperCount: sorted.length,
        topics: [...data.topics],
        university: data.university,
        latestTitle: latest?.title,
        latestDate: latest?.publishedAt,
      };
    })
    .sort((a, b) => b.paperCount - a.paperCount);

  const result = {
    topics,
    authors,
    refreshedAt: new Date().toISOString(),
  };

  setCache(cacheKey, result, TTL.research, "directory");
  return result;
}

export async function getAuthorResearch(slug: string): Promise<{
  author: AuthorSummary | null;
  papers: ResearchPaper[];
  topics: { slug: string; name: string; count: number }[];
}> {
  const hub = await getFullResearchHub();
  const allPapers = dedupePapers([...hub.papers, ...hub.universityPapers]);
  const papers = allPapers.filter((p) =>
    p.authors.some((a) => authorSlug(a.name) === slug)
  );

  if (papers.length === 0) {
    return { author: null, papers: [], topics: [] };
  }

  const name = papers[0].authors.find((a) => authorSlug(a.name) === slug)?.name ?? slug;
  const topicCounts = new Map<string, number>();
  papers.forEach((p) => {
    const t = p.category ?? "general";
    topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  });

  const topics = [...topicCounts.entries()]
    .map(([topicSlug, count]) => {
      const cat = getCategory(topicSlug);
      return { slug: topicSlug, name: cat?.name ?? topicSlug, count };
    })
    .sort((a, b) => b.count - a.count);

  const author: AuthorSummary = {
    slug,
    name,
    paperCount: papers.length,
    topics: topics.map((t) => t.slug),
    university: papers[0]?.university,
    latestTitle: papers[0]?.title,
    latestDate: papers[0]?.publishedAt,
  };

  return {
    author,
    papers: papers.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    ),
    topics,
  };
}

export async function getUniversityData(slug: string): Promise<{
  university: ReturnType<typeof getUniversity>;
  papers: ResearchPaper[];
  feed: FeedItem[];
  researchers: { name: string; count: number }[];
  topCited: ResearchPaper[];
}> {
  const university = getUniversity(slug);
  if (!university) throw new Error(`University not found: ${slug}`);

  const [ssR, feedR, arxivR, pubmedR] = await Promise.allSettled([
    searchByUniversity(university.ssAffiliation, "artificial intelligence machine learning", 12),
    fetchUniversityFeed(slug),
    university.sources.includes("arxiv")
      ? searchArxivUniversity(university.arxivQuery, university.name, university.slug, 10)
      : Promise.resolve([] as ResearchPaper[]),
    slug === "harvard"
      ? fetchPubMedPapers("Harvard artificial intelligence", 8)
      : Promise.resolve([] as ResearchPaper[]),
  ]);

  const ssPapers = ssR.status === "fulfilled" ? ssR.value : [];
  const feed = feedR.status === "fulfilled" ? feedR.value : [];
  const arxivPapers = arxivR.status === "fulfilled" ? arxivR.value : [];
  const pubmedPapers = pubmedR.status === "fulfilled" ? pubmedR.value : [];

  const feedPapers = feed.map((f) => feedToPaper(f, university.name, slug));
  const papers = dedupePapers([...ssPapers, ...arxivPapers, ...pubmedPapers, ...feedPapers]).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const authorCounts = new Map<string, number>();
  papers.forEach((p) => {
    p.authors.forEach((a) => {
      authorCounts.set(a.name, (authorCounts.get(a.name) ?? 0) + 1);
    });
  });
  const researchers = [...authorCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCited = [...papers]
    .filter((p) => p.citationCount != null)
    .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0))
    .slice(0, 5);

  return { university, papers, feed, researchers, topCited };
}

export async function getLiveFeed(sources?: string[]): Promise<FeedItem[]> {
  const [feedsR, arxivR] = await Promise.allSettled([
    fetchAllFeeds(),
    fetchArxivPapers("cat:cs.AI OR cat:cs.LG", 10).then((papers) =>
      papers.map(
        (p): FeedItem => ({
          id: p.id,
          title: p.title,
          link: p.sourceUrl,
          pubDate: p.publishedAt,
          contentSnippet: p.abstract.slice(0, 200),
          source: "arxiv",
          sourceUrl: "https://arxiv.org",
          logoKey: "arxiv",
          newsCategory: "research",
          handle: "arXiv",
        })
      )
    ),
  ]);

  const feeds = feedsR.status === "fulfilled" ? feedsR.value : [];
  const arxiv = arxivR.status === "fulfilled" ? arxivR.value : [];

  let all = [...feeds, ...arxiv];
  if (sources?.length) {
    all = all.filter((item) => sources.includes(item.source));
  }

  return all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

export async function getUniversitiesOverview(): Promise<
  {
    slug: string;
    name: string;
    accentColor: string;
    paperCount: number;
    lastUpdated: string;
    latestTitles: string[];
  }[]
> {
  return Promise.all(
    UNIVERSITIES.map(async (u) => {
      try {
        const papers = await searchByUniversity(u.ssAffiliation, "AI machine learning", 5);
        return {
          slug: u.slug,
          name: u.name,
          accentColor: u.accentColor,
          paperCount: papers.length,
          lastUpdated: papers[0]?.publishedAt ?? new Date().toISOString(),
          latestTitles: papers.slice(0, 2).map((p) => p.title),
        };
      } catch {
        return {
          slug: u.slug,
          name: u.name,
          accentColor: u.accentColor,
          paperCount: 0,
          lastUpdated: new Date().toISOString(),
          latestTitles: [],
        };
      }
    })
  );
}

function extractThemes(papers: ResearchPaper[]): string[] {
  const words = new Map<string, number>();
  papers.forEach((p) => {
    p.categories?.forEach((c) => words.set(c, (words.get(c) ?? 0) + 2));
    p.title
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 5)
      .forEach((w) => words.set(w, (words.get(w) ?? 0) + 1));
  });
  return [...words.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

export async function buildDailyDigest(): Promise<DailyDigest> {
  const cacheKey = "digest:daily";
  const cached = getCache<DailyDigest>(cacheKey);
  if (cached) return cached;

  const papers = await getAggregatedResearch(20);
  const topPapers: DigestEntry[] = papers.slice(0, 5).map((p, i) => ({
    title: p.title,
    university: p.university,
    summary: excerptSummary(p.abstract, 220),
    whyItMatters: `Contributes to ${p.category ?? p.categories?.[0] ?? "research"} with ${p.citationCount ?? "growing"} scholarly interest.`,
    impactScore: Math.min(10, Math.max(5, 9 - i + (p.citationCount ? Math.min(2, Math.floor(p.citationCount / 50)) : 0))),
    sourceUrl: p.sourceUrl,
  }));

  const digest: DailyDigest = {
    generatedAt: new Date().toISOString(),
    topPapers,
    weeklyThemes: extractThemes(papers).length
      ? extractThemes(papers)
      : ["Machine learning", "Neural networks", "Scientific computing"],
  };

  setCache(cacheKey, digest, TTL.digest, "digest");
  return digest;
}

export async function getPaperDetail(id: string): Promise<{
  paper: ResearchPaper | null;
  related: ResearchPaper[];
  resolvedVia?: string;
}> {
  const cached = getCache<ResearchPaper>(`paper:${id}`);
  if (cached) {
    const paper = enrichPaper(cached);
    const related = await getRelatedForPaper(paper);
    return { paper, related, resolvedVia: "cache" };
  }

  const providers: { name: string; fetch: () => Promise<ResearchPaper | null> }[] = [];

  if (id.startsWith("pubmed-")) {
    const pmid = id.replace(/^pubmed-/, "");
    providers.push({
      name: "pubmed",
      fetch: () => fetchPubMedByPmid(pmid),
    });
  }

  if (id.startsWith("arxiv-")) {
    providers.push({
      name: "arxiv",
      fetch: () => fetchArxivById(id),
    });
  }

  if (id.startsWith("ss-")) {
    providers.push({
      name: "semantic-scholar",
      fetch: () => getPaperById(id),
    });
  }

  providers.push({
    name: "aggregated-search",
    fetch: async () => {
      const pool = await getAggregatedResearch(80);
      return pool.find((p) => p.id === id) ?? null;
    },
  });

  providers.push({
    name: "university-pool",
    fetch: async () => {
      const pool = await getTopUniversityPapers(10);
      return pool.find((p) => p.id === id) ?? null;
    },
  });

  if (id.startsWith("pubmed-")) {
    const pmid = id.replace(/^pubmed-/, "");
    providers.push({
      name: "pubmed-stub",
      fetch: async () => ({
        id,
        title: "PubMed Article",
        abstract: "Full abstract available on PubMed.",
        authors: [{ name: "See PubMed" }],
        university: "Biomedical",
        universitySlug: "biomedical",
        source: "pubmed",
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        publishedAt: new Date().toISOString(),
        year: new Date().getFullYear(),
      }),
    });
  }

  for (const p of providers) {
    try {
      const raw = await p.fetch();
      if (raw) {
        const paper = enrichPaper(raw);
        cachePaper(paper);
        const related = await getRelatedForPaper(paper);
        return { paper, related, resolvedVia: p.name };
      }
    } catch (err) {
      console.warn(`[Paper] ${p.name} failed for ${id}:`, (err as Error).message);
    }
  }

  return { paper: null, related: [] };
}

async function getRelatedForPaper(paper: ResearchPaper): Promise<ResearchPaper[]> {
  if (paper.id.startsWith("ss-")) {
    return getRelatedPapers(paper.id);
  }
  try {
    const similar = await searchPapers(paper.title.slice(0, 80), 6, paper.university, paper.universitySlug);
    return similar.filter((p) => p.id !== paper.id).slice(0, 6);
  } catch {
    const pool = await getAggregatedResearch(30);
    return pool.filter((p) => p.id !== paper.id).slice(0, 6);
  }
}
