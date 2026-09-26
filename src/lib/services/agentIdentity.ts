import { nowIso, type Db } from "@/lib/db";
import {
  PRESENTATION_WINDOW_SECS,
  REASON_TEXT,
  checkPassport,
  scopesForTier,
  scopesFromCapabilities,
  type PassportCheck,
} from "@/lib/ainra";
import type { VerdictEvent } from "@ainra/sdk";
import { raiseAlert } from "./alerts";
import type { ApiPrincipal, ApiScope } from "./apiKeys";
import { logEvent } from "./audit";

/**
 * Pins an API key to a connected agent's AINRA identity. The investor binds a key to the agent's permanent AINRA
 * Number (checked against a valid passport). From then on the agent must present a fresh, valid passport for that
 * same Number before the key works over MCP or x402, and a revoked passport cuts it off even though the key
 * itself is still valid. The key's scopes narrow to the passport's `myliquid:*` capabilities (when it declares any)
 * and to MyLiquid's tier floor (L0–L1 read, L2 trade, L3+ pay).
 */

/** Wall-clock unix seconds: presentation windows run on real time, whatever clock passports are verified at. */
export function wallNow(): number {
  return Math.floor(Date.now() / 1000);
}

export interface KeyIdentity {
  keyId: string;
  ainraNumber: string;
  ainraName: string;
  tier: string | null;
  capabilities: string[];
  requirePassport: boolean;
  /** Unix seconds until which the last valid presentation lets the key act. */
  verifiedUntil: number | null;
  lastVerdict: VerdictEvent | null;
  lastPresentedAt: string | null;
  boundAt: string;
}

function mapIdentity(r: Record<string, unknown>): KeyIdentity {
  return {
    keyId: r.key_id as string,
    ainraNumber: r.ainra_number as string,
    ainraName: r.ainra_name as string,
    tier: (r.tier as string | null) ?? null,
    capabilities: JSON.parse(r.capabilities as string) as string[],
    requirePassport: r.require_passport === 1,
    verifiedUntil: (r.verified_until as number | null) ?? null,
    lastVerdict: r.last_verdict ? (JSON.parse(r.last_verdict as string) as VerdictEvent) : null,
    lastPresentedAt: (r.last_presented_at as string | null) ?? null,
    boundAt: r.bound_at as string,
  };
}

export function getKeyIdentity(db: Db, investorId: string, keyId: string): KeyIdentity | null {
  const row = db
    .prepare("SELECT * FROM api_key_identities WHERE key_id = ? AND investor_id = ?")
    .get(keyId, investorId) as Record<string, unknown> | undefined;
  return row ? mapIdentity(row) : null;
}

export function listKeyIdentities(db: Db, investorId: string): KeyIdentity[] {
  return (
    db.prepare("SELECT * FROM api_key_identities WHERE investor_id = ?").all(investorId) as Record<
      string,
      unknown
    >[]
  ).map(mapIdentity);
}

function activeKey(db: Db, investorId: string, keyId: string): { name: string } {
  const key = db
    .prepare("SELECT name FROM api_keys WHERE id = ? AND investor_id = ? AND revoked_at IS NULL")
    .get(keyId, investorId) as { name: string } | undefined;
  if (!key) throw new Error("API key not found or revoked");
  return key;
}

/** The investor pins a key to the identity in a passport. Only a valid passport can be bound. */
export function bindKeyIdentity(
  db: Db,
  investorId: string,
  keyId: string,
  passport: unknown,
  opts: { now?: number } = {},
): { identity: KeyIdentity; check: PassportCheck } {
  const key = activeKey(db, investorId, keyId);
  const check = checkPassport(passport, opts);
  if (check.status !== "valid" || !check.number || !check.name) {
    throw new Error(
      `This passport can't be bound: ${REASON_TEXT[check.reason ?? ""] ?? check.reason ?? "invalid"}`,
    );
  }
  db.prepare(
    `INSERT INTO api_key_identities (key_id, investor_id, ainra_number, ainra_name, tier, capabilities, require_passport, verified_until, last_verdict, last_presented_at, bound_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, NULL, ?)
     ON CONFLICT(key_id) DO UPDATE SET ainra_number = excluded.ainra_number, ainra_name = excluded.ainra_name,
       tier = excluded.tier, capabilities = excluded.capabilities, require_passport = 1, verified_until = NULL,
       last_verdict = excluded.last_verdict, last_presented_at = NULL, bound_at = excluded.bound_at`,
  ).run(
    keyId,
    investorId,
    check.number,
    check.name,
    check.tier,
    JSON.stringify(check.capabilities),
    JSON.stringify(check.event),
    nowIso(),
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `API key "${key.name}" pinned to AINRA identity ${check.number} (${check.tier ?? "no tier"})`,
  });
  return { identity: getKeyIdentity(db, investorId, keyId)!, check };
}

