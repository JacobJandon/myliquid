import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/** The whole suite against a libSQL server (see scripts/libsql-test-setup.ts). */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      setupFiles: ["./scripts/libsql-test-setup.ts"],
      fileParallelism: false,
      testTimeout: 120_000,
      hookTimeout: 120_000,
    },
  }),
);
