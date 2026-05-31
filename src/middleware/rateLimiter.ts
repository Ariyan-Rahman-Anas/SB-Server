import rateLimit from "express-rate-limit";

const createLimiter = (
  windowMs: number,
  max: number,
  message: string
) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
    skipSuccessfulRequests: false,
  });

/**
 * General API rate limiter — 100 requests per 20 minutes per IP.
 */
export const apiRateLimiter = createLimiter(
  20 * 60 * 1000,
  100,
  "Too many requests — please try again after some time."
);

/**
 * Stricter limiter for sensitive write operations (create order, upload, etc.).
 * 30 requests per 15 minutes per IP.
 */
export const writeLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  "Too many requests — please slow down."
);
