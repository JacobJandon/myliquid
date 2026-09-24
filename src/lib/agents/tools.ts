import { z } from "zod";
import { simDate, type Db } from "@/lib/db";
import {
  PRODUCTS,
  SLEEVE_LABELS,
  getDealFacts,
  getProduct,
  isLiquid,
  requireProduct,
} from "@/lib/domain/catalog";
import { addDays } from "@/lib/domain/dates";
import { scoreDeal } from "@/lib/domain/diligence";
import { formatPct, formatPrice, formatUsd } from "@/lib/domain/money";
import { planRebalance } from "@/lib/domain/rebalance";
import { reviewPortfolioRisk } from "@/lib/domain/risk";
import { describeRule, momentumSignal } from "@/lib/domain/signals";
import type { AgentId, Product, Sleeve } from "@/lib/domain/types";
import { reviewValuation } from "@/lib/domain/valuation";
import { listAlerts, raiseAlert, resolveMissing } from "@/lib/services/alerts";
import { listEvents, logEvent } from "@/lib/services/audit";
import {
  eligibleIlliquidProducts,
  getDealReview,
  listDeals,
  saveDealReview,
} from "@/lib/services/deals";
import { previewOrder } from "@/lib/services/orders";
import { getLadder, getSnapshot } from "@/lib/services/portfolio";
import { agentTrade, createProposal, listProposals } from "@/lib/services/proposals";
import {
  getAvailableLots,
  getMandate,
  getProfile,
  priceHistory,
  updateMandate,
} from "@/lib/services/repo";
import { createRule, listRules, setRuleStatus } from "@/lib/services/rules";

/**
 * Every capability an agent has is one of these tools. The same functions back
 * the Claude-powered agents and the deterministic offline agents, so the
 * guardrails are identical in both modes.
 */

export interface ToolContext {
  db: Db;
  investorId: string;
  agent: AgentId;
  runId: string | null;
}

export interface AgentTool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  /** Trading tools refuse to run while the kill switch is on or the agent is disabled. */
  trades: boolean;
  run: (input: z.infer<S>, ctx: ToolContext) => Record<string, unknown>;
}

function defineTool<S extends z.ZodType>(tool: AgentTool<S>): AgentTool<S> {
  return tool;
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function describeLiquidity(p: Product): string {
  const t = p.liquidity;
  switch (t.redemption) {
    case "instant":
      return "Instant (24/7)";
    case "daily":
      return `Daily, settles T+${t.settlementDays}`;
    case "quarterly":
      return `Quarterly windows, ${t.noticeDays}-day notice, ${formatPct(t.gatePct ?? 0, 0)} gate${t.lockupMonths ? `, ${t.lockupMonths}-month initial lock` : ""}`;
    case "locked":
      return `Locked ${t.lockupMonths} months per investment`;
  }
}

const productIdSchema = z
  .string()
  .describe(`Product id. One of: ${PRODUCTS.map((p) => p.id).join(", ")}`)
  .refine((id) => !!getProduct(id), "Unknown product id");

const amountUsdSchema = z.number().positive().max(10_000_000).describe("Order size in US dollars");

function tradingBlockedReason(ctx: ToolContext): string | null {
  const mandate = getMandate(ctx.db, ctx.investorId);
  if (mandate.killSwitch)
    return `All agents are paused (kill switch${mandate.killReason ? `: ${mandate.killReason}` : ""}). Only the investor can resume them.`;
  if (mandate.disabledAgents.includes(ctx.agent))
    return `${ctx.agent} is disabled in the investor's settings.`;
  return null;
}

// ── Tools ───────────────────────────────────────────────────────────────────

const getPortfolio = defineTool({
  name: "get_portfolio",
  description:
    "Current portfolio: total value, cash, each sleeve's weight vs target, and every holding with its lock-up status.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId }) => {
    const snap = getSnapshot(db, investorId);
    const profile = getProfile(db, investorId);
    return {
      date: snap.date,
      riskProfile: {
        name: profile.label,
        limits: {
          maxIlliquid: formatPct(profile.limits.maxIlliquidPct, 0),
          maxBitcoin: formatPct(profile.limits.maxBitcoinPct, 0),
          maxSingleDeal: formatPct(profile.limits.maxSingleDealPct, 0),
          minCash: formatPct(profile.limits.minCashPct, 0),
        },
      },
      total: formatUsd(snap.totalCents),
      availableCash: formatUsd(snap.cashCents),
      settlingCash: formatUsd(snap.pendingCashCents),
      sleeves: (Object.keys(snap.sleeves) as Sleeve[]).map((s) => ({
        sleeve: SLEEVE_LABELS[s],
        value: formatUsd(snap.sleeves[s].valueCents),
        weight: formatPct(snap.sleeves[s].weight),
        target: formatPct(profile.targets[s], 0),
        driftPp: ((snap.sleeves[s].weight - profile.targets[s]) * 100).toFixed(1),
      })),
      holdings: snap.holdings.map((h) => ({
        id: h.product.id,
        name: h.product.name,
        sleeve: SLEEVE_LABELS[h.product.sleeve],
        value: formatUsd(h.valueCents),
        weight: formatPct(h.weight),
        gain: formatPct(h.costCents > 0 ? h.valueCents / h.costCents - 1 : 0, 1, true),
        locked: h.lockedValueCents > 0 ? formatUsd(h.lockedValueCents) : "none",
        nextUnlock: h.nextUnlock,
        liquidity: describeLiquidity(h.product),
      })),
    };
  },
});

