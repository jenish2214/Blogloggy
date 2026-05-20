import { Router } from "express";
import { UNIVERSITIES } from "../config/universities.js";
import {
  getUniversitiesOverview,
  getUniversityData,
} from "../services/researchAggregator.js";
import { sanitizeSlug } from "../middleware/security.js";

const router = Router();
router.param("slug", sanitizeSlug);

router.get("/", async (_req, res, next) => {
  try {
    const overview = await getUniversitiesOverview();
    res.json({ universities: UNIVERSITIES, overview });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const university = UNIVERSITIES.find((u) => u.slug === req.params.slug);
    if (!university) {
      res.status(404).json({ error: "University not found", slug: req.params.slug });
      return;
    }
    const data = await getUniversityData(req.params.slug);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
