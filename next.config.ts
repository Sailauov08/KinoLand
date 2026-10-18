import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Every page depends on per-request cookies (locale + session), so the
  // classic caching model is used; TMDB responses are cached via fetch revalidation.
  cacheComponents: false,
  // Loaded at runtime from node_modules (PGlite ships a WASM build of Postgres).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    // TMDB serves pre-sized artwork from its CDN; the loader picks the right size per srcset width.
    loader: "custom",
    loaderFile: "./src/lib/movies/tmdb-image-loader.ts",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
