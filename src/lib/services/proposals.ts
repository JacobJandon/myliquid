import { newId, nowIso, simDate, type Db } from "@/lib/db";
import { requireProduct } from "@/lib/domain/catalog";
import { formatUsd } from "@/lib/domain/money";
import type { AgentId, CheckResult, OrderIntent } from "@/lib/domain/types";
import { logEvent } from "./audit";
import { executeOrder, previewOrder, type OrderRecord } from "./orders";
import { getMandate } from "./repo";

/**
 * Proposals are how agents act by default: they suggest, a human approves.
 * Agents only skip the approval step in "bounded" autonomy, for small orders
 * that pass every mandate limit.
 */

export type ProposalStatus = "pending" | "executed" | "partially_executed" | "failed" | "rejected";

export interface ProposedOrder extends OrderIntent {
  reason?: string;
}

export interface Proposal {
  id: string;
  agent: AgentId;
  title: string;
  rationale: string;
  orders: ProposedOrder[];
  checks: CheckResult[][];
  status: ProposalStatus;
  createdOn: string;
  createdAt: string;
  decidedAt: string | null;
  result: { orderIds: string[]; messages: string[] } | null;
}

function mapProposal(r: Record<string, unknown>): Proposal {
  return {
    id: r.id as string,
    agent: r.agent as AgentId,
    title: r.title as string,
    rationale: r.rationale as string,
    orders: JSON.parse(r.orders as string) as ProposedOrder[],
    checks: JSON.parse(r.checks as string) as CheckResult[][],
    status: r.status as ProposalStatus,
    createdOn: r.created_on as string,
    createdAt: r.created_at as string,
    decidedAt: (r.decided_at as string | null) ?? null,
    result: r.result ? (JSON.parse(r.result as string) as Proposal["result"]) : null,
  };
}

export function getProposal(db: Db, investorId: string, id: string): Proposal | undefined {
  const row = db
    .prepare("SELECT * FROM proposals WHERE id = ? AND investor_id = ?")
    .get(id, investorId) as Record<string, unknown> | undefined;
  return row ? mapProposal(row) : undefined;
}

