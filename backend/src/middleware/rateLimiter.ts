import * as RateLimit from "express-rate-limit";

export const apiLimiter = RateLimit.default({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
