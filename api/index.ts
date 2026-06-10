/**
 * Vercel serverless entry point.
 * Exports the Express app — @vercel/node wraps it as a serverless function.
 * better-auth/node (ESM-only) is loaded via dynamic import() inside app.ts.
 */
import app from "../src/app";

export default app;
