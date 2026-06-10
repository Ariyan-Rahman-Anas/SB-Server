import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/app.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "api/handler.mjs",
  // Keep all node_modules external — they are available in Vercel's runtime.
  // This avoids bundling better-auth (ESM-only) into a CJS context,
  // and avoids the kysely internal export conflicts.
  packages: "external",
});

console.log("✅ Build complete → api/handler.mjs");
