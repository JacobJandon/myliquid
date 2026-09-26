import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { isRemoteUrl, openRemoteDatabase, toPositional } from "../remote";

describe("hosted database helpers", () => {
  it("tells libSQL URLs from file paths", () => {
    expect(isRemoteUrl("libsql://myliquid-me.turso.io")).toBe(true);
    expect(isRemoteUrl("https://myliquid-me.turso.io")).toBe(true);
    expect(isRemoteUrl("http://127.0.0.1:8080")).toBe(true);
    expect(isRemoteUrl(".data/myliquid.db")).toBe(false);
    expect(isRemoteUrl(":memory:")).toBe(false);
  });

  it("rewrites named parameters to positional ones, leaving strings and comments alone", () => {
    expect(toPositional("SELECT 1")).toEqual({ sql: "SELECT 1", names: null });
    expect(
      toPositional(
        "INSERT INTO t (a, b, c) VALUES (@a, :b, $c) -- @not\n ON CONFLICT DO UPDATE SET a = @a, note = 'x@y.com :z'",
      ),
    ).toEqual({
      sql: "INSERT INTO t (a, b, c) VALUES (?, ?, ?) -- @not\n ON CONFLICT DO UPDATE SET a = ?, note = 'x@y.com :z'",
      names: ["a", "b", "c", "a"],
    });
    expect(toPositional(`SELECT "we@ird", 'it''s @x' FROM t WHERE id = @id`)).toEqual({
      sql: `SELECT "we@ird", 'it''s @x' FROM t WHERE id = ?`,
      names: ["id"],
    });
  });
});

/**
 * Runs against a real libSQL server when LIBSQL_TEST_URL is set, for example a
 * local `turso dev` (http://127.0.0.1:8080). The whole suite can also run there
 * with `npm run test:libsql`.
 */
const url = process.env.LIBSQL_TEST_URL;

describe.skipIf(!url)("hosted database (libSQL server)", () => {
  let db: Db;

  beforeAll(() => {
    db = openRemoteDatabase(url!);
    db.exec(
      "DROP TABLE IF EXISTS remote_t; CREATE TABLE remote_t (key TEXT, action TEXT, n INTEGER, x)",
    );
  });

  afterAll(() => {
    db.exec("DROP TABLE IF EXISTS remote_t");
    db.close();
  });

  const rows = () => db.prepare("SELECT key, action, n FROM remote_t ORDER BY rowid").all();

  it("binds like better-sqlite3 and returns plain rows", () => {
    db.prepare("INSERT INTO remote_t (key, action, n, x) VALUES (@key, @action, @n, @x)").run({
      key: "a",
      action: "buy",
      n: 1,
      x: 5,
    });
    db.prepare("INSERT INTO remote_t (key, action, n) VALUES ('b', 'sell', ?)").run(null);
    expect(rows()).toEqual([
      { key: "a", action: "buy", n: 1 },
      { key: "b", action: "sell", n: null },
    ]);
    expect(db.prepare("SELECT typeof(x) AS t FROM remote_t WHERE key = 'a'").get()).toEqual({
      t: "integer",
    });
    expect(() => db.prepare("SELECT ?").get(true)).toThrow(TypeError);
  });

  it("keeps a statement prepared outside a transaction inside it", () => {
    db.exec("DELETE FROM remote_t");
    const insert = db.prepare("INSERT INTO remote_t (key, n) VALUES (?, ?)");
    insert.run("before", 1);
    expect(() =>
      db.transaction(() => {
        insert.run("rolled back", 2);
        throw new Error("abort");
      })(),
    ).toThrow("abort");
    db.transaction(() => insert.run("committed", 3))();
    insert.run("after", 4);
    expect(rows().map((r) => (r as { key: string }).key)).toEqual(["before", "committed", "after"]);
  });

  it("nests transactions as savepoints", () => {
    db.exec("DELETE FROM remote_t");
    const insert = db.prepare("INSERT INTO remote_t (key) VALUES (?)");
    db.transaction(() => {
      insert.run("outer");
      try {
        db.transaction(() => {
          insert.run("inner");
          throw new Error("inner fails");
        })();
      } catch {
        // The outer transaction carries on.
      }
      db.transaction(() => insert.run("inner ok"))();
    })();
    expect(rows().map((r) => (r as { key: string }).key)).toEqual(["outer", "inner ok"]);
  });
});