const getLiquidityLadder = defineTool({
  name: "get_liquidity_ladder",
  description:
    "How much of the portfolio could become cash, and when: today, within 7 days, 90 days, 1 year, 5 years, or later. Takes settlement, notice periods, gates and lock-ups into account.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId }) => {
    const ladder = getLadder(db, investorId);
    return {
      buckets: ladder.map((b) => ({
        bucket: b.label,
        value: formatUsd(b.valueCents),
        cumulative: formatUsd(b.cumulativeCents),
        cumulativeShare: formatPct(b.cumulativePct),
        items: b.items.map((i) => ({
          name: i.label,
          value: formatUsd(i.valueCents),
          availableOn: i.availableOn,
          note: i.note,
        })),
      })),
    };
  },
});

const listProducts = defineTool({
  name: "list_products",
  description:
    "The product shelf: every fund, asset and private deal with price, liquidity terms, valuation source and minimum investment.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId }) => {
    const snap = getSnapshot(db, investorId);
    return {
      products: PRODUCTS.map((p) => {
        const holding = snap.holdings.find((h) => h.product.id === p.id);
        return {
          id: p.id,
          name: p.name,
          sleeve: SLEEVE_LABELS[p.sleeve],
          kind: p.kind,
          price: formatPrice(
            holding?.price ??
              priceHistory(db, p.id, addDays(snap.date, -120)).at(-1)?.price ??
              p.startPrice,
          ),
          liquidity: describeLiquidity(p),
          valuation:
            p.valuation.source === "market"
              ? "Market price"
              : `Appraised by ${p.valuation.appraiser}`,
          minInvestment: formatUsd(p.minTicketCents),
          scoutVerdict:
            p.kind === "deal" ? (getDealReview(db, p.id)?.verdict ?? "not reviewed") : undefined,
        };
      }),
    };
  },
});

