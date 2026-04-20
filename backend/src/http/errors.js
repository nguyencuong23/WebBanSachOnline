export class HttpError extends Error {
  constructor(status, message, code = "error", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function assert(condition, status, message, code, details) {
  if (!condition) throw new HttpError(status, message, code, details);
}

