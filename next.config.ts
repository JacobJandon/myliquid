import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native database drivers stay out of the server bundle: better-sqlite3 for a
  // local file, libsql for a hosted database (Turso, used on Vercel).
  serverExternalPackages: ["better-sqlite3", "libsql"],
  // libsql loads its platform binary with a computed require that file tracing
  // can't follow, so every server function ships the installed builds explicitly.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@libsql/linux-*/**/*"],
  },
  // The Docker image builds a self-contained server (NEXT_OUTPUT=standalone).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
