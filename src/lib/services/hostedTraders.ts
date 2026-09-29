import { newId, nowIso, simDate, type Db } from "@/lib/db";
import { ainraMode, testbedBundle, TESTBED_AGENTS, type TestbedAgentId } from "@/lib/ainra";
import type { TradeMode } from "@/lib/domain/agentTrading";
import { requireProduct } from "@/lib/domain/catalog";
import { formatUsd } from "@/lib/domain/money";
import {
  momentumStrategy,
  readPortfolio,
  readSignals,
  researchNote,
  ticketCents,
  treasuryStrategy,
  type StrategyResult,
} from "@/lib/domain/traderStrategies";
import { callMcpTool } from "@/lib/mcp/server";
import { identityGate, presentPassport } from "./agentIdentity";
import { createInvite, enrollAgent } from "./agentInvites";
import { listApiKeys, revokeApiKey } from "./apiKeys";
import { logEvent } from "./audit";
import { currentPrice } from "./repo";

/**
 * Reference traders MyLiquid hosts for the investor. Each is a testbed AINRA agent from an outside operator,
 * enrolled with an invite like any other. Once a market day it presents its passport, reads the portfolio and
 * signals through the MCP tools, decides with its strategy, and trades through `propose_trade`, so its identity,
 * limits, the mandate and Sentinel's checks apply exactly as they would to an agent running elsewhere.
 */

/** The testbed agents that can be hosted, and how each one trades. */
export const HOSTED_STRATEGIES: Partial<
  Record<TestbedAgentId, { strategy: "momentum" | "treasury" | "research"; description: string }>
> = {
  "momentum-trader": {
    strategy: "momentum",
    description:
      "Buys the strongest uptrend among the US index, world index and quant momentum funds, and trims a holding in a downtrend. At most two trades a market day.",
  },
  "treasury-agent": {
    strategy: "treasury",
    description:
      "Keeps cash near 8% of the portfolio (± 2%): parks the excess in the bond index, and raises cash from it when short.",
  },
  "research-analyst": {
    strategy: "research",
    description:
      "Reads the market every day and writes a note. It never trades: tier L1 only reads.",
  },
};

/** Proposal size when the agent may only propose. */
const PROPOSAL_TICKET_CENTS = 500_00;

export type HostedStatus = "active" | "paused" | "disconnected";

export interface RunDecision {
  title: string;
  outcome: "executed" | "proposed" | "blocked" | "refused";
  detail: string;
}

export interface RunSummary {
  date: string;
  at: string;
  note: string;
  decisions: RunDecision[];
  /** Set when the run stopped early (cut off, not identified). */
  stopped: string | null;
}

export interface HostedTrader {
  id: string;
  agent: TestbedAgentId;
  label: string;
  description: string;
  keyId: string;
  status: HostedStatus;
  createdAt: string;
  lastRunOn: string | null;
  runs: number;
  lastSummary: RunSummary | null;
}

function mapTrader(r: Record<string, unknown>): HostedTrader {
  const agent = r.agent as TestbedAgentId;
  return {
    id: r.id as string,
    agent,
    label: TESTBED_AGENTS.find((a) => a.id === agent)?.label ?? agent,
    description: HOSTED_STRATEGIES[agent]?.description ?? "",
    keyId: r.key_id as string,
    status: r.status as HostedStatus,
    createdAt: r.created_at as string,
    lastRunOn: (r.last_run_on as string | null) ?? null,
    runs: (r.runs as number) ?? 0,
    lastSummary: r.last_summary ? (JSON.parse(r.last_summary as string) as RunSummary) : null,
  };
}

export function listHostedTraders(db: Db, investorId: string): HostedTrader[] {
  return (
    db
      .prepare(
        "SELECT * FROM hosted_traders WHERE investor_id = ? AND status != 'disconnected' ORDER BY created_at",
      )
      .all(investorId) as Record<string, unknown>[]
  ).map(mapTrader);
}

export function getHostedTrader(db: Db, investorId: string, id: string): HostedTrader | null {
  const row = db
    .prepare("SELECT * FROM hosted_traders WHERE id = ? AND investor_id = ?")
    .get(id, investorId) as Record<string, unknown> | undefined;
  return row ? mapTrader(row) : null;
}

/**
 * Hires a hosted trader: invites it and enrolls it with its AINRA passport, exactly as an outside agent would.
 * Only in testbed mode, where the testbed passports verify.
 */
