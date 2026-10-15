import { createHash } from "node:crypto";
import { MAX_DAILY_LIMIT_CENTS, tierAutoCeilingCents } from "@/lib/domain/agentTrading";
import { formatUsd } from "@/lib/domain/money";

/**
 * MyLiquid Gate: the runtime check a firm puts in front of its own customers' AI agents (docs/startup/plan.md, P1).
 * Given what an agent wants to do, who it is, and the firm's policy, it decides: allow it, send it to a person for
 * review, or block it, with every check spelled out and a fingerprint of the decision for the audit log.
 *
 * The same rules MyLiquid runs on for outside traders (`autonomyDecision`), generalised to any firm:
 * - only an agent identified with a valid AINRA passport may act on its own, never above its tier's ceiling,
 *   and only for what its passport declares;
 * - the firm's limits, allow and block lists, rate limit and kill switch apply on top;
 * - anything that isn't plainly fine goes to review rather than through (fail closed).
 * Pure: no database, no clock (the caller passes `now`), no network.
 */

export type GateActionKind = "trade" | "payment";
export type GateOutcome = "allow" | "review" | "block";
export type GateCheckStatus = "pass" | "review" | "block";

export interface GateAction {
  kind: GateActionKind;
  /** Integer cents. */
  amountCents: number;
  /** Trades: buy or sell, and the instrument (ticker or product id). */
  side?: "buy" | "sell";
  instrument?: string;
  /** Payments: who is paid and the merchant category. */
  merchant?: string;
  category?: string;
}

/** Who the agent is, as far as Gate verified it. Self-asserted claims never count. */
export interface GateIdentity {
  verified: boolean;
  /** The AINRA Number, when verified. */
  number: string | null;
  name: string | null;
  tier: string | null;
  capabilities: string[];
  /** Why it isn't verified (an AINRA reason such as `revoked`, or `none` when no passport was presented). */
  reason: string | null;
}

export interface GatePolicy {
  /** "auto": identified agents may act on their own within limits. "propose": everything goes to review. */
  mode: "auto" | "propose";
  perActionLimitCents: number;
  dailyLimitCents: number;
  /** Actions per hour before the rest go to review. */
  maxActionsPerHour?: number;
  /** Trades: only these instruments (empty or missing: any). */
  allowedInstruments?: string[];
  /** Payments: never these merchant categories. */
  blockedCategories?: string[];
  /** Stops every agent at once. */
  killSwitch?: boolean;
}

export interface GateUsage {
  /** What this agent already did today on its own (cents). */
  usedTodayCents?: number;
  actionsLastHour?: number;
}

export interface GateRequest {
  action: GateAction;
  agent: { id: string; identity: GateIdentity };
  policy: GatePolicy;
  usage?: GateUsage;
}

export interface GateCheck {
  id: string;
  label: string;
  status: GateCheckStatus;
  detail: string;
}

export interface GateDecision {
  decision: GateOutcome;
  /** One sentence: the decision and its main reason. */
  summary: string;
  checks: GateCheck[];
  evidence: {
    decidedAt: string;
    /** SHA-256 of the request, canonicalised. */
    requestHash: string;
    /** SHA-256 over the request hash, the decision and every check: changes if any of them is altered. */
    decisionHash: string;
  };
}

/** The most one action may be, whatever the policy says. */
export const GATE_MAX_ACTION_CENTS = 10_000_000_00;

/** The capability an agent's passport must declare for each kind of action. */
export const REQUIRED_CAPABILITY: Record<GateActionKind, string> = {
  trade: "myliquid:trade",
  payment: "myliquid:pay",
};

export function declares(capabilities: string[], kind: GateActionKind): boolean {
  return capabilities.includes(REQUIRED_CAPABILITY[kind]) || capabilities.includes("myliquid:*");
}

const RANK: Record<GateCheckStatus, number> = { pass: 0, review: 1, block: 2 };

