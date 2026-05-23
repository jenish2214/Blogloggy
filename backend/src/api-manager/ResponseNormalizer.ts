import { z } from "zod";
import type {
  NormalizationResult,
  NormalizedFeedItem,
  NormalizedPaper,
} from "./types.js";
import { logger } from "./logger.js";

const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  abstract: z.string(),
  authors: z.array(
    z.object({
      name: z.string(),
      affiliation: z.string().optional(),
    })
  ),
  publishedAt: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  categories: z.array(z.string()),
  citationCount: z.number(),
  year: z.number(),
});

export class ResponseNormalizer {
  normalize<TRaw, TNormalized>(
    raw: TRaw,
    sourceId: string,
    schema: z.ZodSchema<TNormalized>
  ): NormalizationResult<TNormalized> {
    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      return { data: parsed.data, valid: true, warnings: [] };
    }
    const warnings = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    logger.warn({
      msg: "normalization_failed",
      sourceId,
      warnings,
    });
    return {
      data: raw as unknown as TNormalized,
      valid: false,
      warnings,
    };
  }

  normalizeArxivPaper(entry: Record<string, unknown>): NormalizedPaper {
    const idRaw = String(entry.id ?? "");
    const arxivId = idRaw.split("/abs/").pop()?.split("v")[0] ?? idRaw;
    const published = String(
      entry.published ?? entry.updated ?? new Date().toISOString()
    );
    const authors = entry.author;
    const authorList = authors
      ? (Array.isArray(authors) ? authors : [authors]).map(
          (a: Record<string, unknown>) => ({
            name: String(a.name ?? "Unknown"),
            affiliation: a.affiliation
              ? String(a.affiliation)
              : undefined,
          })
        )
      : [{ name: "Unknown" }];

    const categories = entry.category;
    const cats: string[] = [];
    if (categories) {
      const arr = Array.isArray(categories) ? categories : [categories];
      arr.forEach((c: Record<string, unknown>) => {
        if (c["@_term"]) cats.push(String(c["@_term"]));
      });
    }

    const paper: NormalizedPaper = {
      id: `arxiv-${arxivId}`,
      title: String(entry.title ?? "Untitled").replace(/\s+/g, " ").trim(),
      abstract: String(entry.summary ?? "").replace(/\s+/g, " ").trim(),
      authors: authorList,
      publishedAt: published,
      source: "arxiv",
      sourceUrl: `https://arxiv.org/abs/${arxivId}`,
      categories: cats,
      citationCount: 0,
      year: new Date(published).getFullYear(),
    };

    return this.normalize(paper, "arxiv", paperSchema).data;
  }

  normalizeSemanticPaper(raw: Record<string, unknown>): NormalizedPaper {
    const ext = (raw.externalIds as Record<string, string>) ?? {};
    const arxivId = ext.ArXiv;
    const id = arxivId
      ? `arxiv-${arxivId}`
      : `ss-${String(raw.paperId ?? raw.id ?? "unknown")}`;
    const pub = String(raw.publicationDate ?? raw.year ?? new Date().toISOString());
    const authors = ((raw.authors as { name: string }[]) ?? []).map((a) => ({
      name: a.name ?? "Unknown",
    }));

    const paper: NormalizedPaper = {
      id,
      title: String(raw.title ?? "Untitled"),
      abstract: String(raw.abstract ?? ""),
      authors: authors.length ? authors : [{ name: "Unknown" }],
      publishedAt: pub,
      source: "semantic-scholar",
      sourceUrl: String(raw.url ?? `https://www.semanticscholar.org/paper/${raw.paperId}`),
      categories: [],
      citationCount: Number(raw.citationCount ?? 0),
      year: Number(raw.year ?? new Date(pub).getFullYear()),
    };

    return this.normalize(paper, "semantic-scholar", paperSchema).data;
  }

  normalizePubMedArticle(
    article: Record<string, unknown>,
    pmid: string
  ): NormalizedPaper {
    const medline = article.MedlineCitation as Record<string, unknown>;
    const art = medline?.Article as Record<string, unknown>;
    const title = String(art?.ArticleTitle ?? "Untitled");
    const abstractObj = art?.Abstract as Record<string, unknown>;
    let abstract = "";
    if (abstractObj?.AbstractText) {
      const texts = abstractObj.AbstractText;
      abstract = Array.isArray(texts)
        ? texts.map((t) => String(t)).join(" ")
        : String(texts);
    }
    const authorList = art?.AuthorList as Record<string, unknown>;
    const authors = authorList?.Author
      ? (Array.isArray(authorList.Author)
          ? authorList.Author
          : [authorList.Author]
        ).map((a: Record<string, unknown>) => ({
          name: `${a.LastName ?? ""} ${a.ForeName ?? ""}`.trim() || "Unknown",
        }))
      : [{ name: "Unknown" }];

    const pubDate = medline?.DateCompleted as Record<string, unknown>;
    const year = Number(pubDate?.Year ?? new Date().getFullYear());
    const month = String(pubDate?.Month ?? "01").padStart(2, "0");
    const day = String(pubDate?.Day ?? "01").padStart(2, "0");
    const publishedAt = `${year}-${month}-${day}`;

    const paper: NormalizedPaper = {
      id: `pubmed-${pmid}`,
      title,
      abstract,
      authors,
      publishedAt,
      source: "pubmed",
      sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      categories: ["biomedical"],
      citationCount: 0,
      year,
    };

    return this.normalize(paper, "pubmed", paperSchema).data;
  }

  normalizeRssItem(
    item: Record<string, unknown>,
    feedKey: string,
    sourceUrl: string
  ): NormalizedFeedItem {
    const link = String(item.link ?? item.guid ?? "");
    const pubDate = String(
      item.isoDate ?? item.pubDate ?? new Date().toISOString()
    );
    const id = `${feedKey}-${link}`.slice(0, 120);

    return {
      id,
      title: String(item.title ?? "Untitled"),
      link,
      pubDate,
      contentSnippet: String(item.contentSnippet ?? item.content ?? "")
        .replace(/<[^>]+>/g, "")
        .slice(0, 300),
      source: `${feedKey}-rss`,
      sourceUrl,
      logoKey: feedKey,
    };
  }
}
