import type { NextFunction, Request, Response } from "express";

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.removeHeader("X-Powered-By");
  next();
}

export function sanitizeSlug(
  req: Request,
  res: Response,
  next: NextFunction,
  slug: string
): void {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }
  next();
}