export function decide(req: GateRequest, opts: { now: Date }): GateDecision {
  const { action, agent, policy } = req;
  const { identity } = agent;
  const usage = req.usage ?? {};
  const checks: GateCheck[] = [];
  const add = (id: string, label: string, status: GateCheckStatus, detail: string) =>
    checks.push({ id, label, status, detail });
  const amount = action.amountCents;
  const usd = (c: number) => formatUsd(c);

  // 1. Hard stops.
  add(
    "kill_switch",
    "Kill switch",
    policy.killSwitch ? "block" : "pass",
    policy.killSwitch ? "The kill switch is on: every agent is stopped." : "Off.",
  );
  const validAmount = Number.isInteger(amount) && amount > 0 && amount <= GATE_MAX_ACTION_CENTS;
  add(
    "amount",
    "Amount",
    validAmount ? "pass" : "block",
    validAmount
      ? `${usd(amount)}.`
      : `The amount must be a whole number of cents between 1 and ${GATE_MAX_ACTION_CENTS}.`,
  );
  if (action.kind === "trade") {
    const allowed = (policy.allowedInstruments ?? []).map((i) => i.toUpperCase());
    const instrument = (action.instrument ?? "").toUpperCase();
    const ok = allowed.length === 0 || (instrument !== "" && allowed.includes(instrument));
    add(
      "instrument",
      "Instrument",
      ok ? "pass" : "block",
      ok
        ? allowed.length
          ? `${instrument} is on the allowed list.`
          : "Any instrument is allowed."
        : `${instrument || "No instrument given"}: not on the allowed list (${allowed.join(", ")}).`,
    );
  } else {
    const blocked = (policy.blockedCategories ?? []).map((c) => c.toLowerCase());
    const category = (action.category ?? "").toLowerCase();
    const ok = !category || !blocked.includes(category);
    add(
      "category",
      "Merchant category",
      ok ? "pass" : "block",
      ok
        ? category
          ? `${category} isn't blocked.`
          : "No category given; none is blocked by it."
        : `${category} is a blocked category.`,
    );
  }

  // 2. Identity decides whether the agent may act on its own at all.
  if (!identity.verified) {
    add(
      "identity",
      "Agent identity",
      "review",
      identity.reason && identity.reason !== "none"
        ? `Its AINRA passport didn't verify (${identity.reason}), so a person decides.`
        : "It didn't present an AINRA passport, so a person decides.",
    );
  } else {
    add(
      "identity",
      "Agent identity",
      "pass",
      `Verified with AINRA: ${identity.name ?? "agent"} (${identity.number}), tier ${identity.tier ?? "none"}.`,
    );
    const ceiling = tierAutoCeilingCents(identity.tier);
    add(
      "tier",
      "Identity tier",
      ceiling === 0 ? "review" : amount > ceiling ? "review" : "pass",
      ceiling === 0
        ? `AINRA tier ${identity.tier ?? "(none)"} may not act on its own; L2 and up may.`
        : amount > ceiling
          ? `Above ${usd(ceiling)}, the most a tier ${identity.tier} agent may do on its own.`
          : `Within ${usd(ceiling)}, the ceiling for tier ${identity.tier}.`,
    );
    add(
      "capability",
      "Declared capability",
      declares(identity.capabilities, action.kind) ? "pass" : "review",
      declares(identity.capabilities, action.kind)
        ? `Its passport declares ${REQUIRED_CAPABILITY[action.kind]}.`
        : `Its passport doesn't declare ${REQUIRED_CAPABILITY[action.kind]}.`,
    );
  }

  // 3. The firm's own limits.
  add(
    "mode",
    "Autonomy",
    policy.mode === "auto" ? "pass" : "review",
    policy.mode === "auto"
      ? "Identified agents may act on their own within limits."
      : "Propose-only: a person approves every action.",
  );
  const perAction = Math.max(0, policy.perActionLimitCents);
  add(
    "per_action_limit",
    "Per-action limit",
    amount > perAction ? "review" : "pass",
    amount > perAction
      ? `Above the ${usd(perAction)} per-action limit.`
      : `Within ${usd(perAction)}.`,
  );
  const daily = Math.min(Math.max(0, policy.dailyLimitCents), MAX_DAILY_LIMIT_CENTS);
  const used = Math.max(0, usage.usedTodayCents ?? 0);
  add(
    "daily_limit",
    "Daily limit",
    used + amount > daily ? "review" : "pass",
    used + amount > daily
      ? `Would take it past ${usd(daily)} today (${usd(used)} used).`
      : `${usd(used + amount)} of ${usd(daily)} today.`,
  );
  if (policy.maxActionsPerHour !== undefined) {
    const recent = Math.max(0, usage.actionsLastHour ?? 0);
    const over = recent >= policy.maxActionsPerHour;
    add(
      "rate",
      "Rate",
      over ? "review" : "pass",
      over
        ? `${recent} actions in the last hour; the limit is ${policy.maxActionsPerHour}.`
        : `${recent} of ${policy.maxActionsPerHour} actions this hour.`,
    );
  }

  const worst = checks.reduce<GateCheckStatus>(
    (w, c) => (RANK[c.status] > RANK[w] ? c.status : w),
    "pass",
  );
  const decision: GateOutcome =
    worst === "block" ? "block" : worst === "review" ? "review" : "allow";
  const first = checks.find((c) => c.status === worst);
  const verb =
    action.kind === "trade"
      ? `${action.side ?? "trade"} ${action.instrument ?? ""}`.trim()
      : `pay ${action.merchant ?? "a merchant"}`;
  const summary =
    decision === "allow"
      ? `Allowed: ${agent.id} may ${verb} for ${usd(amount)} on its own.`
      : decision === "review"
        ? `Needs review: ${first?.detail}`
        : `Blocked: ${first?.detail}`;

  const requestHash = sha256(canonical(req));
  return {
    decision,
    summary,
    checks,
    evidence: {
      decidedAt: opts.now.toISOString(),
      requestHash,
      decisionHash: sha256(
        canonical({ requestHash, decision, checks, decidedAt: opts.now.toISOString() }),
      ),
    },
  };
}

/** Recomputes a decision's fingerprint: true when the request, decision and checks are exactly as recorded. */
export function verifyEvidence(req: GateRequest, d: GateDecision): boolean {
  const requestHash = sha256(canonical(req));
  return (
    requestHash === d.evidence.requestHash &&
    sha256(
      canonical({
        requestHash,
        decision: d.decision,
        checks: d.checks,
        decidedAt: d.evidence.decidedAt,
      }),
    ) === d.evidence.decisionHash
  );
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** JSON with object keys sorted, so the same request always hashes the same. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}