const getMarketSignals = defineTool({
  name: "get_market_signals",
  description:
    "Quant's trend signals for liquid products: 20- and 60-day moving averages, trend direction and strength, drawdown from the 1-year high, and 30-day return.",
  schema: z.object({
    productIds: z
      .array(z.string())
      .optional()
      .describe("Limit to these product ids. Omit for all liquid products."),
  }),
  trades: false,
  run: ({ productIds }, { db }) => {
    const today = simDate(db);
    const products = PRODUCTS.filter(
      (p) => isLiquid(p) && (!productIds?.length || productIds.includes(p.id)),
    );
    return {
      date: today,
      signals: products.map((p) => {
        const history = priceHistory(db, p.id, addDays(today, -365));
        const s = momentumSignal(history);
        const monthAgo = history.find((h) => h.date >= addDays(today, -30))?.price ?? s.last;
        return {
          id: p.id,
          name: p.name,
          price: formatPrice(s.last),
          sma20: formatPrice(s.sma20),
          sma60: formatPrice(s.sma60),
          trend: s.signal,
          strength: formatPct(s.strength, 2, true),
          drawdownFromHigh: formatPct(s.drawdownFromHigh, 1),
          return30d: formatPct(s.last / monthAgo - 1, 1, true),
        };
      }),
    };
  },
});

const listDealsTool = defineTool({
  name: "list_deals",
  description:
    "Every private deal (business interests, private credit, growth equity) with Scout's latest score, verdict and red flags.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db }) => ({
    deals: listDeals(db).map(({ product, facts, review }) => ({
      id: product.id,
      name: product.name,
      originator: facts.originator,
      sector: facts.sector,
      structure: facts.structure,
      termMonths: facts.termMonths,
      targetYield: `${facts.targetYieldPct}%`,
      lockup: `${product.liquidity.lockupMonths} months`,
      minInvestment: formatUsd(product.minTicketCents),
      score: review?.score ?? null,
      verdict: review?.verdict ?? "not reviewed",
      redFlags: review?.flags.filter((f) => f.impact < 0).map((f) => f.label) ?? [],
      reviewedOn: review?.reviewedOn ?? null,
    })),
  }),
});

const reviewDeal = defineTool({
  name: "review_deal",
  description:
    "Scout's diligence on one private deal: runs the red-flag checklist, saves the score and verdict, and returns the memo.",
  schema: z.object({ productId: productIdSchema }),
  trades: false,
  run: ({ productId }, { db, investorId, agent, runId }) => {
    const facts = getDealFacts(productId);
    if (!facts) return { error: `${productId} is not a private deal.` };
    const result = scoreDeal(facts);
    saveDealReview(db, result, simDate(db), agent === "copilot" ? "scout" : agent);
    logEvent(db, investorId, {
      runId,
      agent: "scout",
      kind: "tool_result",
      title: `Diligence: ${requireProduct(productId).name} scored ${result.score} (${result.verdict})`,
    });
    return {
      productId,
      score: result.score,
      verdict: result.verdict,
      flags: result.flags.map((f) => ({ label: f.label, impact: f.impact, severity: f.severity })),
      memo: result.memo,
    };
  },
});

const reviewValuations = defineTool({
  name: "review_valuations",
  description:
    "Ledger's valuation review of every privately valued product: flags stale marks, originator (self) marks and suspiciously smooth returns, and raises alerts.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId, runId }) => {
    const today = simDate(db);
    const held = new Set(getSnapshot(db, investorId).holdings.map((h) => h.product.id));
    const findings = PRODUCTS.filter((p) => p.valuation.source !== "market").flatMap((p) =>
      reviewValuation(p, priceHistory(db, p.id, addDays(today, -240)), today).map((f) => ({
        ...f,
        held: held.has(p.id),
      })),
    );
    const open: { code: string; productId: string }[] = [];
    for (const f of findings) {
      if (f.severity === "info") continue;
      const code = `valuation_${f.code}`;
      open.push({ code, productId: f.productId });
      raiseAlert(db, investorId, {
        agent: "ledger",
        severity: f.severity,
        code,
        title: f.title,
        detail: f.detail,
        productId: f.productId,
        runId,
      });
    }
    resolveMissing(db, investorId, "ledger", open);
    return {
      date: today,
      findings: findings.map((f) => ({
        product: f.productId,
        held: f.held,
        severity: f.severity,
        finding: f.code,
        detail: f.detail,
      })),
    };
  },
});

