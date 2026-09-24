import { newId, nowIso, type Db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/auth/crypto";
import { logEvent } from "./audit";

/**
 * API keys let an investor connect their own AI agent over MCP. Keys are scoped
 * ("read" or "trade"), stored only as a hash, and shown once at creation.
 */

export type ApiScope = "read" | "trade";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export const MAX_ACTIVE_KEYS = 10;
const KEY_PREFIX = "mlk_";

function mapKey(r: Record<string, unknown>): ApiKey {
  return {
    id: r.id as string,
    name: r.name as string,
    prefix: r.prefix as string,
    scopes: JSON.parse(r.scopes as string) as ApiScope[],
    createdAt: r.created_at as string,
    lastUsedAt: (r.last_used_at as string | null) ?? null,
    revokedAt: (r.revoked_at as string | null) ?? null,
  };
}

export function listApiKeys(db: Db, investorId: string): ApiKey[] {
  const rows = db
    .prepare("SELECT * FROM api_keys WHERE investor_id = ? ORDER BY created_at DESC")
    .all(investorId) as Record<string, unknown>[];
  return rows.map(mapKey);
}

export function createApiKey(
  db: Db,
  investorId: string,
  name: string,
  scopes: ApiScope[],
): { key: string; apiKey: ApiKey } {
  const active = listApiKeys(db, investorId).filter((k) => !k.revokedAt).length;
  if (active >= MAX_ACTIVE_KEYS)
    throw new Error(`You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`);
  const cleanScopes = Array.from(new Set<ApiScope>(["read", ...scopes]));
  const key = `${KEY_PREFIX}${randomToken(24)}`;
  const id = newId("key");
  db.prepare(
    "INSERT INTO api_keys (id, investor_id, name, prefix, key_hash, scopes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    investorId,
    name.trim().slice(0, 60) || "My agent",
    key.slice(0, 12),
    sha256(key),
    JSON.stringify(cleanScopes),
    nowIso(),
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `API key "${name}" created (${cleanScopes.join(" + ")})`,
  });
  const apiKey = mapKey(
    db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as Record<string, unknown>,
  );
  return { key, apiKey };
}

export function revokeApiKey(db: Db, investorId: string, id: string): void {
  const result = db
    .prepare(
      "UPDATE api_keys SET revoked_at = ? WHERE id = ? AND investor_id = ? AND revoked_at IS NULL",
    )
    .run(nowIso(), id, investorId);
  if (result.changes > 0)
    logEvent(db, investorId, { agent: "user", kind: "system", title: "API key revoked" });
}

export interface ApiPrincipal {
  investorId: string;
  keyId: string;
  keyName: string;
  scopes: ApiScope[];
}

export function authenticateApiKey(db: Db, key: string | null | undefined): ApiPrincipal | null {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;
  const row = db
    .prepare(
      "SELECT k.* FROM api_keys k JOIN investors i ON i.id = k.investor_id WHERE k.key_hash = ? AND k.revoked_at IS NULL",
    )
    .get(sha256(key)) as Record<string, unknown> | undefined;
  if (!row) return null;
  db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(nowIso(), row.id);
  return {
    investorId: row.investor_id as string,
    keyId: row.id as string,
    keyName: row.name as string,
    scopes: JSON.parse(row.scopes as string) as ApiScope[],
  };
}
