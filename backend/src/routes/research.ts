import { Router } from "express";
import {
  getAggregatedResearch,
  getAuthorResearch,
  getFullResearchHub,
  getArticleDetail,
  getLiveFeed,
  getNewsAndBlogs,
  getNewsHub,
  getPaperDetail,
  getResearchDirectory,
  getTopUniversityPapers,
} from "../services/researchAggregator.js";
import { fetchArxivByCategory } from "../services/arxivService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const papers = await getAggregatedResearch(limit);
    res.json({ papers });
  } catch (err) {
    next(err);
  }
});

router.get("/all", async (req, res, next) => {
  try {
    const hub = await getFullResearchHub();
    res.json(hub);
  } catch (err) {
    next(err);
  }
});

router.get("/directory", async (_req, res, next) => {
  try {
    const directory = await getResearchDirectory();
    res.json(directory);
  } catch (err) {
    next(err);
  }
});

router.get("/authors/:slug", async (req, res, next) => {
  try {
    const slug = decodeURIComponent(req.params.slug);
    const data = await getAuthorResearch(slug);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/universities", async (_req, res, next) => {
  try {
    const papers = await getTopUniversityPapers(8);
    res.json({ papers });
  } catch (err) {
    next(err);
  }
});

router.get("/news/hub", async (_req, res, next) => {
  try {
    const hub = await getNewsHub();
    res.json(hub);
  } catch (err) {
    next(err);
  }
});

router.get("/news", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 60, 120);
    const category = req.query.category as string | undefined;
    const validCategories = [
      "technology",
      "research",
      "university",
      "labs",
      "reference",
    ];
    const valid =
      category && validCategories.includes(category)
        ? (category as import("../types/index.js").NewsCategory)
        : undefined;
    const items = await getNewsAndBlogs(limit, valid);
    res.json({ items, refreshedAt: new Date().toISOString(), category: valid ?? "all" });
  } catch (err) {
    next(err);
  }
});

router.get("/article/:id", async (req, res, next) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const data = await getArticleDetail(id);
    if (!data.article) {
      res.status(404).json({ error: "Article not found", id });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/live", async (req, res, next) => {
  try {
    const sourcesParam = req.query.sources as string | undefined;
    const sources = sourcesParam ? sourcesParam.split(",") : undefined;
    const items = await getLiveFeed(sources);
    res.json({ items, refreshedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.get("/arxiv/:category", async (req, res, next) => {
  try {
    const category = req.params.category as "ai" | "nlp" | "systems" | "math" | "physics";
    const papers = await fetchArxivByCategory(
      ["ai", "nlp", "systems", "math", "physics"].includes(category) ? category : "ai",
      Number(req.query.limit) || 10
    );
    res.json({ papers });
  } catch (err) {
    next(err);
  }
});

router.get("/paper/:id", async (req, res, next) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const data = await getPaperDetail(id);
    if (!data.paper) {
      res.status(404).json({ error: "Paper not found", id });
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