export function setRequirePassport(
  db: Db,
  investorId: string,
  keyId: string,
  require: boolean,
): KeyIdentity {
  const result = db
    .prepare(
      "UPDATE api_key_identities SET require_passport = ? WHERE key_id = ? AND investor_id = ?",
    )
    .run(require ? 1 : 0, keyId, investorId);
  if (result.changes === 0) throw new Error("This key has no AINRA identity bound");
  return getKeyIdentity(db, investorId, keyId)!;
}

export function unbindKeyIdentity(db: Db, investorId: string, keyId: string): void {
  const result = db
    .prepare("DELETE FROM api_key_identities WHERE key_id = ? AND investor_id = ?")
    .run(keyId, investorId);
  if (result.changes > 0)
    logEvent(db, investorId, {
      agent: "user",
      kind: "system",
      title: "API key unpinned from its AINRA identity",
    });
}

export interface PresentResult {
  ok: boolean;
  reason: string | null;
  check: PassportCheck;
  verifiedUntil: number | null;
}

/**
 * The connected agent presents its passport with its API key. A valid passport for the pinned AINRA Number opens
 * a short window (5 minutes, AINRA's F2 freshness) in which the key may act. Anything else closes it at once.
 */
export function presentPassport(
  db: Db,
  principal: ApiPrincipal,
  passport: unknown,
  opts: { now?: number; wallNow?: number } = {},
): PresentResult {
  const identity = getKeyIdentity(db, principal.investorId, principal.keyId);
  const check = checkPassport(passport, { now: opts.now });
  if (!identity) {
    return {
      ok: false,
      reason: "not_bound",
      check,
      verifiedUntil: null,
    };
  }
  const nowSecs = opts.wallNow ?? wallNow();
  let reason: string | null = check.status === "valid" ? null : (check.reason ?? "invalid");
  if (!reason && check.number !== identity.ainraNumber) reason = "identity_mismatch";
  const ok = reason === null;
  const verifiedUntil = ok ? nowSecs + PRESENTATION_WINDOW_SECS : null;
  db.prepare(
    `UPDATE api_key_identities SET verified_until = ?, last_verdict = ?, last_presented_at = ?,
       ainra_name = COALESCE(?, ainra_name), tier = COALESCE(?, tier), capabilities = CASE WHEN ? THEN ? ELSE capabilities END
     WHERE key_id = ? AND investor_id = ?`,
  ).run(
    verifiedUntil,
    JSON.stringify(check.event),
    nowIso(),
    ok ? check.name : null,
    ok ? check.tier : null,
    ok ? 1 : 0,
    JSON.stringify(check.capabilities),
    principal.keyId,
    principal.investorId,
  );
  logEvent(db, principal.investorId, {
    agent: "external",
    kind: "system",
    title: ok
      ? `${principal.keyName}: presented a valid AINRA passport (${identity.ainraNumber}, ${check.tier ?? "no tier"})`
      : `${principal.keyName}: AINRA passport refused (${reason})`,
    payload: { keyId: principal.keyId, event: check.event },
  });
  if (!ok) {
    const revoked = reason === "revoked";
    raiseAlert(db, principal.investorId, {
      agent: "sentinel",
      severity: revoked ? "critical" : "warn",
      code: revoked ? "agent_passport_revoked" : "agent_passport_refused",
      title: revoked
        ? `The agent behind "${principal.keyName}" has a revoked AINRA passport`
        : `"${principal.keyName}" presented a passport MyLiquid refused`,
      detail: `${
        reason === "identity_mismatch"
          ? `The passport belongs to ${check.number ?? "another agent"}, not the pinned ${identity.ainraNumber}.`
          : (REASON_TEXT[reason!] ?? reason)
      } Until it presents a valid passport, MyLiquid refuses every request made with this key.`,
    });
  }
  return { ok, reason, check, verifiedUntil };
}

export type GateResult =
  | { allow: true; principal: ApiPrincipal & { ainraNumber: string | null } }
  | { allow: false; message: string };

/** The gate in front of MCP and x402: pinned keys need a live presentation; scopes narrow to the passport's. */
export function identityGate(db: Db, principal: ApiPrincipal, now = wallNow()): GateResult {
  const identity = getKeyIdentity(db, principal.investorId, principal.keyId);
  if (!identity) return { allow: true, principal: { ...principal, ainraNumber: null } };
  if (identity.requirePassport && !(identity.verifiedUntil && identity.verifiedUntil > now)) {
    return {
      allow: false,
      message: `This key is pinned to the AINRA identity ${identity.ainraNumber} and needs a fresh passport. POST it as {"ainra_passport": …} to /api/agent-identity with this key; a valid presentation is good for ${PRESENTATION_WINDOW_SECS / 60} minutes.`,
    };
  }
  // Least privilege from three sides: the key's scopes, the passport's myliquid:* capabilities (if it declares
  // any), and MyLiquid's tier floor for the agent's AINRA tier.
  const granted = scopesFromCapabilities(identity.capabilities);
  const byTier = scopesForTier(identity.tier);
  const scopes: ApiScope[] = principal.scopes.filter(
    (s) => byTier.includes(s) && (!granted || granted.includes(s)),
  );
  return {
    allow: true,
    principal: { ...principal, scopes, ainraNumber: identity.ainraNumber },
  };
}
