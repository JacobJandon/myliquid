import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Native database drivers stay out of the server bundle: better-sqlite3 for a
  // local file, libsql for a hosted database (Turso, used on Vercel).
  serverExternalPackages: ["better-sqlite3", "libsql"],
  // libsql loads its platform binary with a computed require that file tracing
  // can't follow, so every server function ships the installed builds explicitly.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@libsql/linux-*/**/*"],
  },
  poweredByHeader: false,
  // The Docker image builds a self-contained server (NEXT_OUTPUT=standalone).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async headers() {
    return [
      // Every response: no framing (clickjacking), no MIME sniffing, HTTPS only, no stray device access.
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The service worker must never be served stale, or an installed app keeps an old one.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
