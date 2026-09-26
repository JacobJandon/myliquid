import Libsql from "libsql";
import type { Db } from "./index";

/**
 * A hosted libSQL database (Turso) behind the same synchronous, better-sqlite3
 * API the app uses for a local file. Serverless hosts such as Vercel have no
 * persistent disk, so they keep the database here.
 *
 * The `libsql` client aims at better-sqlite3 compatibility, but over a network
 * connection it differs in ways this wrapper evens out:
 * - named parameters (`@name`) are not bound, so they are rewritten to positional ones;
 * - a single `null` parameter is misread, and a boolean crashes the process;
 * - rows carry a `_metadata` field;
 * - the server upper-cases bare column names that are SQL keywords (`key`, `action`, `trigger`);
 * - numbers are sent as floats, so whole numbers are bound as integers;
 * - transactions don't nest, so inner ones become savepoints, as in better-sqlite3;
 * - a statement prepared outside a transaction runs outside it even after BEGIN, so
 *   each statement is prepared once for autocommit use and again in each transaction;
 * - every `prepare` is a round trip, so statements are cached by their SQL;
 * - an idle connection expires after a few seconds, so a stale one is replaced.
 */

type Param = string | number | bigint | Buffer | null;
type Row = Record<string, unknown>;

interface LibsqlStatement {
  run(params: Param[]): { changes: number; lastInsertRowid: number | bigint };
  get(params: Param[]): Row | undefined;
  all(params: Param[]): Row[];
}

interface LibsqlDatabase {
  prepare(sql: string): LibsqlStatement;
  exec(sql: string): void;
  close(): void;
  open: boolean;
}

const LibsqlDatabase = Libsql as unknown as new (
  url: string,
  opts: { authToken?: string },
) => LibsqlDatabase;

/** True for a libSQL/Turso URL rather than a file path. */
export function isRemoteUrl(target: string): boolean {
  return /^(libsql|https?|wss?):\/\//i.test(target);
}

/**
 * Rewrites `@name`, `:name` and `$name` parameters to `?` and returns the names in
 * order, skipping quoted strings, quoted identifiers and comments.
 */
export function toPositional(sql: string): { sql: string; names: string[] | null } {
  if (!/[@:$][A-Za-z_]/.test(sql)) return { sql, names: null };
  const names: string[] = [];
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) {
          if (sql[j + 1] === c) j += 2;
          else break;
        } else j++;
      }
      out += sql.slice(i, j + 1);
      i = j;
    } else if (c === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const j = end === -1 ? sql.length : end;
      out += sql.slice(i, j);
      i = j - 1;
    } else if ((c === "@" || c === ":" || c === "$") && /[A-Za-z_]/.test(sql[i + 1] ?? "")) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j] ?? "")) j++;
      names.push(sql.slice(i + 1, j));
      out += "?";
      i = j - 1;
    } else {
      out += c;
    }
  }
  return { sql: out, names: names.length > 0 ? names : null };
}

function bindValue(value: unknown): Param {
  if (value === undefined) return null;
  if (typeof value === "number") return Number.isSafeInteger(value) ? BigInt(value) : value;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "bigint" ||
    Buffer.isBuffer(value)
  )
    return value;
  throw new TypeError("SQLite3 can only bind numbers, strings, bigints, buffers, and null");
}

function isNamedParams(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) && !Buffer.isBuffer(value)
  );
}

/** Drops the client's `_metadata` and restores lower-case keyword column names. */
function cleanRow(row: Row | undefined): Row | undefined {
  if (!row) return row;
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "_metadata") continue;
    out[/^[A-Z][A-Z0-9_]*$/.test(key) ? key.toLowerCase() : key] = value;
  }
  return out;
}

interface Prepared {
  stmt: LibsqlStatement;
  generation: number;
  mode: string;
}

class RemoteStatement {
  private auto: Prepared | null = null;
  private inTx: Prepared | null = null;

  constructor(
    private readonly db: RemoteDatabase,
    private readonly sql: string,
    private readonly names: string[] | null,
    readonly source: string,
  ) {}

  private bind(params: unknown[]): Param[] {
    if (this.names && params.length === 1 && isNamedParams(params[0])) {
      const values = params[0];
      return this.names.map((name) => {
        if (!(name in values)) throw new RangeError(`Missing named parameter "${name}"`);
        return bindValue(values[name]);
      });
    }
    return params.flat().map(bindValue);
  }

  /** Runs `op` on this statement, prepared on the current connection in the current mode. */
  private execute<T>(op: (stmt: LibsqlStatement) => T): T {
    return this.db.withConnection((conn, generation) => {
      const mode = this.db.mode;
      let prepared = mode === "auto" ? this.auto : this.inTx;
      if (!prepared || prepared.generation !== generation || prepared.mode !== mode) {
        prepared = { stmt: conn.prepare(this.sql), generation, mode };
        if (mode === "auto") this.auto = prepared;
        else this.inTx = prepared;
      }
      return op(prepared.stmt);
    });
  }

