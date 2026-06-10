import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/app.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "api/handler.mjs",
  // Keep all node_modules external — better-auth (ESM) is resolved at runtime
  // by Node.js which handles .mjs imports natively. Bundling better-auth
  // causes a kysely version conflict so we must keep it external.
  packages: "external",
  sourcemap: false,
});

console.log("✅ Build complete → api/handler.mjs");


