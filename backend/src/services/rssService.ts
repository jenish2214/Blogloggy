import Parser from "rss-parser";
import type { DataSource, FeedItem, NewsCategory } from "../types/index.js";
import { getCache, setCache, TTL } from "./cacheService.js";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "ResearchDigest/1.0 (research-digest)" },
});

export const RSS_FEEDS: {
  url: string;
  source: DataSource;
  sourceUrl: string;
  logoKey: string;
  newsCategory: NewsCategory;
  handle: string;
}[] = [
  {
    url: "https://hnrss.org/frontpage",
    source: "hn-rss",
    sourceUrl: "https://news.ycombinator.com",
    logoKey: "hn",
    newsCategory: "technology",
    handle: "HackerNews",
  },
  {
    url: "https://techcrunch.com/feed/",
    source: "techcrunch-rss",
    sourceUrl: "https://techcrunch.com",
    logoKey: "techcrunch",
    newsCategory: "technology",
    handle: "TechCrunch",
  },
  {
    url: "https://www.theverge.com/rss/index.xml",
    source: "verge-rss",
    sourceUrl: "https://www.theverge.com",
    logoKey: "verge",
    newsCategory: "technology",
    handle: "TheVerge",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
    source: "arstechnica-rss",
    sourceUrl: "https://arstechnica.com",
    logoKey: "arstechnica",
    newsCategory: "technology",
    handle: "ArsTechnica",
  },
  {
    url: "https://www.technologyreview.com/feed/",
    source: "mit-tr-rss",
    sourceUrl: "https://www.technologyreview.com",
    logoKey: "mit-tr",
    newsCategory: "technology",
    handle: "MITTechReview",
  },
  {
    url: "https://news.mit.edu/rss/topic/artificial-intelligence",
    source: "mit-rss",
    sourceUrl: "https://news.mit.edu",
    logoKey: "mit",
    newsCategory: "university",
    handle: "MITNews",
  },
  {
    url: "https://news.harvard.edu/gazette/feed/",
    source: "harvard-rss",
    sourceUrl: "https://news.harvard.edu",
    logoKey: "harvard",
    newsCategory: "university",
    handle: "Harvard",
  },
  {
    url: "https://news.stanford.edu/feed/",
    source: "stanford-rss",
    sourceUrl: "https://news.stanford.edu",
    logoKey: "stanford",
    newsCategory: "university",
    handle: "Stanford",
  },
  {
    url: "https://www.ox.ac.uk/news-and-events/find-a-story/rss",
    source: "oxford-rss",
    sourceUrl: "https://www.ox.ac.uk",
    logoKey: "oxford",
    newsCategory: "university",
    handle: "Oxford",
  },
  {
    url: "https://www.cam.ac.uk/news/feed",
    source: "cambridge-rss",
    sourceUrl: "https://www.cam.ac.uk",
    logoKey: "cambridge",
    newsCategory: "university",
    handle: "Cambridge",
  },
  {
    url: "https://deepmind.google/blog/rss.xml",
    source: "deepmind-rss",
    sourceUrl: "https://deepmind.google",
    logoKey: "deepmind",
    newsCategory: "research",
    handle: "DeepMind",
  },
  {
    url: "https://arxiv.org/rss/cs.AI",
    source: "arxiv",
    sourceUrl: "https://arxiv.org",
    logoKey: "arxiv",
    newsCategory: "research",
    handle: "arXiv",
  },
  {
    url: "https://www.anthropic.com/rss.xml",
    source: "anthropic-rss",
    sourceUrl: "https://www.anthropic.com",
    logoKey: "anthropic",
    newsCategory: "labs",
    handle: "Anthropic",
  },
  {
    url: "https://openai.com/blog/rss.xml",
    source: "openai-rss",
    sourceUrl: "https://openai.com",
    logoKey: "openai",
    newsCategory: "labs",
    handle: "OpenAI",
  },
];

function stableFeedId(
  source: DataSource,
  item: { guid?: string; link?: string },
  index: number,
  pubDate: string
): string {
  const raw = `${source}-${item.guid ?? item.link ?? index}-${Date.parse(pubDate)}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
}

export async function parseFeed(
  url: string,
  source: DataSource,
  sourceUrl: string,
  logoKey: string,
  newsCategory: NewsCategory,
  handle: string
): Promise<FeedItem[]> {
  const cacheKey = `rss:${url}`;
  const cached = getCache<FeedItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const feed = await parser.parseURL(url);
    const items: FeedItem[] = (feed.items ?? []).slice(0, 15).map((item, i) => {
      const pubDate = item.isoDate ?? item.pubDate ?? new Date().toISOString();
      return {
        id: stableFeedId(source, item, i, pubDate),
        title: item.title ?? "Untitled",
        link: item.link ?? sourceUrl,
        pubDate,
        contentSnippet: (item.contentSnippet ?? item.summary ?? "")
          .replace(/<[^>]+>/g, "")
          .slice(0, 400),
        source,
        sourceUrl,
        logoKey,
        newsCategory,
        handle,
      };
    });
    setCache(cacheKey, items, TTL.rss, source);
    return items;
  } catch (err) {
    console.warn(`[RSS] Failed to parse ${url}:`, err);
    return [];
  }
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((f) =>
      parseFeed(f.url, f.source, f.sourceUrl, f.logoKey, f.newsCategory, f.handle)
    )
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<FeedItem[]>).value)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

export async function fetchUniversityFeed(slug: string): Promise<FeedItem[]> {
  const map: Record<string, DataSource> = {
    mit: "mit-rss",
    harvard: "harvard-rss",
    stanford: "stanford-rss",
    oxford: "oxford-rss",
    cambridge: "cambridge-rss",
    deepmind: "deepmind-rss",
  };
  const source = map[slug];
  if (!source) return [];
  const feed = RSS_FEEDS.find((f) => f.source === source);
  if (!feed) return [];
  return parseFeed(
    feed.url,
    feed.source,
    feed.sourceUrl,
    feed.logoKey,
    feed.newsCategory,
    feed.handle
  );
}
