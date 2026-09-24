import { SLEEVE_LABELS, requireProduct } from "./catalog";
import { formatDate } from "./dates";
import { formatPct, formatUsd } from "./money";
import { illiquidWeight } from "./portfolio";
import type { RiskProfile } from "./profiles";
import type {
  Actor,
  AgentId,
  AgentMandate,
  CheckResult,
  Lot,
  OrderIntent,
  PortfolioSnapshot,
  Severity,
  Sleeve,
} from "./types";
import { ILLIQUID_SLEEVES } from "./types";

/**
 * Sentinel's rulebook. Pure functions: every order from a human, an agent, an
 * autopilot rule or an external API goes through `runPreTradeChecks` before it
 * touches the ledger.
 */

export type DealVerdict = "approve" | "watchlist" | "reject";

export interface AutonomyContext {
  mandate: AgentMandate;
  ordersToday: number;
  notionalTodayCents: number;
  budgetUsedCents: number;
}

export interface PreTradeContext {
  today: string;
  snapshot: PortfolioSnapshot;
  lots: Lot[];
  profile: RiskProfile;
  order: OrderIntent;
  actor: Actor;
  kycVerified: boolean;
  /** Scout's verdict when the product is a private deal. */
  dealVerdict?: DealVerdict | null;
  /** Present when the order would execute without a human approving it. */
  autonomous?: AutonomyContext;
}

const pass = (id: string, label: string, detail: string): CheckResult => ({
  id,
  label,
  status: "pass",
  detail,
});
const warn = (id: string, label: string, detail: string): CheckResult => ({
  id,
  label,
  status: "warn",
  detail,
});
const block = (id: string, label: string, detail: string): CheckResult => ({
  id,
  label,
  status: "block",
  detail,
});

export function unlockedUnits(lots: Lot[], productId: string, today: string): number {
  return lots
    .filter((l) => l.productId === productId && (!l.lockedUntil || l.lockedUntil <= today))
    .reduce((s, l) => s + l.units, 0);
}

export function nextUnlockDate(lots: Lot[], productId: string, today: string): string | null {
  const dates = lots
    .filter(
      (l) => l.productId === productId && l.lockedUntil && l.lockedUntil > today && l.units > 1e-9,
    )
    .map((l) => l.lockedUntil as string)
    .sort();
  return dates[0] ?? null;
}

