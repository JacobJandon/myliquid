import { CORE_PRODUCT_BY_SLEEVE, SLEEVE_LABELS, getProduct, isLiquid } from "./catalog";
import { formatPct, formatUsd } from "./money";
import type { RiskProfile } from "./profiles";
import { unlockedUnits } from "./risk";
import type { InvestableSleeve, Lot, OrderIntent, PortfolioSnapshot, Sleeve } from "./types";

/**
 * Atlas's rebalancing plan. Liquid sleeves are traded back to target. Illiquid
 * sleeves are only ever *added to*, and only when under target: you can't sell a
 * lock-up, so Atlas never pretends it can.
 */

export interface SleeveDrift {
  sleeve: Sleeve;
  currentPct: number;
  targetPct: number;
  driftPct: number;
}

export interface RebalancePlan {
  drift: SleeveDrift[];
  trades: (OrderIntent & { reason: string })[];
  notes: string[];
}

export const DRIFT_THRESHOLD = 0.03;
const MIN_TRADE_CENTS = 100_00;

export function planRebalance(
  snapshot: PortfolioSnapshot,
  profile: RiskProfile,
  lots: Lot[],
  /** Products Atlas may buy in illiquid sleeves (e.g. Scout-approved deals and open funds). */
  eligibleIlliquid: string[] = [],
): RebalancePlan {
  const total = snapshot.totalCents;
  const drift: SleeveDrift[] = (Object.keys(profile.targets) as Sleeve[]).map((sleeve) => {
    const currentPct = snapshot.sleeves[sleeve].weight;
    const targetPct = profile.targets[sleeve];
    return { sleeve, currentPct, targetPct, driftPct: currentPct - targetPct };
  });

  const trades: RebalancePlan["trades"] = [];
  const notes: string[] = [];
  if (total <= 0)
    return { drift, trades, notes: ["The portfolio is empty. Deposit cash to get started."] };

  // 1. Sells: trim overweight liquid sleeves (largest unlocked holdings first).
  for (const d of drift) {
    if (d.sleeve === "cash" || d.driftPct <= DRIFT_THRESHOLD) continue;
    let excess = Math.round(d.driftPct * total);
    const liquidHoldings = snapshot.holdings.filter(
      (h) => h.product.sleeve === d.sleeve && isLiquid(h.product),
    );
    if (liquidHoldings.length === 0) {
      notes.push(
        `${SLEEVE_LABELS[d.sleeve]} is ${formatPct(d.driftPct, 1, true)} over target but locked up. Atlas will direct new money elsewhere instead of selling.`,
      );
      continue;
    }
    for (const h of liquidHoldings) {
      if (excess < MIN_TRADE_CENTS) break;
      const sellable = Math.round(unlockedUnits(lots, h.product.id, snapshot.date) * h.price * 100);
      const amount = Math.min(excess, sellable);
      if (amount >= MIN_TRADE_CENTS) {
        trades.push({
          productId: h.product.id,
          side: "sell",
          amountCents: amount,
          reason: `${SLEEVE_LABELS[d.sleeve]} is ${formatPct(d.driftPct, 1, true)} over target`,
        });
        excess -= amount;
      }
    }
  }

  // 2. Buys: fund underweight sleeves from cash above target plus sale proceeds.
  const cashTarget = Math.round(profile.targets.cash * total);
  // Instant-settlement proceeds (e.g. bitcoin) are usable today; T+n proceeds are not.
  const sells = trades.filter((t) => t.side === "sell");
  const instantProceeds = sells
    .filter((t) => getProduct(t.productId)?.liquidity.settlementDays === 0)
    .reduce((s, t) => s + t.amountCents, 0);
  const laterProceeds = sells.reduce((s, t) => s + t.amountCents, 0) - instantProceeds;
  let spendable = Math.max(0, snapshot.cashCents - cashTarget) + instantProceeds;
  if (laterProceeds > 0) {
    notes.push(
      `${formatUsd(laterProceeds)} of sale proceeds settle over the next few days. Run Atlas again afterwards to reinvest them.`,
    );
  }

  // Liquid sleeves are funded before illiquid ones, so new money never gets locked up
  // while the liquid core is still short of target.
  const isIlliquidSleeve = (s: Sleeve) => s === "business" || s === "private";
  const underweight = drift
    .filter((d) => d.sleeve !== "cash" && d.driftPct < -DRIFT_THRESHOLD)
    .sort(
      (a, b) =>
        Number(isIlliquidSleeve(a.sleeve)) - Number(isIlliquidSleeve(b.sleeve)) ||
        a.driftPct - b.driftPct,
    );

  for (const d of underweight) {
    if (spendable < MIN_TRADE_CENTS) break;
    const sleeve = d.sleeve as InvestableSleeve;
    const need = Math.min(Math.round(-d.driftPct * total), spendable);
    const illiquid = sleeve === "business" || sleeve === "private";
    const productId = illiquid
      ? (eligibleIlliquid.find((id) => getProduct(id)?.sleeve === sleeve) ??
        CORE_PRODUCT_BY_SLEEVE[sleeve])
      : CORE_PRODUCT_BY_SLEEVE[sleeve];
    const product = productId ? getProduct(productId) : undefined;
    if (!product) continue;
    if (need < product.minTicketCents) {
      notes.push(
        `${SLEEVE_LABELS[sleeve]} is under target, but the gap is below the ${formatUsd(product.minTicketCents)} minimum for ${product.name}.`,
      );
      continue;
    }
    trades.push({
      productId: product.id,
      side: "buy",
      amountCents: need,
      reason: `${SLEEVE_LABELS[sleeve]} is ${formatPct(d.driftPct, 1, true)} vs target${illiquid ? `; ${product.name} locks for ${product.liquidity.lockupMonths} months` : ""}`,
    });
    spendable -= need;
  }

  if (trades.length === 0)
    notes.push("Every sleeve is within 3 percentage points of target. No trades needed.");
  return { drift, trades, notes };
}
