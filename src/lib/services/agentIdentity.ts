import { nowIso, simDate, type Db } from "@/lib/db";
import {
  PRESENTATION_WINDOW_SECS,
  REASON_TEXT,
  checkPassport,
  scopesForTier,
  scopesFromCapabilities,
  type PassportCheck,
} from "@/lib/ainra";
import type { VerdictEvent } from "@ainra/sdk";
import {
  declaresTrading,
  tierAutoCeilingCents,
  tradingLimitsError,
  type OutsideTrader,
  type TradeMode,
} from "@/lib/domain/agentTrading";
import { formatUsd } from "@/lib/domain/money";
import { raiseAlert } from "./alerts";
import { listApiKeys, type ApiPrincipal, type ApiScope } from "./apiKeys";
import { logEvent } from "./audit";

/**
 * Pins an API key to a connected agent's AINRA identity. The investor binds a key to the agent's permanent AINRA
 * Number (checked against a valid passport). From then on the agent must present a fresh, valid passport for that
 * same Number before the key works over MCP or x402, and a revoked passport cuts it off even though the key
 * itself is still valid. The key's scopes narrow to the passport's `myliquid:*` capabilities (when it declares any)
 * and to MyLiquid's tier floor (L0–L1 read, L2 trade, L3+ pay).
 *
 * The identity also decides autonomy: while its presentation is fresh, an identified trader the investor allowed
 * to trade on its own may execute within its limits (see `lib/domain/agentTrading.ts`). If its registrar revokes
 * it, its pending proposals are withdrawn.
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
  tradeMode: TradeMode;
  perTradeLimitCents: number;
  dailyLimitCents: number;
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
    tradeMode: r.trade_mode === "auto" ? "auto" : "propose",
    perTradeLimitCents: (r.per_trade_limit_cents as number) ?? 0,
    dailyLimitCents: (r.daily_limit_cents as number) ?? 0,
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

/** The investor decides whether an identified agent may trade on its own, and within what limits. */
export function setTradingLimits(
  db: Db,
  investorId: string,
  keyId: string,
  limits: { mode: TradeMode; perTradeLimitCents: number; dailyLimitCents: number },
): KeyIdentity {
  const error = tradingLimitsError(limits.mode, limits.perTradeLimitCents, limits.dailyLimitCents);
  if (error) throw new Error(error);
  const auto = limits.mode === "auto";
  const result = db
    .prepare(
      `UPDATE api_key_identities SET trade_mode = ?, per_trade_limit_cents = ?, daily_limit_cents = ?
       WHERE key_id = ? AND investor_id = ?`,
    )
    .run(
      limits.mode,
      auto ? Math.round(limits.perTradeLimitCents) : 0,
      auto ? Math.round(limits.dailyLimitCents) : 0,
      keyId,
      investorId,
    );
  if (result.changes === 0) throw new Error("This key has no AINRA identity bound");
  const identity = getKeyIdentity(db, investorId, keyId)!;
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: auto
      ? `${identity.ainraNumber} may trade on its own: up to ${formatUsd(limits.perTradeLimitCents)} a trade, ${formatUsd(limits.dailyLimitCents)} a day`
      : `${identity.ainraNumber} set to propose only`,
  });
  return identity;
}

/** What an outside agent has traded on its own today (market day), for its daily limit. */
export function autonomousVolumeToday(db: Db, investorId: string, keyId: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM orders
       WHERE investor_id = ? AND agent_key_id = ? AND autonomous = 1 AND created_on = ? AND status != 'rejected'`,
    )
    .get(investorId, keyId, simDate(db)) as { total: number };
  return row.total;
}

/** Withdraws an outside agent's pending proposals (its registrar revoked it). Returns how many. */
function withdrawPendingProposals(db: Db, investorId: string, keyId: string, why: string): number {
  return db
    .prepare(
      `UPDATE proposals SET status = 'withdrawn', decided_at = ?, result = ?
       WHERE investor_id = ? AND agent_key_id = ? AND status = 'pending'`,
    )
    .run(nowIso(), JSON.stringify({ orderIds: [], messages: [why] }), investorId, keyId).changes;
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
    const withdrawn = revoked
      ? withdrawPendingProposals(
          db,
          principal.investorId,
          principal.keyId,
          "Withdrawn: the agent's AINRA passport was revoked by its registrar.",
        )
      : 0;
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
      } Until it presents a valid passport, MyLiquid refuses every request made with this key.${
        withdrawn > 0
          ? ` Its ${withdrawn} pending proposal${withdrawn === 1 ? " was" : "s were"} withdrawn.`
          : ""
      }`,
    });
  }
  return { ok, reason, check, verifiedUntil };
}

