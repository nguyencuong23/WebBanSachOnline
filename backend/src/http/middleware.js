import { HttpError } from "./errors.js";

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

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" }
  });
}

