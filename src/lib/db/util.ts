import type { Db } from "./index";

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Inserts rows with one statement per batch. On a hosted database every statement
 * is a network round trip, so this keeps large writes (seeding, a new account's
 * history) short. `head` is the statement up to `VALUES`.
 */
export function insertMany(
  db: Db,
  head: string,
  rows: (string | number | null)[][],
  batch = 100,
): void {
  for (let i = 0; i < rows.length; i += batch) {
    const part = rows.slice(i, i + batch);
    const values = part.map((row) => `(${row.map(() => "?").join(", ")})`).join(", ");
    db.prepare(`${head} VALUES ${values}`).run(...part.flat());
  }
}