/**
 * Least privilege from three sides: the key's scopes, the passport's myliquid:* capabilities (if it declares any),
 * and MyLiquid's tier floor for the agent's AINRA tier.
 */
export function effectiveScopes(keyScopes: ApiScope[], identity: KeyIdentity | null): ApiScope[] {
  if (!identity) return keyScopes;
  const granted = scopesFromCapabilities(identity.capabilities);
  const byTier = scopesForTier(identity.tier);
  return keyScopes.filter((s) => byTier.includes(s) && (!granted || granted.includes(s)));
}

/** One connected agent as the investor sees it on the Connect page. */
export interface Connection {
  keyId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  keyScopes: ApiScope[];
  /** What it can actually do: the key's scopes narrowed by its AINRA tier and capabilities. */
  scopes: ApiScope[];
  identity: KeyIdentity | null;
  /** A valid passport presentation is fresh right now. */
  identified: boolean;
  tierCeilingCents: number;
  effectivePerTradeLimitCents: number;
  usedTodayCents: number;
  /** Why it can't trade on its own whatever its setting, or null when it can. */
  autonomyBlockedBy: string | null;
}

export function listConnections(db: Db, investorId: string, now = wallNow()): Connection[] {
  return listApiKeys(db, investorId)
    .filter((k) => !k.revokedAt)
    .map((k) => {
      const identity = getKeyIdentity(db, investorId, k.id);
      const scopes = effectiveScopes(k.scopes, identity);
      const ceiling = tierAutoCeilingCents(identity?.tier ?? null);
      const autonomyBlockedBy = !identity
        ? "Not identified with AINRA, so it only proposes."
        : !scopes.includes("trade")
          ? identity.tier && ceiling === 0
            ? `AINRA tier ${identity.tier} only reads.`
            : "It has no trading scope."
          : ceiling === 0
            ? `AINRA tier ${identity.tier ?? "(none)"} can't trade on its own.`
            : !declaresTrading(identity.capabilities)
              ? "Its passport doesn't declare myliquid:trade."
              : null;
      return {
        keyId: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        keyScopes: k.scopes,
        scopes,
        identity,
        identified: !!(identity?.verifiedUntil && identity.verifiedUntil > now),
        tierCeilingCents: ceiling,
        effectivePerTradeLimitCents: identity ? Math.min(identity.perTradeLimitCents, ceiling) : 0,
        usedTodayCents: autonomousVolumeToday(db, investorId, k.id),
        autonomyBlockedBy,
      };
    });
}

export type GatedPrincipal = ApiPrincipal & { ainraNumber: string | null; trader: OutsideTrader };

export type GateResult = { allow: true; principal: GatedPrincipal } | { allow: false; message: string };

/** The gate in front of MCP and x402: pinned keys need a live presentation; scopes narrow to the passport's. */
export function identityGate(db: Db, principal: ApiPrincipal, now = wallNow()): GateResult {
  const identity = getKeyIdentity(db, principal.investorId, principal.keyId);
  if (!identity) {
    const trader: OutsideTrader = {
      keyId: principal.keyId,
      keyName: principal.keyName,
      ainraNumber: null,
      ainraName: null,
      tier: null,
      capabilities: [],
      identified: false,
      mode: "propose",
      perTradeLimitCents: 0,
      dailyLimitCents: 0,
    };
    return { allow: true, principal: { ...principal, ainraNumber: null, trader } };
  }
  const fresh = !!(identity.verifiedUntil && identity.verifiedUntil > now);
  if (identity.requirePassport && !fresh) {
    return {
      allow: false,
      message: `This key is pinned to the AINRA identity ${identity.ainraNumber} and needs a fresh passport. POST it as {"ainra_passport": …} to /api/agent-identity with this key; a valid presentation is good for ${PRESENTATION_WINDOW_SECS / 60} minutes.`,
    };
  }
  const scopes = effectiveScopes(principal.scopes, identity);
  const trader: OutsideTrader = {
    keyId: principal.keyId,
    keyName: principal.keyName,
    ainraNumber: identity.ainraNumber,
    ainraName: identity.ainraName,
    tier: identity.tier,
    capabilities: identity.capabilities,
    identified: fresh,
    mode: identity.tradeMode,
    perTradeLimitCents: identity.perTradeLimitCents,
    dailyLimitCents: identity.dailyLimitCents,
  };
  return {
    allow: true,
    principal: { ...principal, scopes, ainraNumber: identity.ainraNumber, trader },
  };
}
