/**
 * Vercel serverless entry point.
 * Wraps the Express app import in a try-catch so initialization errors
 * are returned as readable JSON instead of an opaque 500 crash.
 */
import type { Request, Response } from "express"

let handler: ((req: Request, res: Response) => void) | null = null
let initError: unknown = null

try {
  const mod = await import("../src/app.js")
  handler = mod.default
} catch (err) {
  initError = err
  console.error("[api/index] Initialization error:", err)
}

export default function (req: Request, res: Response) {
  if (initError || !handler) {
    res.status(500).json({
      success: false,
      message: "Server initialization failed",
      error: initError instanceof Error ? initError.message : String(initError),
    })
    return
  }
  handler(req, res)
}