export async function hireTrader(
  db: Db,
  investorId: string,
  agent: TestbedAgentId,
  limits: { mode: TradeMode; perTradeLimitCents: number; dailyLimitCents: number },
): Promise<HostedTrader> {
  if (ainraMode() !== "testbed")
    throw new Error("Hosted traders use testbed AINRA passports, so they need testbed mode.");
  const plan = HOSTED_STRATEGIES[agent];
  if (!plan) throw new Error("That agent can't be hosted.");
  const label = TESTBED_AGENTS.find((a) => a.id === agent)!.label;
  if (listHostedTraders(db, investorId).some((t) => t.agent === agent))
    throw new Error(`${label} already works for you.`);
  const { code } = createInvite(db, investorId, {
    label,
    allowTrade: plan.strategy !== "research",
    allowPay: false,
    tradeMode: plan.strategy === "research" ? "propose" : limits.mode,
    perTradeLimitCents: limits.perTradeLimitCents,
    dailyLimitCents: limits.dailyLimitCents,
  });
  const enrolled = enrollAgent(db, code, await testbedBundle(agent), { name: label });
  const id = newId("htr");
  db.prepare(
    "INSERT INTO hosted_traders (id, investor_id, agent, key_id, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
  ).run(id, investorId, agent, enrolled.apiKey.id, nowIso());
  logEvent(db, investorId, {
    agent: "user",
    kind: "system",
    title: `Hired ${label} (${enrolled.check.number}) as a hosted trader`,
  });
  return getHostedTrader(db, investorId, id)!;
}

export function setHostedStatus(
  db: Db,
  investorId: string,
  id: string,
  status: "active" | "paused",
): HostedTrader {
  const result = db
    .prepare(
      "UPDATE hosted_traders SET status = ? WHERE id = ? AND investor_id = ? AND status != 'disconnected'",
    )
    .run(status, id, investorId);
  if (result.changes === 0) throw new Error("Trader not found");
  return getHostedTrader(db, investorId, id)!;
}

/** Lets a hosted trader go: its key is revoked, so it can't act again. */
export function fireTrader(db: Db, investorId: string, id: string): void {
  const trader = getHostedTrader(db, investorId, id);
  if (!trader) throw new Error("Trader not found");
  revokeApiKey(db, investorId, trader.keyId);
  db.prepare(
    "UPDATE hosted_traders SET status = 'disconnected' WHERE id = ? AND investor_id = ?",
  ).run(id, investorId);
  logEvent(db, investorId, { agent: "user", kind: "system", title: `Let ${trader.label} go` });
}

function saveRun(
  db: Db,
  investorId: string,
  trader: HostedTrader,
  summary: RunSummary,
): RunSummary {
  db.prepare(
    `UPDATE hosted_traders SET last_run_on = ?, last_run_at = ?, last_summary = ?, runs = runs + 1
     WHERE id = ? AND investor_id = ?`,
  ).run(summary.date, summary.at, JSON.stringify(summary), trader.id, investorId);
  const executed = summary.decisions.filter((d) => d.outcome === "executed").length;
  const proposed = summary.decisions.filter((d) => d.outcome === "proposed").length;
  logEvent(db, investorId, {
    agent: "external",
    kind: "system",
    title: `${trader.label} ran for ${summary.date}: ${
      summary.stopped ??
      (summary.decisions.length === 0
        ? "no trades"
        : `${executed} executed, ${proposed} proposed${summary.decisions.length > executed + proposed ? `, ${summary.decisions.length - executed - proposed} blocked` : ""}`)
    }`,
    payload: { hostedTraderId: trader.id, summary },
  });
  return summary;
}

/**
 * One working session for a hosted trader. Without `force`, it runs at most once per market day: the day is
 * claimed first, so two servers can't both run it.
 */
