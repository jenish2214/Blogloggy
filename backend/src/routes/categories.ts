import { Router } from "express";
import { CATEGORIES, getCategory } from "../config/categories.js";
import { getCategoryResearch } from "../services/researchAggregator.js";
import { sanitizeSlug } from "../middleware/security.js";

const router = Router();
router.param("slug", sanitizeSlug);

router.get("/", (_req, res) => {
  res.json({
    categories: CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
    })),
  });
});

router.get("/:slug", async (req, res, next) => {
  try {
    const category = getCategory(req.params.slug);
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const data = await getCategoryResearch(category.slug, limit);
    res.json({ category, ...data });
  } catch (err) {
    next(err);
  }
});

export default router;
