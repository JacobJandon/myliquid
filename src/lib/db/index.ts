import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedDatabase } from "./seed";
import { isRemoteUrl, openRemoteDatabase } from "./remote";
import { toIsoDate } from "@/lib/domain/dates";

export type Db = Database.Database;

/** The seeded demo investor. Tests use it; guests get their own copy of its portfolio. */
export const DEMO_INVESTOR_ID = "inv_demo";

const globalForDb = globalThis as unknown as { __myliquidDb?: Db };

/**
 * Where the database lives: a hosted libSQL database (Turso) when
 * `TURSO_DATABASE_URL` is set, as on Vercel, otherwise a SQLite file.
 */
function resolveDbTarget(): string {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  if (url) return url;
  // Vercel's file system is read-only and not shared between instances.
  if (process.env.VERCEL)
    throw new Error(
      "No database: connect a Turso database to this Vercel project (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN). See docs/DEPLOY.md.",
    );
  return process.env.MYLIQUID_DB_PATH || path.join(process.cwd(), ".data", "myliquid.db");
}

function remoteAuthToken(): string | undefined {
  return process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || undefined;
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
  // Hosted databases keep foreign keys on, so children must go before parents.
  let left = tables.map((t) => t.name);
  for (let pass = 0; left.length > 0 && pass < 20; pass++) {
    left = left.filter((name) => {
      try {
        db.exec(`DROP TABLE IF EXISTS "${name}"`);
        return false;
      } catch {
        return true;
      }
    });
  }
  db.pragma("foreign_keys = ON");
  if (left.length > 0) throw new Error(`Could not drop tables: ${left.join(", ")}`);
}

function connect(target: string): Db {
  if (isRemoteUrl(target)) return openRemoteDatabase(target, remoteAuthToken());
  if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma("journal_mode = WAL");
  return db;
}

/** Applies the schema and seeds an empty database. */
function initialise(db: Db, opts: { today?: string }): Db {
  db.pragma("foreign_keys = ON");
  const version = storedSchemaVersion(db);
  if (version !== null && version !== SCHEMA_VERSION) {
    // Pre-release: demo data is disposable, so an old schema is rebuilt from scratch.
    dropAllTables(db);
  }
  db.exec(SCHEMA_SQL);
  // Checked inside the transaction so two servers starting together seed only once.
  db.transaction(() => {
    if (db.prepare("SELECT value FROM meta WHERE key = 'seeded_at'").get()) return;
    const today = opts.today ?? process.env.MYLIQUID_SIM_START ?? toIsoDate(new Date());
    seedDatabase(db, today);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(
      String(SCHEMA_VERSION),
    );
  })();
  return db;
}

/**
 * Opens a database (a file path, ":memory:" or a libSQL URL), applies the schema
 * and seeds it on first use.
 */
export function openDatabase(target: string, opts: { today?: string } = {}): Db {
  return initialise(connect(target), opts);
}

/** The process-wide database connection (reused across hot reloads in dev). */
export function getDb(): Db {
  if (!globalForDb.__myliquidDb) {
    globalForDb.__myliquidDb = openDatabase(resolveDbTarget());
  }
  return globalForDb.__myliquidDb;
}

/** Replaces the process-wide connection. Used by tests. */
export function setDb(db: Db | undefined): void {
  globalForDb.__myliquidDb = db;
}

/** Drops all data and re-seeds. Keeps the same file or hosted database. */
export function resetDatabase(today?: string): Db {
  const current = globalForDb.__myliquidDb;
  const file = current?.name ?? resolveDbTarget();
  if (isRemoteUrl(file)) {
    const db = current ?? connect(file);
    dropAllTables(db);
    initialise(db, { today });
    setDb(db);
    return db;
  }
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