const checkPortfolioRisk = defineTool({
  name: "check_portfolio_risk",
  description:
    "Sentinel's risk review: checks the portfolio against the investor's limits (illiquid share, bitcoin, single-deal concentration, cash buffer) and raises alerts.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId, runId }) => {
    const snap = getSnapshot(db, investorId);
    const ladder = getLadder(db, investorId, snap);
    const week = ladder.find((b) => b.id === "week")?.cumulativePct ?? 0;
    const findings = reviewPortfolioRisk(snap, getProfile(db, investorId), week);
    const open: { code: string; productId?: string | null }[] = [];
    for (const f of findings) {
      if (f.severity === "info") continue;
      open.push({ code: f.code, productId: f.productId ?? null });
      raiseAlert(db, investorId, {
        agent: "sentinel",
        severity: f.severity,
        code: f.code,
        title: f.title,
        detail: f.detail,
        productId: f.productId,
        runId,
      });
    }
    resolveMissing(db, investorId, "sentinel", [
      ...open,
      { code: "circuit_breaker" },
      { code: "agents_paused" },
      { code: "redemption_gated" },
    ]);
    return {
      findings: findings.map((f) => ({ severity: f.severity, title: f.title, detail: f.detail })),
    };
  },
});

const planRebalanceTool = defineTool({
  name: "plan_rebalance",
  description:
    "Atlas's rebalancing plan: drift per sleeve vs target and the trades that would fix it. Read-only; nothing is proposed.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId }) => {
    const plan = planRebalance(
      getSnapshot(db, investorId),
      getProfile(db, investorId),
      getAvailableLots(db, investorId),
      eligibleIlliquidProducts(db),
    );
    return {
      drift: plan.drift.map((d) => ({
        sleeve: SLEEVE_LABELS[d.sleeve],
        current: formatPct(d.currentPct),
        target: formatPct(d.targetPct, 0),
        driftPp: (d.driftPct * 100).toFixed(1),
      })),
      trades: plan.trades.map((t) => ({
        productId: t.productId,
        name: requireProduct(t.productId).name,
        side: t.side,
        amount: formatUsd(t.amountCents),
        reason: t.reason,
      })),
      notes: plan.notes,
    };
  },
});

const tradeInput = z.object({
  productId: productIdSchema,
  side: z.enum(["buy", "sell"]),
  amountUsd: amountUsdSchema,
});

function formatChecks(checks: { label: string; status: string; detail: string }[]) {
  return checks.map((c) => ({ check: c.label, status: c.status, detail: c.detail }));
}

const previewTrade = defineTool({
  name: "preview_trade",
  description: "Runs Sentinel's pre-trade checks on a hypothetical order without placing it.",
  schema: tradeInput,
  trades: false,
  run: ({ productId, side, amountUsd }, { db, investorId, agent }) => {
    const preview = previewOrder(
      db,
      investorId,
      { productId, side, amountCents: Math.round(amountUsd * 100) },
      agent,
    );
    return {
      wouldBeBlocked: preview.blocked,
      price: formatPrice(preview.price),
      estimatedUnits: Number(preview.estimatedUnits.toFixed(6)),
      checks: formatChecks(preview.checks),
    };
  },
});

const proposeTrade = defineTool({
  name: "propose_trade",
  description:
    "Proposes one trade for the investor. It runs Sentinel's checks. In propose-only mode it creates a proposal for the investor to approve. In bounded autonomy, small trades within the mandate execute immediately. Returns what happened.",
  schema: tradeInput.extend({
    rationale: z
      .string()
      .min(5)
      .max(600)
      .describe("Why, in one or two sentences, for the investor"),
  }),
  trades: true,
  run: ({ productId, side, amountUsd, rationale }, { db, investorId, agent, runId }) => {
    const result = agentTrade(
      db,
      investorId,
      agent,
      { productId, side, amountCents: Math.round(amountUsd * 100) },
      rationale,
      runId,
    );
    if (result.outcome === "executed") {
      return {
        outcome: "executed",
        orderId: result.order.id,
        status: result.order.status,
        amount: formatUsd(result.order.filledCents),
      };
    }
    if (result.outcome === "proposed") {
      return {
        outcome: "proposed",
        proposalId: result.proposal.id,
        awaiting: "investor approval",
        whyNotAutomatic: result.whyNotAuto,
      };
    }
    return {
      outcome: "blocked",
      checks: formatChecks(result.checks.filter((c) => c.status === "block")),
    };
  },
});