export function runPreTradeChecks(ctx: PreTradeContext): CheckResult[] {
  const { order, snapshot, profile } = ctx;
  const product = requireProduct(order.productId);
  const checks: CheckResult[] = [];
  const total = snapshot.totalCents;
  const holding = snapshot.holdings.find((h) => h.product.id === product.id);
  const price = holding?.price ?? product.startPrice;

  // Identity and product eligibility
  checks.push(
    ctx.kycVerified
      ? pass("kyc", "Identity verified", "KYC is complete.")
      : block("kyc", "Identity verified", "Finish identity verification before trading."),
  );

  if (product.status !== "open") {
    checks.push(block("product_open", "Product open", `${product.name} is closed to new orders.`));
  } else if (product.kind === "deal" && order.side === "buy") {
    if (ctx.dealVerdict === "reject") {
      checks.push(
        block("diligence", "Scout diligence", "Scout rejected this deal. It cannot be purchased."),
      );
    } else if (ctx.dealVerdict === "watchlist") {
      checks.push(
        warn(
          "diligence",
          "Scout diligence",
          "Scout put this deal on the watchlist. Read the memo first.",
        ),
      );
    } else if (!ctx.dealVerdict) {
      checks.push(warn("diligence", "Scout diligence", "Scout has not reviewed this deal yet."));
    } else {
      checks.push(pass("diligence", "Scout diligence", "Scout approved this deal."));
    }
  } else {
    checks.push(pass("product_open", "Product open", `${product.name} is accepting orders.`));
  }

  // Amount sanity
  if (!Number.isFinite(order.amountCents) || order.amountCents <= 0) {
    checks.push(block("amount", "Order amount", "The amount must be greater than zero."));
    return checks;
  }
  if (order.side === "buy" && order.amountCents < product.minTicketCents) {
    checks.push(
      block(
        "min_ticket",
        "Minimum investment",
        `${product.name} has a minimum of ${formatUsd(product.minTicketCents)}.`,
      ),
    );
  }

  // Funds / units available
  if (order.side === "buy") {
    checks.push(
      order.amountCents <= snapshot.cashCents
        ? pass("cash", "Available cash", `${formatUsd(snapshot.cashCents)} available.`)
        : block(
            "cash",
            "Available cash",
            `Needs ${formatUsd(order.amountCents)} but only ${formatUsd(snapshot.cashCents)} is available.`,
          ),
    );
  } else {
    const sellableCents = Math.round(unlockedUnits(ctx.lots, product.id, ctx.today) * price * 100);
    const unlock = nextUnlockDate(ctx.lots, product.id, ctx.today);
    if (sellableCents <= 0) {
      checks.push(
        block(
          "lockup",
          "Lock-up",
          unlock
            ? `Every lot is locked. The first unlocks on ${formatDate(unlock)}.`
            : `You don't hold any ${product.name}.`,
        ),
      );
    } else if (order.amountCents > sellableCents + 1) {
      checks.push(
        block(
          "lockup",
          "Lock-up",
          `Only ${formatUsd(sellableCents)} is unlocked${unlock ? ` (next unlock ${formatDate(unlock)})` : ""}.`,
        ),
      );
    } else {
      checks.push(
        pass("lockup", "Lock-up", `${formatUsd(sellableCents)} is unlocked and sellable.`),
      );
    }
    if (product.liquidity.redemption === "quarterly") {
      checks.push(
        warn(
          "gate",
          "Redemption gate",
          `This queues for the next quarterly window. If requests exceed ${formatPct(product.liquidity.gatePct ?? 0, 0)} of fund NAV, fills are pro-rated.`,
        ),
      );
    }
  }

  // Suitability after the trade
  if (order.side === "buy" && total > 0) {
    const sleeve = product.sleeve;
    if ((ILLIQUID_SLEEVES as readonly Sleeve[]).includes(sleeve)) {
      const after = illiquidWeight(snapshot) + order.amountCents / total;
      checks.push(
        after <= profile.limits.maxIlliquidPct + 1e-9
          ? pass(
              "illiquid",
              "Illiquid limit",
              `Illiquid share would be ${formatPct(after)} (limit ${formatPct(profile.limits.maxIlliquidPct, 0)}).`,
            )
          : block(
              "illiquid",
              "Illiquid limit",
              `Illiquid share would reach ${formatPct(after)}, above the ${profile.label} limit of ${formatPct(profile.limits.maxIlliquidPct, 0)}.`,
            ),
      );
    }
    if (sleeve === "bitcoin") {
      const after = snapshot.sleeves.bitcoin.weight + order.amountCents / total;
      checks.push(
        after <= profile.limits.maxBitcoinPct + 1e-9
          ? pass(
              "bitcoin",
              "Bitcoin limit",
              `Bitcoin would be ${formatPct(after)} (limit ${formatPct(profile.limits.maxBitcoinPct, 0)}).`,
            )
          : block(
              "bitcoin",
              "Bitcoin limit",
              `Bitcoin would reach ${formatPct(after)}, above the ${profile.label} limit of ${formatPct(profile.limits.maxBitcoinPct, 0)}.`,
            ),
      );
    }
    if (product.kind === "deal") {
      const after = ((holding?.valueCents ?? 0) + order.amountCents) / total;
      checks.push(
        after <= profile.limits.maxSingleDealPct + 1e-9
          ? pass(
              "concentration",
              "Single-deal limit",
              `This deal would be ${formatPct(after)} of the portfolio (limit ${formatPct(profile.limits.maxSingleDealPct, 0)}).`,
            )
          : block(
              "concentration",
              "Single-deal limit",
              `This deal would be ${formatPct(after)} of the portfolio. No single originator may exceed ${formatPct(profile.limits.maxSingleDealPct, 0)}.`,
            ),
      );
    }
    const cashAfter = (snapshot.cashCents - order.amountCents) / total;
    if (cashAfter < profile.limits.minCashPct) {
      const detail = `Cash would fall to ${formatPct(cashAfter)}, below the ${formatPct(profile.limits.minCashPct, 0)} buffer.`;
      checks.push(
        ctx.autonomous
          ? block("cash_buffer", "Cash buffer", detail)
          : warn("cash_buffer", "Cash buffer", detail),
      );
    }
  }

  // Agent mandate: only when nobody is approving the order
  if (ctx.autonomous) {
    checks.push(...runMandateChecks(ctx.actor, order, product.sleeve, ctx.autonomous));
  }

  return checks;
}

