import { newId, nowIso, type Db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/auth/crypto";
import { REASON_TEXT, checkPassport, type PassportCheck } from "@/lib/ainra";
import { tradingLimitsError, type TradeMode } from "@/lib/domain/agentTrading";
import { raiseAlert } from "./alerts";
import { createApiKey, type ApiKey, type ApiScope } from "./apiKeys";
import {
  bindKeyIdentity,
  getKeyIdentity,
  identityGate,
  presentPassport,
  setTradingLimits,
  wallNow,
  type KeyIdentity,
} from "./agentIdentity";
import { logEvent } from "./audit";

/**
 * Connecting an outside agent, identity first. The investor creates a one-time invite that says what the agent
 * may do. The agent redeems it with its AINRA passport: MyLiquid verifies the passport and hands back an API key
 * already pinned to the agent's AINRA Number, with the investor's trading limits and a fresh presentation window.
 * The investor never copies keys or passports around, and the agent is identified from its first request.
 */

export const INVITE_TTL_SECS = 15 * 60;
export const MAX_OPEN_INVITES = 10;
const INVITE_PREFIX = "mli_";

export interface AgentInvite {
  id: string;
  label: string;
  scopes: ApiScope[];
  tradeMode: TradeMode;
  perTradeLimitCents: number;
  dailyLimitCents: number;
  createdAt: string;
  expiresAt: number;
  usedAt: string | null;
  keyId: string | null;
  status: "open" | "used" | "expired";
}

function mapInvite(r: Record<string, unknown>, now: number): AgentInvite {
  const usedAt = (r.used_at as string | null) ?? null;
  const expiresAt = r.expires_at as number;
  return {
    id: r.id as string,
    label: r.label as string,
    scopes: JSON.parse(r.scopes as string) as ApiScope[],
    tradeMode: r.trade_mode === "auto" ? "auto" : "propose",
    perTradeLimitCents: r.per_trade_limit_cents as number,
    dailyLimitCents: r.daily_limit_cents as number,
    createdAt: r.created_at as string,
    expiresAt,
    usedAt,
    keyId: (r.key_id as string | null) ?? null,
    status: usedAt ? "used" : expiresAt <= now ? "expired" : "open",
  };
}

export function listInvites(db: Db, investorId: string, now = wallNow()): AgentInvite[] {
  return (
    db
      .prepare("SELECT * FROM agent_invites WHERE investor_id = ? ORDER BY created_at DESC LIMIT 20")
      .all(investorId) as Record<string, unknown>[]
  ).map((r) => mapInvite(r, now));
}

export interface NewInvite {
  label: string;
  allowTrade: boolean;
  allowPay: boolean;
  tradeMode: TradeMode;
  perTradeLimitCents: number;
  dailyLimitCents: number;
}

/** Creates a one-time invite. The code is shown once and stored only as a hash. */
export function createInvite(
  db: Db,
  investorId: string,
  input: NewInvite,
  now = wallNow(),
): { code: string; invite: AgentInvite } {
  const mode: TradeMode = input.allowTrade ? input.tradeMode : "propose";
  const error = tradingLimitsError(mode, input.perTradeLimitCents, input.dailyLimitCents);
  if (error) throw new Error(error);
  const open = listInvites(db, investorId, now).filter((i) => i.status === "open").length;
  if (open >= MAX_OPEN_INVITES)
    throw new Error(`You can have at most ${MAX_OPEN_INVITES} open invites. Cancel one first.`);
  const scopes: ApiScope[] = [
    "read",
    ...(input.allowTrade ? (["trade"] as const) : []),
    ...(input.allowPay ? (["pay"] as const) : []),
  ];
  const code = `${INVITE_PREFIX}${randomToken(24)}`;
  const id = newId("inv");
  const auto = mode === "auto";
  db.prepare(
    `INSERT INTO agent_invites (id, investor_id, code_hash, label, scopes, trade_mode, per_trade_limit_cents,
       daily_limit_cents, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    investorId,
    sha256(code),
    input.label.trim().slice(0, 60) || "Agent trader",
    JSON.stringify(scopes),
    mode,
    auto ? Math.round(input.perTradeLimitCents) : 0,
    auto ? Math.round(input.dailyLimitCents) : 0,
    nowIso(),
    now + INVITE_TTL_SECS,
  );
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `Invite created for an AINRA-identified agent (${scopes.join(" + ")}, ${auto ? "trades on its own within limits" : "proposes only"})`,
  });
  const row = db.prepare("SELECT * FROM agent_invites WHERE id = ?").get(id) as Record<
    string,
    unknown
  >;
  return { code, invite: mapInvite(row, now) };
}

export function cancelInvite(db: Db, investorId: string, id: string): void {
  db.prepare(
    "DELETE FROM agent_invites WHERE id = ? AND investor_id = ? AND used_at IS NULL",
  ).run(id, investorId);
}

/** Why an enrollment failed, with the HTTP status the route should answer with. */
export class EnrollError extends Error {
  constructor(
    public status: number,
    message: string,
    public reason: string | null = null,
    public check: PassportCheck | null = null,
  ) {
    super(message);
  }
}

export interface EnrollResult {
  key: string;
  apiKey: ApiKey;
  identity: KeyIdentity;
  /** The scopes the key actually has: the invite's, narrowed by the agent's tier and capabilities. */
  scopes: ApiScope[];
  check: PassportCheck;
  verifiedUntil: number | null;
}

/**
 * An outside agent redeems an invite with its AINRA passport. The passport must verify (fail closed). The invite
 * is spent only when the enrollment succeeds, so a refused agent can't burn it for someone else.
 */
export function enrollAgent(
  db: Db,
  code: string,
  passport: unknown,
  opts: { name?: string; now?: number; wallNow?: number } = {},
): EnrollResult {
  const wall = opts.wallNow ?? wallNow();
  const row = db
    .prepare("SELECT * FROM agent_invites WHERE code_hash = ?")
    .get(sha256(code.trim())) as Record<string, unknown> | undefined;
  const invite = row ? mapInvite(row, wall) : null;
  if (!row || !invite || invite.status !== "open")
    throw new EnrollError(
      410,
      invite?.status === "used"
        ? "This invite has already been used."
        : "This invite is unknown or has expired. Ask the investor for a new one.",
    );
  const investorId = row.investor_id as string;

  const check = checkPassport(passport, { now: opts.now });
  if (check.status !== "valid" || !check.number || !check.name) {
    const revoked = check.reason === "revoked";
    logEvent(db, investorId, {
      agent: "external",
      kind: "system",
      title: `An agent tried to connect with invite "${invite.label}" and was refused: ${check.reason ?? "invalid"}${check.number ? ` (${check.number})` : ""}`,
      payload: { event: check.event },
    });
    if (revoked)
      raiseAlert(db, investorId, {
        agent: "sentinel",
        severity: "warn",
        code: "agent_enroll_revoked",
        title: `A revoked agent tried to connect: ${check.number ?? "unknown"}`,
        detail: `${REASON_TEXT.revoked} MyLiquid refused it; your invite "${invite.label}" is still open.`,
      });
    throw new EnrollError(
      403,
      REASON_TEXT[check.reason ?? ""] ?? "The AINRA passport did not verify.",
      check.reason,
      check,
    );
  }

  const agentName = opts.name?.trim() || check.name.replace(/^ainra:[^:]+:/, "").replace(/@.*$/, "");
  const result = db.transaction(() => {
    // Spend the invite first, so two agents racing with the same code can't both enroll.
    const spent = db
      .prepare("UPDATE agent_invites SET used_at = ? WHERE id = ? AND used_at IS NULL")
      .run(nowIso(), invite.id);
    if (spent.changes !== 1) throw new EnrollError(410, "This invite has already been used.");
    const { key, apiKey } = createApiKey(db, investorId, agentName, invite.scopes);
    db.prepare("UPDATE agent_invites SET key_id = ? WHERE id = ?").run(apiKey.id, invite.id);
    bindKeyIdentity(db, investorId, apiKey.id, passport, { now: opts.now });
    if (invite.tradeMode === "auto")
      setTradingLimits(db, investorId, apiKey.id, {
        mode: "auto",
        perTradeLimitCents: invite.perTradeLimitCents,
        dailyLimitCents: invite.dailyLimitCents,
      });
    return { key, apiKey };
  })();

  const principal = {
    investorId,
    keyId: result.apiKey.id,
    keyName: result.apiKey.name,
    scopes: result.apiKey.scopes,
  };
  const presented = presentPassport(db, principal, passport, { now: opts.now, wallNow: wall });
  const gate = identityGate(db, principal, wall);
  const identity = getKeyIdentity(db, investorId, result.apiKey.id)!;
  logEvent(db, investorId, {
    agent: "external",
    kind: "system",
    title: `${check.name} connected with invite "${invite.label}" (${check.tier ?? "no tier"}, ${gate.allow ? gate.principal.scopes.join(" + ") : "blocked"})`,
    payload: { keyId: result.apiKey.id, ainraNumber: check.number },
  });
  return {
    key: result.key,
    apiKey: result.apiKey,
    identity,
    scopes: gate.allow ? gate.principal.scopes : [],
    check,
    verifiedUntil: presented.verifiedUntil,
  };
}
