import { formatUsd } from "./money";

/**
 * Outside trading agents (connected over MCP) and what their AINRA identity lets them do. Pure functions only.
 *
 * An unidentified agent only ever proposes: the investor approves each trade. An agent that has identified itself
 * with a fresh AINRA passport may trade on its own when all of these hold:
 * - the investor set its connection to "trade on its own";
 * - its tier is L2 or higher (AINRA's "standard commerce" lane);
 * - its passport declares `myliquid:trade`;
 * - the trade fits its per-trade limit (the investor's, capped by its tier) and its daily limit.
 * Every order still goes through the mandate and Sentinel's pre-trade checks, and the kill switch stops it.
 */

export type TradeMode = "propose" | "auto";

/** The most an agent of each AINRA tier may trade on its own in one order. Below L2: nothing. */
export const TIER_AUTO_CEILING_CENTS: Record<string, number> = {
  L2: 2_500_00,
  L3: 10_000_00,
  L4: 25_000_00,
};

export const MAX_DAILY_LIMIT_CENTS = 100_000_00;

/** What MyLiquid knows about an outside trader when it asks to trade. */
export interface OutsideTrader {
  keyId: string;
  keyName: string;
  /** Set when the key is pinned to an AINRA identity. */
  ainraNumber: string | null;
  ainraName: string | null;
  tier: string | null;
  capabilities: string[];
  /** True while a valid passport presentation is fresh (AINRA's five-minute window). */
  identified: boolean;
  mode: TradeMode;
  perTradeLimitCents: number;
  dailyLimitCents: number;
}

export function tierAutoCeilingCents(tier: string | null): number {
  return (tier && TIER_AUTO_CEILING_CENTS[tier]) || 0;
}

export function declaresTrading(capabilities: string[]): boolean {
  return capabilities.includes("myliquid:trade") || capabilities.includes("myliquid:*");
}

/** The per-trade limit that applies: the investor's, never above the tier's ceiling. */
export function effectivePerTradeLimitCents(trader: OutsideTrader): number {
  return Math.min(trader.perTradeLimitCents, tierAutoCeilingCents(trader.tier));
}

export type AutonomyDecision = { auto: true } | { auto: false; reason: string };

/** Whether an outside trader may place this order on its own, or why it becomes a proposal. */
export function autonomyDecision(
  trader: OutsideTrader,
  amountCents: number,
  usedTodayCents: number,
): AutonomyDecision {
  if (!trader.ainraNumber)
    return {
      auto: false,
      reason: "This key isn't pinned to an AINRA identity, so its trades wait for your approval.",
    };
  if (!trader.identified)
    return {
      auto: false,
      reason: "The agent hasn't presented a fresh AINRA passport, so its trades wait for your approval.",
    };
  if (trader.mode !== "auto")
    return { auto: false, reason: "You set this agent to propose only." };
  const ceiling = tierAutoCeilingCents(trader.tier);
  if (ceiling === 0)
    return {
      auto: false,
      reason: `AINRA tier ${trader.tier ?? "(none)"} can't trade on its own; L2 and up can.`,
    };
  if (!declaresTrading(trader.capabilities))
    return { auto: false, reason: "Its AINRA passport doesn't declare myliquid:trade." };
  const limit = effectivePerTradeLimitCents(trader);
  if (amountCents > limit)
    return {
      auto: false,
      reason:
        limit === ceiling && ceiling < trader.perTradeLimitCents
          ? `Above ${formatUsd(limit)}, the most an ${trader.tier} agent may trade on its own.`
          : `Above its ${formatUsd(limit)} per-trade limit.`,
    };
  if (usedTodayCents + amountCents > trader.dailyLimitCents)
    return {
      auto: false,
      reason: `Would take it past its ${formatUsd(trader.dailyLimitCents)} daily limit (${formatUsd(usedTodayCents)} used today).`,
    };
  return { auto: true };
}

/** Validates the limits an investor sets for an agent, with a reason when they don't make sense. */
export function tradingLimitsError(
  mode: TradeMode,
  perTradeLimitCents: number,
  dailyLimitCents: number,
): string | null {
  if (mode === "propose") return null;
  if (!Number.isFinite(perTradeLimitCents) || perTradeLimitCents < 1_00)
    return "Set a per-trade limit of at least $1.";
  if (perTradeLimitCents > TIER_AUTO_CEILING_CENTS.L4!)
    return `The per-trade limit can be at most ${formatUsd(TIER_AUTO_CEILING_CENTS.L4!)}.`;
  if (!Number.isFinite(dailyLimitCents) || dailyLimitCents < perTradeLimitCents)
    return "The daily limit must be at least the per-trade limit.";
  if (dailyLimitCents > MAX_DAILY_LIMIT_CENTS)
    return `The daily limit can be at most ${formatUsd(MAX_DAILY_LIMIT_CENTS)}.`;
  return null;
}
