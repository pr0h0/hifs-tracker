import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Production is a static export served by Cloudflare Pages, with the API in functions/.
// `next dev` forwards /api to `wrangler pages dev` on :8788 (started by `bun run dev`).
/** @type {(phase: string) => import('next').NextConfig} */
const config = (phase) =>
  phase === PHASE_DEVELOPMENT_SERVER
    ? { rewrites: async () => [{ source: "/api/:path*", destination: "http://localhost:8788/api/:path*" }] }
    : { output: "export" };

export default config;
