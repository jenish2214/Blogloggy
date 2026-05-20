export interface Author {
  name: string;
  affiliation?: string;
}

export type DataSource =
  | "arxiv"
  | "semantic-scholar"
  | "pubmed"
  | "mit-rss"
  | "harvard-rss"
  | "stanford-rss"
  | "oxford-rss"
  | "cambridge-rss"
  | "deepmind-rss"
  | "hn-rss"
  | "techcrunch-rss"
  | "verge-rss"
  | "arstechnica-rss"
  | "mit-tr-rss"
  | "anthropic-rss"
  | "openai-rss"
  | "wikipedia";

export type NewsCategory =
  | "technology"
  | "research"
  | "university"
  | "labs"
  | "reference";

export interface ResearchPaper {
  id: string;
  title: string;
  abstract: string;
  authors: Author[];
  university: string;
  universitySlug: string;
  source: DataSource;
  sourceUrl: string;
  publishedAt: string;
  year: number;
  citationCount?: number;
  categories?: string[];
  category?: string;
  impactScore?: number;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: DataSource;
  sourceUrl: string;
  logoKey: string;
  newsCategory: NewsCategory;
  handle: string;
}

export interface DigestEntry {
  title: string;
  university: string;
  summary: string;
  whyItMatters: string;
  impactScore: number;
  sourceUrl: string;
}

export interface DailyDigest {
  generatedAt: string;
  topPapers: DigestEntry[];
  weeklyThemes: string[];
}

export interface UniversityConfig {
  slug: string;
  name: string;
  accentColor: string;
  description: string;
  sources: DataSource[];
  arxivQuery: string;
  ssAffiliation: string;
}
