import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[API Error]", err.message);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Endpoint not found" });
}
