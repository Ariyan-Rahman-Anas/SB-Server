/**
 * Vercel serverless entry point.
 * Imports the Express app (no listen() call) and exports it as the default handler.
 * @vercel/node wraps this into a serverless function automatically.
 */
import app from "../src/app";

export default app;
