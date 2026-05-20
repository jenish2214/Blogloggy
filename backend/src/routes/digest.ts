import { Router } from "express";
import { buildDailyDigest } from "../services/researchAggregator.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const digest = await buildDailyDigest();
    res.json(digest);
  } catch (err) {
    next(err);
  }
});

export default router;