  run(...params: unknown[]) {
    const values = this.bind(params);
    return this.execute((stmt) => stmt.run(values));
  }

  get(...params: unknown[]) {
    const values = this.bind(params);
    return cleanRow(this.execute((stmt) => stmt.get(values)));
  }

  all(...params: unknown[]) {
    const values = this.bind(params);
    return this.execute((stmt) => stmt.all(values)).map((row) => cleanRow(row)!);
  }
}

const STATEMENT_CACHE_LIMIT = 1000;

/** Blocks the thread briefly (the API is synchronous, like better-sqlite3's). */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The server refused the connection's stream before running anything (it
 * restarted, or the stream expired), so reconnecting and retrying is safe.
 */
function isStaleConnection(err: unknown): boolean {
  return /baton|stream (?:not found|expired|closed)|stream has expired/i.test(String(err));
}

class RemoteDatabase {
  readonly name: string;
  readonly memory = false;
  readonly readonly = false;
  private conn: LibsqlDatabase;
  private generation = 0;
  private readonly statements = new Map<string, RemoteStatement>();
  private depth = 0;
  private transactions = 0;

  constructor(
    private readonly url: string,
    private readonly authToken: string | undefined,
  ) {
    this.conn = new LibsqlDatabase(url, { authToken });
    this.name = url.replace(/\?.*$/, "");
  }

  get open(): boolean {
    return this.conn.open;
  }

  get inTransaction(): boolean {
    return this.depth > 0;
  }

  /** "auto" outside a transaction, otherwise the current transaction's id. */
  get mode(): string {
    return this.depth > 0 ? `tx${this.transactions}` : "auto";
  }

  /**
   * Runs `fn` on the connection. Outside a transaction a stale connection is
   * replaced and `fn` retried once; inside one the error stands, since the
   * transaction is gone.
   */
  withConnection<T>(fn: (conn: LibsqlDatabase, generation: number) => T): T {
    try {
      return fn(this.conn, this.generation);
    } catch (err) {
      if (this.depth > 0 || !isStaleConnection(err)) throw err;
      try {
        this.conn.close();
      } catch {
        // Already unusable.
      }
      this.conn = new LibsqlDatabase(this.url, { authToken: this.authToken });
      this.generation++;
      return fn(this.conn, this.generation);
    }
  }

  prepare(sql: string): RemoteStatement {
    let stmt = this.statements.get(sql);
    if (!stmt) {
      const rewritten = toPositional(sql);
      stmt = new RemoteStatement(this, rewritten.sql, rewritten.names, sql);
      if (this.statements.size >= STATEMENT_CACHE_LIMIT) this.statements.clear();
      this.statements.set(sql, stmt);
    }
    return stmt;
  }

  exec(sql: string): this {
    // Cached statements may describe tables this changes.
    if (/\b(CREATE|DROP|ALTER)\b/i.test(sql)) this.statements.clear();
    this.withConnection((conn) => conn.exec(sql));
    return this;
  }

  pragma(source: string, options: { simple?: boolean } = {}): unknown {
    // The server manages its own journal.
    if (/^\s*journal_mode\b/i.test(source)) return options.simple ? "wal" : [];
    const rows = this.prepare(`PRAGMA ${source}`).all();
    return options.simple ? Object.values(rows[0] ?? {})[0] : rows;
  }

  /** Starts the outermost transaction, waiting briefly if another server holds the write lock. */
  private begin(): void {
    for (let attempt = 0; ; attempt++) {
      try {
        this.withConnection((conn) => conn.exec("BEGIN IMMEDIATE"));
        return;
      } catch (err) {
        if (attempt >= 20 || !/locked|busy/i.test(String(err))) throw err;
        pause(50 * (attempt + 1));
      }
    }
  }

  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    const run = (...args: A): R => {
      const outer = this.depth === 0;
      const savepoint = `ml_sp_${this.depth}`;
      const rollback = () => {
        try {
          this.conn.exec(outer ? "ROLLBACK" : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
        } catch {
          // The server may already have rolled back; the original error matters.
        }
      };
      if (outer) {
        this.begin();
        this.transactions++;
      } else this.conn.exec(`SAVEPOINT ${savepoint}`);
      this.depth++;
      let result: R;
      try {
        result = fn(...args);
      } catch (err) {
        this.depth--;
        rollback();
        throw err;
      }
      this.depth--;
      try {
        this.conn.exec(outer ? "COMMIT" : `RELEASE ${savepoint}`);
      } catch (err) {
        rollback();
        throw err;
      }
      return result;
    };
    return Object.assign(run, { deferred: run, immediate: run, exclusive: run });
  }

  close(): this {
    this.statements.clear();
    this.conn.close();
    return this;
  }
}

/** Opens a hosted libSQL database with the better-sqlite3 API the app expects. */
export function openRemoteDatabase(url: string, authToken?: string): Db {
  return new RemoteDatabase(url, authToken) as unknown as Db;
}
