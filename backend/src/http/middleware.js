import { HttpError } from "./errors.js";
import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({ error: { code: "not_found", message: "Not found" } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    console.error(`[HTTP ${err.status}] ${req.method} ${req.path} →`, err.message, err.details ?? "");
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => e.message).join(", ");
    res.status(400).json({
      error: {
        code: "validation_error",
        message: messages,
        details: err.errors
      }
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" }
  });
}