export async function runTrader(
  db: Db,
  investorId: string,
  id: string,
  opts: { force?: boolean } = {},
): Promise<RunSummary | null> {
  const trader = getHostedTrader(db, investorId, id);
  if (!trader || trader.status !== "active") return null;
  const today = simDate(db);
  if (!opts.force) {
    const claimed = db
      .prepare(
        `UPDATE hosted_traders SET last_run_on = ? WHERE id = ? AND investor_id = ? AND status = 'active'
           AND (last_run_on IS NULL OR last_run_on < ?)`,
      )
      .run(today, id, investorId, today);
    if (claimed.changes !== 1) return null;
  }
  const summary: RunSummary = { date: today, at: nowIso(), note: "", decisions: [], stopped: null };

  const key = listApiKeys(db, investorId).find((k) => k.id === trader.keyId && !k.revokedAt);
  if (!key) {
    db.prepare("UPDATE hosted_traders SET status = 'disconnected' WHERE id = ?").run(id);
    return saveRun(db, investorId, trader, { ...summary, stopped: "its key was revoked" });
  }
  const principal = { investorId, keyId: key.id, keyName: key.name, scopes: key.scopes };

  // 1. Present its passport, as it must at least every five minutes.
  const presented = presentPassport(db, principal, await testbedBundle(trader.agent));
  if (!presented.ok)
    return saveRun(db, investorId, trader, {
      ...summary,
      stopped: `cut off: its passport was refused (${presented.reason})`,
    });
  const gate = identityGate(db, principal);
  if (!gate.allow) return saveRun(db, investorId, trader, { ...summary, stopped: gate.message });
  const call = (name: string, args: Record<string, unknown> = {}) =>
    callMcpTool(db, gate.principal, name, args);

  // 2. Read what any outside agent can read.
  const [permissions, portfolioRaw, signalsRaw] = [
    await call("get_my_permissions"),
    await call("get_portfolio"),
    await call("get_market_signals"),
  ];
  if (!portfolioRaw.ok || !signalsRaw.ok)
    return saveRun(db, investorId, trader, {
      ...summary,
      stopped: String(portfolioRaw.data.error ?? signalsRaw.data.error ?? "couldn't read"),
    });
  const portfolio = readPortfolio(portfolioRaw.data);
  const signals = readSignals(signalsRaw.data);
  const ticket = ticketCents(permissions.data, PROPOSAL_TICKET_CENTS);

  // 3. Decide.
  const plan = HOSTED_STRATEGIES[trader.agent]!.strategy;
  const decided: StrategyResult =
    plan === "momentum"
      ? momentumStrategy(signals, portfolio, ticket.cents)
      : plan === "treasury"
        ? treasuryStrategy(portfolio, ticket.cents)
        : researchNote(signals, portfolio);
  summary.note = decided.note;
  // Proposing agents make one proposal a day at most, so they don't flood the inbox.
  const ideas = ticket.auto ? decided.ideas : decided.ideas.slice(0, 1);

  // 4. Act, through the same tool any outside agent uses.
  for (const idea of ideas) {
    const product = requireProduct(idea.productId);
    const title = `${idea.side === "buy" ? "Buy" : "Sell"} ${formatUsd(idea.amountCents)} of ${product.name}`;
    const result = await call("propose_trade", {
      productId: idea.productId,
      side: idea.side,
      amountUsd: idea.amountCents / 100,
      rationale: idea.rationale,
    });
    const outcome = String(result.data.outcome ?? "");
    summary.decisions.push(
      outcome === "executed"
        ? { title, outcome: "executed", detail: idea.rationale }
        : outcome === "proposed"
          ? { title, outcome: "proposed", detail: String(result.data.whyNotAutomatic ?? "") }
          : outcome === "blocked"
            ? {
                title,
                outcome: "blocked",
                detail: `Sentinel blocked it: ${JSON.stringify(result.data.checks ?? [])}`,
              }
            : { title, outcome: "refused", detail: String(result.data.error ?? "refused") },
    );
  }
  return saveRun(db, investorId, trader, summary);
}

/** Runs every active hosted trader of an investor that hasn't worked this market day yet. */
export async function runDueTraders(db: Db, investorId: string): Promise<number> {
  const today = simDate(db);
  let ran = 0;
  for (const t of listHostedTraders(db, investorId)) {
    if (t.status !== "active" || (t.lastRunOn && t.lastRunOn >= today)) continue;
    if (await runTrader(db, investorId, t.id)) ran++;
  }
  return ran;
}

/** Whether any hosted trader of this investor still has to work today (cheap, for page loads). */
export function tradersDue(db: Db, investorId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM hosted_traders WHERE investor_id = ? AND status = 'active'
         AND (last_run_on IS NULL OR last_run_on < ?) LIMIT 1`,
    )
    .get(investorId, simDate(db));
}

/** For the daily cron: every investor's due traders. */
export async function runAllDueTraders(db: Db): Promise<number> {
  const investors = db
    .prepare("SELECT DISTINCT investor_id FROM hosted_traders WHERE status = 'active'")
    .all() as { investor_id: string }[];
  let ran = 0;
  for (const { investor_id } of investors) ran += await runDueTraders(db, investor_id);
  return ran;
}

export interface TraderRecord {
  /** Orders it placed on its own. */
  executed: number;
  proposed: number;
  volumeCents: number;
  /**
   * What its own trades are worth against not making them, at today's prices: buys at today's value minus their
   * cost, sells at their proceeds minus today's value of what was sold.
   */
  pnlCents: number;
}

export function traderRecord(db: Db, investorId: string, keyId: string): TraderRecord {
  const today = simDate(db);
  const orders = db
    .prepare(
      `SELECT product_id, side, filled_cents, units FROM orders
       WHERE investor_id = ? AND agent_key_id = ? AND autonomous = 1 AND status != 'rejected'`,
    )
    .all(investorId, keyId) as {
    product_id: string;
    side: "buy" | "sell";
    filled_cents: number;
    units: number;
  }[];
  let pnl = 0;
  let volume = 0;
  for (const o of orders) {
    const price = currentPrice(db, o.product_id, today) ?? 0;
    const worth = Math.round(o.units * price * 100);
    pnl += o.side === "buy" ? worth - o.filled_cents : o.filled_cents - worth;
    volume += o.filled_cents;
  }
  const proposed = db
    .prepare("SELECT COUNT(*) AS n FROM proposals WHERE investor_id = ? AND agent_key_id = ?")
    .get(investorId, keyId) as { n: number };
  return { executed: orders.length, proposed: proposed.n, volumeCents: volume, pnlCents: pnl };
}
