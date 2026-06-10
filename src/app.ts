import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env";
import { auth } from "./auth/auth";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import apiRouter from "./routes/index";

const app = express();

// ── Security headers 
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ── CORS ── Must come before better-auth so preflight OPTIONS are handled
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// ── Better Auth ── ESM-only package — loaded via dynamic import
// Must be mounted BEFORE express.json() (handles its own body parsing)
app.all("/api/auth/*", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toNodeHandler } = await import("better-auth/node");
    return toNodeHandler(auth)(req, res);
  } catch (err) {
    next(err);
  }
});

// ── Body parsers 
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Request logging 
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Health check 
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Shine Bright API is running",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Rate Limiting 
app.use("/api", apiRateLimiter);

// ── Application Routes 
app.use("/api", apiRouter);

// ── 404 & Error Handlers 
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
