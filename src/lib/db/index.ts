import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDatabase } from "./seed";
import { toIsoDate } from "@/lib/domain/dates";

export type Db = Database.Database;

/** The seeded demo investor. Tests use it; guests get their own copy of its portfolio. */
export const DEMO_INVESTOR_ID = "inv_demo";

const globalForDb = globalThis as unknown as { __myliquidDb?: Db };

function resolveDbPath(): string {
  return process.env.MYLIQUID_DB_PATH || path.join(process.cwd(), ".data", "myliquid.db");
}

function storedSchemaVersion(db: Db): number | null {
  const hasMeta = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'meta'")
    .get();
  if (!hasMeta) return null;
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
    { value: string } | undefined;
  return row ? Number(row.value) : null;
}

/** Drops every table. Used when an older demo database meets a newer schema. */
function dropAllTables(db: Db): void {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  db.pragma("foreign_keys = OFF");
  for (const { name } of tables) db.exec(`DROP TABLE IF EXISTS "${name}"`);
  db.pragma("foreign_keys = ON");
}

/** Opens a database, applies the schema and seeds it on first use. */
export function openDatabase(file: string, opts: { today?: string } = {}): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const version = storedSchemaVersion(db);
  if (version !== null && version !== SCHEMA_VERSION) {
    // Pre-release: demo data is disposable, so an old schema is rebuilt from scratch.
    dropAllTables(db);
  }
  db.exec(SCHEMA_SQL);
  const seeded = db.prepare("SELECT value FROM meta WHERE key = 'seeded_at'").get();
  if (!seeded) {
    const today = opts.today ?? process.env.MYLIQUID_SIM_START ?? toIsoDate(new Date());
    seedDatabase(db, today);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(
      String(SCHEMA_VERSION),
    );
  }
  return db;
}

/** The process-wide database connection (reused across hot reloads in dev). */
export function getDb(): Db {
  if (!globalForDb.__myliquidDb) {
    globalForDb.__myliquidDb = openDatabase(resolveDbPath());
  }
  return globalForDb.__myliquidDb;
}

/** Replaces the process-wide connection. Used by tests. */
export function setDb(db: Db | undefined): void {
  globalForDb.__myliquidDb = db;
}

/** Drops all data and re-seeds. Keeps the same file. */
export function resetDatabase(today?: string): Db {
  const current = globalForDb.__myliquidDb;
  const file = current?.name ?? resolveDbPath();
  current?.close();
  if (file !== ":memory:") {
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(`${file}${suffix}`, { force: true });
  }
  const db = openDatabase(file, { today });
  setDb(db);
  return db;
}

export function getMeta(db: Db, key: string): string | undefined {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    { value: string } | undefined;
  return row?.value;
}

export function setMeta(db: Db, key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);
}

export function simDate(db: Db = getDb()): string {
  const date = getMeta(db, "sim_date");
  if (!date) throw new Error("Database is not seeded");
  return date;
}

export { newId, nowIso } from "./util";
