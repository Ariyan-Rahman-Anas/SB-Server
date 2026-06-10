/**
 * esbuild entry point → compiled to api/handler.mjs (ESM).
 * @vercel/node is NOT used — Vercel serves the pre-built handler.mjs directly.
 */
import app from "../src/app";

export default app;