const proposeRebalance = defineTool({
  name: "propose_rebalance",
  description:
    "Turns Atlas's current rebalancing plan into one proposal (several orders) for the investor to approve.",
  schema: z.object({
    rationale: z
      .string()
      .min(5)
      .max(800)
      .describe("Summary for the investor of why to rebalance now"),
  }),
  trades: true,
  run: ({ rationale }, { db, investorId, agent, runId }) => {
    const pending = listProposals(db, investorId, { status: "pending" }).find((p) =>
      p.title.startsWith("Rebalance"),
    );
    if (pending)
      return {
        outcome: "already_pending",
        proposalId: pending.id,
        note: "A rebalance proposal is already waiting for the investor.",
      };
    const profile = getProfile(db, investorId);
    const plan = planRebalance(
      getSnapshot(db, investorId),
      profile,
      getAvailableLots(db, investorId),
      eligibleIlliquidProducts(db),
    );
    if (plan.trades.length === 0) return { outcome: "nothing_to_do", notes: plan.notes };
    const created = createProposal(db, investorId, {
      agent: agent === "copilot" ? "atlas" : agent,
      title: `Rebalance to ${profile.label} targets (${plan.trades.length} orders)`,
      rationale: [
        rationale,
        ...plan.trades.map(
          (t) =>
            `${t.side === "buy" ? "Buy" : "Sell"} ${formatUsd(t.amountCents)} ${t.productId}: ${t.reason}`,
        ),
        ...plan.notes,
      ].join("\n"),
      orders: plan.trades,
      runId,
    });
    if (!created.ok) return { outcome: "blocked", reason: created.reason };
    return {
      outcome: "proposed",
      proposalId: created.proposal.id,
      orders: created.proposal.orders.map(
        (o) => `${o.side} ${formatUsd(o.amountCents)} ${o.productId}`,
      ),
      droppedByChecks: created.dropped.map(
        (d) =>
          `${d.order.side} ${d.order.productId}: ${d.checks
            .filter((c) => c.status === "block")
            .map((c) => c.detail)
            .join(" ")}`,
      ),
      notes: plan.notes,
    };
  },
});

const listAutopilotRules = defineTool({
  name: "list_autopilot_rules",
  description:
    "The investor's autopilot rules (plain-language strategies Quant watches every day), with status and when each last fired.",
  schema: z.object({}),
  trades: false,
  run: (_input, { db, investorId }) => ({
    rules: listRules(db, investorId).map((r) => ({
      id: r.id,
      rule: r.name,
      status: r.status,
      lastTriggeredOn: r.lastTriggeredOn,
      createdBy: r.createdBy,
    })),
  }),
});