export function runMandateChecks(
  actor: Actor,
  order: OrderIntent,
  sleeve: Sleeve,
  ctx: AutonomyContext,
): CheckResult[] {
  const { mandate } = ctx;
  const checks: CheckResult[] = [];
  if (mandate.killSwitch) {
    checks.push(
      block(
        "kill_switch",
        "Kill switch",
        `All agents are paused${mandate.killReason ? `: ${mandate.killReason}` : ""}.`,
      ),
    );
  }
  if (
    actor !== "user" &&
    actor !== "autopilot" &&
    mandate.disabledAgents.includes(actor as AgentId)
  ) {
    checks.push(block("agent_enabled", "Agent enabled", `${actor} is disabled in your settings.`));
  }
  if (mandate.readOnly) {
    checks.push(
      block("read_only", "Read-only mode", "Agents are in read-only mode and cannot trade."),
    );
  }
  if (sleeve !== "cash" && !mandate.allowedSleeves.includes(sleeve)) {
    checks.push(
      block("whitelist", "Allowed sleeves", `Agents may not trade ${SLEEVE_LABELS[sleeve]}.`),
    );
  }
  if (order.amountCents > mandate.perOrderCapCents) {
    checks.push(
      block(
        "per_order_cap",
        "Per-order cap",
        `Above the ${formatUsd(mandate.perOrderCapCents)} per-order cap.`,
      ),
    );
  }
  if (ctx.notionalTodayCents + order.amountCents > mandate.dailyCapCents) {
    checks.push(
      block(
        "daily_cap",
        "Daily cap",
        `Would take today's agent volume to ${formatUsd(ctx.notionalTodayCents + order.amountCents)} (cap ${formatUsd(mandate.dailyCapCents)}).`,
      ),
    );
  }
  if (ctx.ordersToday + 1 > mandate.maxOrdersPerDay) {
    checks.push(
      block(
        "rate_limit",
        "Order rate limit",
        `Agents already placed ${ctx.ordersToday} orders today (max ${mandate.maxOrdersPerDay}).`,
      ),
    );
  }
  if (order.side === "buy" && ctx.budgetUsedCents + order.amountCents > mandate.agentBudgetCents) {
    checks.push(
      block(
        "budget",
        "Agent budget",
        `Would use ${formatUsd(ctx.budgetUsedCents + order.amountCents)} of the ${formatUsd(mandate.agentBudgetCents)} agent budget.`,
      ),
    );
  }
  if (checks.length === 0) {
    checks.push(pass("mandate", "Agent mandate", "Within every mandate limit."));
  }
  return checks;
}

export function isBlocked(checks: CheckResult[]): boolean {
  return checks.some((c) => c.status === "block");
}

// ── Portfolio-level review ───────────────────────────────────────────────────

export interface RiskFinding {
  code: string;
  severity: Severity;
  title: string;
  detail: string;
  productId?: string;
}

/** Portfolio reviews ignore breaches smaller than the 0.1% display precision. */
const REVIEW_TOLERANCE = 0.0005;

export function reviewPortfolioRisk(
  snapshot: PortfolioSnapshot,
  profile: RiskProfile,
  liquidWithinWeekPct: number,
): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const { limits } = profile;

  const illiquid = illiquidWeight(snapshot);
  if (illiquid > limits.maxIlliquidPct + REVIEW_TOLERANCE) {
    findings.push({
      code: "illiquid_limit",
      severity: "critical",
      title: "Illiquid share above limit",
      detail: `${formatPct(illiquid)} is locked up or gated, above the ${profile.label} limit of ${formatPct(limits.maxIlliquidPct, 0)}. New money should go to liquid sleeves.`,
    });
  }

  const btc = snapshot.sleeves.bitcoin.weight;
  if (btc > limits.maxBitcoinPct + REVIEW_TOLERANCE) {
    findings.push({
      code: "bitcoin_limit",
      severity: "warn",
      title: "Bitcoin above limit",
      detail: `Bitcoin is ${formatPct(btc)} of the portfolio, above the ${formatPct(limits.maxBitcoinPct, 0)} limit. Consider trimming.`,
      productId: "BTC",
    });
  }

  for (const h of snapshot.holdings) {
    if (h.product.kind === "deal" && h.weight > limits.maxSingleDealPct + REVIEW_TOLERANCE) {
      findings.push({
        code: "deal_concentration",
        severity: "warn",
        title: `${h.product.name} above single-deal limit`,
        detail: `${formatPct(h.weight)} of the portfolio, above the ${formatPct(limits.maxSingleDealPct, 0)} limit.`,
        productId: h.product.id,
      });
    }
  }

  const cash = snapshot.sleeves.cash.weight;
  if (cash < limits.minCashPct - REVIEW_TOLERANCE) {
    findings.push({
      code: "cash_buffer",
      severity: "warn",
      title: "Cash buffer is thin",
      detail: `Cash is ${formatPct(cash)}, below the ${formatPct(limits.minCashPct, 0)} buffer.`,
    });
  }

  findings.push({
    code: "liquidity_summary",
    severity: "info",
    title: "Liquidity check",
    detail: `${formatPct(liquidWithinWeekPct)} of the portfolio could be cash within 7 days. ${formatPct(illiquid)} is in locked or gated products.`,
  });

  return findings;
}