export function listProposals(
  db: Db,
  investorId: string,
  opts: { status?: ProposalStatus; limit?: number } = {},
): Proposal[] {
  const rows = db
    .prepare(
      `SELECT * FROM proposals WHERE investor_id = ? ${opts.status ? "AND status = ?" : ""} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...[investorId, ...(opts.status ? [opts.status] : []), opts.limit ?? 50]) as Record<
    string,
    unknown
  >[];
  return rows.map(mapProposal);
}

export type CreateProposalResult =
  | { ok: true; proposal: Proposal; dropped: { order: ProposedOrder; checks: CheckResult[] }[] }
  | { ok: false; reason: string; dropped: { order: ProposedOrder; checks: CheckResult[] }[] };

/** Creates a proposal from the orders that pass the (human-approved) pre-trade checks. */
export function createProposal(
  db: Db,
  investorId: string,
  input: {
    agent: AgentId;
    title: string;
    rationale: string;
    orders: ProposedOrder[];
    runId?: string | null;
  },
): CreateProposalResult {
  const kept: ProposedOrder[] = [];
  const keptChecks: CheckResult[][] = [];
  const dropped: { order: ProposedOrder; checks: CheckResult[] }[] = [];
  for (const order of input.orders) {
    const preview = previewOrder(db, investorId, order, input.agent);
    if (preview.blocked) dropped.push({ order, checks: preview.checks });
    else {
      kept.push(order);
      keptChecks.push(preview.checks);
    }
  }
  if (kept.length === 0) {
    return {
      ok: false,
      reason: "Every order in the proposal failed Sentinel's pre-trade checks.",
      dropped,
    };
  }
  const id = newId("prp");
  db.prepare(
    `INSERT INTO proposals (id, investor_id, agent, title, rationale, orders, checks, status, created_on, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(
    id,
    investorId,
    input.agent,
    input.title,
    input.rationale,
    JSON.stringify(kept),
    JSON.stringify(keptChecks),
    simDate(db),
    nowIso(),
  );
  logEvent(db, investorId, {
    runId: input.runId,
    agent: input.agent,
    kind: "proposal",
    title: `Proposed: ${input.title}`,
    payload: { proposalId: id, orders: kept },
  });
  return { ok: true, proposal: getProposal(db, investorId, id)!, dropped };
}

export type AgentTradeResult =
  | { outcome: "executed"; order: OrderRecord; checks: CheckResult[] }
  | { outcome: "proposed"; proposal: Proposal; checks: CheckResult[]; whyNotAuto: string }
  | { outcome: "blocked"; checks: CheckResult[] };

/**
 * The single entry point for an agent that wants to trade. It either executes
 * within the mandate, turns the trade into a proposal, or reports why it is blocked.
 */
export function agentTrade(
  db: Db,
  investorId: string,
  agent: AgentId,
  intent: ProposedOrder,
  rationale: string,
  runId?: string | null,
): AgentTradeResult {
  const mandate = getMandate(db, investorId);
  const humanPath = previewOrder(db, investorId, intent, agent);
  if (humanPath.blocked) {
    logEvent(db, investorId, {
      runId,
      agent,
      kind: "order",
      title: `Blocked before proposing: ${intent.side} ${formatUsd(intent.amountCents)} ${intent.productId}`,
      payload: { checks: humanPath.checks.filter((c) => c.status === "block") },
    });
    return { outcome: "blocked", checks: humanPath.checks };
  }

  let whyNotAuto =
    "Your autonomy setting is propose-only, so every agent trade needs your approval.";
  if (mandate.autonomy === "bounded") {
    const autoPath = previewOrder(db, investorId, intent, agent, { autonomous: true });
    const overLimit = intent.amountCents > mandate.autoExecuteLimitCents;
    if (!autoPath.blocked && !overLimit) {
      const order = executeOrder(db, investorId, intent, agent, {
        autonomous: true,
        note: rationale,
        runId,
      });
      return { outcome: "executed", order, checks: autoPath.checks };
    }
    whyNotAuto = overLimit
      ? `Above your ${formatUsd(mandate.autoExecuteLimitCents)} auto-execute limit.`
      : `Outside the agent mandate: ${autoPath.checks
          .filter((c) => c.status === "block")
          .map((c) => c.label)
          .join(", ")}.`;
  }

  const product = requireProduct(intent.productId);
  const created = createProposal(db, investorId, {
    agent,
    title: `${intent.side === "buy" ? "Buy" : "Sell"} ${formatUsd(intent.amountCents)} of ${product.name}`,
    rationale,
    orders: [intent],
    runId,
  });
  if (!created.ok) return { outcome: "blocked", checks: humanPath.checks };
  return { outcome: "proposed", proposal: created.proposal, checks: humanPath.checks, whyNotAuto };
}

/** A human approves: every order is re-checked against the current portfolio and executed. */
export function approveProposal(db: Db, investorId: string, id: string): Proposal {
  const proposal = getProposal(db, investorId, id);
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "pending") throw new Error(`Proposal is already ${proposal.status}`);
  const orderIds: string[] = [];
  const messages: string[] = [];
  let executed = 0;
  // Sells first so their proceeds (for instant-settlement products) can fund buys.
  const ordered = [...proposal.orders].sort((a, b) =>
    a.side === b.side ? 0 : a.side === "sell" ? -1 : 1,
  );
  for (const intent of ordered) {
    const order = executeOrder(db, investorId, intent, proposal.agent, {
      proposalId: id,
      note: `Approved proposal: ${proposal.title}`,
    });
    orderIds.push(order.id);
    if (order.status === "rejected") {
      messages.push(
        `Blocked: ${order.checks
          .filter((c) => c.status === "block")
          .map((c) => c.detail)
          .join(" ")}`,
      );
    } else {
      executed += 1;
      messages.push("Executed");
    }
  }
  const status: ProposalStatus =
    executed === proposal.orders.length
      ? "executed"
      : executed === 0
        ? "failed"
        : "partially_executed";
  db.prepare(
    "UPDATE proposals SET status = ?, decided_at = ?, result = ? WHERE id = ? AND investor_id = ?",
  ).run(status, nowIso(), JSON.stringify({ orderIds, messages }), id, investorId);
  logEvent(db, investorId, {
    agent: "user",
    kind: "proposal",
    title: `Approved "${proposal.title}" (${status.replace("_", " ")})`,
    payload: { proposalId: id },
  });
  return getProposal(db, investorId, id)!;
}

export function rejectProposal(db: Db, investorId: string, id: string): Proposal {
  const proposal = getProposal(db, investorId, id);
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "pending") throw new Error(`Proposal is already ${proposal.status}`);
  db.prepare(
    "UPDATE proposals SET status = 'rejected', decided_at = ? WHERE id = ? AND investor_id = ?",
  ).run(nowIso(), id, investorId);
  logEvent(db, investorId, {
    agent: "user",
    kind: "proposal",
    title: `Rejected "${proposal.title}"`,
    payload: { proposalId: id },
  });
  return getProposal(db, investorId, id)!;
}