const createAutopilotRule = defineTool({
  name: "create_autopilot_rule",
  description:
    "Compiles a plain-language strategy into an autopilot rule, for example 'if bitcoin falls 20% from its high, buy $1,000'. Rules an agent creates start paused; the investor activates them. When a rule fires it goes through the same checks as any agent trade.",
  schema: z.object({
    productId: productIdSchema.describe("A daily-liquid product id (index, trading or bitcoin)"),
    condition: z
      .enum(["price_below", "price_above", "drawdown_below", "weight_above", "weight_below"])
      .describe(
        "price_* thresholds are in dollars; drawdown_below takes a negative ratio (-0.2 = 20% below the high); weight_* take a ratio of the portfolio (0.08 = 8%)",
      ),
    threshold: z.number(),
    action: z.enum(["buy", "sell"]),
    amountUsd: amountUsdSchema,
    name: z.string().max(120).optional(),
  }),
  trades: true,
  run: (input, { db, investorId, agent }) => {
    try {
      const rule = createRule(
        db,
        investorId,
        {
          productId: input.productId,
          condition: input.condition,
          threshold: input.threshold,
          action: input.action,
          amountCents: Math.round(input.amountUsd * 100),
          name: input.name,
        },
        agent,
      );
      setRuleStatus(db, investorId, rule.id, "paused");
      return {
        outcome: "created_paused",
        ruleId: rule.id,
        rule: describeRule(rule),
        next: "The investor can activate it on the Autopilot page.",
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
});

const getRecentActivity = defineTool({
  name: "get_recent_activity",
  description: "Recent audit-log events, pending proposals and open alerts.",
  schema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
  trades: false,
  run: ({ limit }, { db, investorId }) => ({
    mandate: (() => {
      const m = getMandate(db, investorId);
      return {
        autonomy: m.autonomy,
        killSwitch: m.killSwitch,
        killReason: m.killReason,
        autoExecuteLimit: formatUsd(m.autoExecuteLimitCents),
      };
    })(),
    pendingProposals: listProposals(db, investorId, { status: "pending" }).map((p) => ({
      id: p.id,
      agent: p.agent,
      title: p.title,
    })),
    openAlerts: listAlerts(db, investorId, { openOnly: true, limit: 20 }).map((a) => ({
      severity: a.severity,
      agent: a.agent,
      title: a.title,
    })),
    events: listEvents(db, investorId, { limit: limit ?? 15 }).map((e) => ({
      at: e.simDate,
      agent: e.agent,
      event: e.title,
    })),
  }),
});

const pauseAllAgents = defineTool({
  name: "pause_all_agents",
  description:
    "Pulls the kill switch: pauses every agent and autopilot rule. Only the investor can resume. Use only for a real emergency.",
  schema: z.object({ reason: z.string().min(5).max(300) }),
  trades: false,
  run: ({ reason }, { db, investorId, agent, runId }) => {
    updateMandate(db, investorId, { killSwitch: true, killReason: `${agent}: ${reason}` });
    raiseAlert(db, investorId, {
      agent: "sentinel",
      severity: "critical",
      code: "agents_paused",
      title: "All agents paused",
      detail: `${agent} pulled the kill switch: ${reason}`,
      runId,
    });
    return {
      outcome: "paused",
      note: "All agents and autopilot rules are paused until the investor resumes them.",
    };
  },
});

export const TOOLS: AgentTool[] = [
  getPortfolio,
  getLiquidityLadder,
  listProducts,
  getMarketSignals,
  listDealsTool,
  reviewDeal,
  reviewValuations,
  checkPortfolioRisk,
  planRebalanceTool,
  previewTrade,
  proposeTrade,
  proposeRebalance,
  listAutopilotRules,
  createAutopilotRule,
  getRecentActivity,
  pauseAllAgents,
] as AgentTool[];

const TOOL_INDEX = new Map(TOOLS.map((t) => [t.name, t]));

export function toolsFor(names: string[]): AgentTool[] {
  return names.map((n) => {
    const tool = TOOL_INDEX.get(n);
    if (!tool) throw new Error(`Unknown tool ${n}`);
    return tool;
  });
}

export interface ToolOutcome {
  ok: boolean;
  result: Record<string, unknown>;
}

/** Validates input against the tool's schema, applies the trading guard and runs it. */
export function invokeTool(tool: AgentTool, rawInput: unknown, ctx: ToolContext): ToolOutcome {
  const parsed = tool.schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      result: {
        error: "Invalid input",
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
    };
  }
  if (tool.trades) {
    const blocked = tradingBlockedReason(ctx);
    if (blocked) return { ok: false, result: { error: blocked } };
  }
  try {
    const result = tool.run(parsed.data, ctx);
    return { ok: !("error" in result), result };
  } catch (err) {
    return { ok: false, result: { error: err instanceof Error ? err.message : String(err) } };
  }
}

/** JSON schema for the Messages API (`input_schema`). */
export function toolInputSchema(tool: AgentTool): Record<string, unknown> {
  const schema = z.toJSONSchema(tool.schema, { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
  delete schema.$schema;
  return schema;
}
