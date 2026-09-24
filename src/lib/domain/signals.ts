import type { PricePoint } from "./types";

/**
 * Quant's signals and autopilot rule engine.
 */

export interface MomentumSignal {
  last: number;
  sma20: number;
  sma60: number;
  signal: "uptrend" | "downtrend" | "neutral";
  /** (sma20 / sma60 - 1), a simple measure of trend strength. */
  strength: number;
  drawdownFromHigh: number;
}

function sma(values: number[], n: number): number {
  const slice = values.slice(-n);
  return slice.reduce((s, v) => s + v, 0) / Math.max(slice.length, 1);
}

export function momentumSignal(points: PricePoint[]): MomentumSignal {
  const prices = points.map((p) => p.price);
  const last = prices[prices.length - 1] ?? 0;
  const sma20 = sma(prices, 20);
  const sma60 = sma(prices, 60);
  const strength = sma60 > 0 ? sma20 / sma60 - 1 : 0;
  const high = Math.max(...prices.slice(-252), last);
  const signal = strength > 0.01 ? "uptrend" : strength < -0.01 ? "downtrend" : "neutral";
  return { last, sma20, sma60, signal, strength, drawdownFromHigh: high > 0 ? last / high - 1 : 0 };
}

export type RuleCondition =
  "price_below" | "price_above" | "drawdown_below" | "weight_above" | "weight_below";

export interface AutopilotRule {
  id: string;
  name: string;
  productId: string;
  condition: RuleCondition;
  /** Price in dollars, or a ratio for drawdown/weight conditions (e.g. -0.2, 0.08). */
  threshold: number;
  action: "buy" | "sell";
  amountCents: number;
  status: "active" | "paused";
  lastTriggeredOn: string | null;
}

export interface RuleContext {
  price: number;
  drawdownFromHigh: number;
  weight: number;
}

export function ruleTriggered(rule: AutopilotRule, ctx: RuleContext): boolean {
  switch (rule.condition) {
    case "price_below":
      return ctx.price < rule.threshold;
    case "price_above":
      return ctx.price > rule.threshold;
    case "drawdown_below":
      return ctx.drawdownFromHigh < rule.threshold;
    case "weight_above":
      return ctx.weight > rule.threshold;
    case "weight_below":
      return ctx.weight < rule.threshold;
  }
}

/** Rules fire at most once every 7 days so a condition that stays true doesn't spam orders. */
export const RULE_COOLDOWN_DAYS = 7;

export function describeRule(
  rule: Pick<AutopilotRule, "productId" | "condition" | "threshold" | "action" | "amountCents">,
): string {
  const amount = `$${(rule.amountCents / 100).toLocaleString("en-US")}`;
  const cond =
    rule.condition === "price_below"
      ? `price falls below $${rule.threshold.toLocaleString("en-US")}`
      : rule.condition === "price_above"
        ? `price rises above $${rule.threshold.toLocaleString("en-US")}`
        : rule.condition === "drawdown_below"
          ? `falls ${Math.abs(rule.threshold * 100).toFixed(0)}% from its 1-year high`
          : rule.condition === "weight_above"
            ? `grows above ${(rule.threshold * 100).toFixed(0)}% of the portfolio`
            : `shrinks below ${(rule.threshold * 100).toFixed(0)}% of the portfolio`;
  return `When ${rule.productId} ${cond}, ${rule.action} ${amount}`;
}
