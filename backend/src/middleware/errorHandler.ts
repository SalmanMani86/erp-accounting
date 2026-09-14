import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { UnbalancedEntryError, InvalidJournalLineError } from "../accounting-engine/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_FAILED", message: "Request validation failed", details: err.flatten() },
    });
    return;
  }

  if (err instanceof UnbalancedEntryError || err instanceof InvalidJournalLineError) {
    res.status(422).json({ error: { code: "UNBALANCED_ENTRY", message: err.message } });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}
