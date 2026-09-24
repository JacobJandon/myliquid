import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { MYLIQUID_DB_PATH: ":memory:", ANTHROPIC_API_KEY: "", MYLIQUID_MARKET_CLOCK: "manual" },
  },
});
