import { vi } from "vitest";

/**
 * For `npm run test:libsql`: every in-memory database a test opens becomes the
 * libSQL server at LIBSQL_TEST_URL, wiped and re-seeded, so the whole suite runs
 * through the hosted-database wrapper. It deletes everything in that database.
 */
vi.mock("@/lib/db", async (importOriginal) => {
  const db = await importOriginal<typeof import("@/lib/db")>();
  const url = process.env.LIBSQL_TEST_URL;
  if (!url) throw new Error("Set LIBSQL_TEST_URL to a libSQL server, e.g. a local `turso dev`.");
  return {
    ...db,
    openDatabase: (target: string, opts?: { today?: string }) => {
      if (target !== ":memory:") return db.openDatabase(target, opts);
      const saved = process.env.TURSO_DATABASE_URL;
      process.env.TURSO_DATABASE_URL = url;
      db.setDb(undefined);
      try {
        return db.resetDatabase(opts?.today);
      } finally {
        db.setDb(undefined);
        process.env.TURSO_DATABASE_URL = saved;
      }
    },
  };
});
