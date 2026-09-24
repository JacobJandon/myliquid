import { addDays, diffDays, nextRedemptionWindow } from "./dates";
import type { Lot, PortfolioSnapshot } from "./types";

/**
 * The liquidity ladder answers one question honestly: "If I asked for all my money
 * back today, how much would I actually have, and when?"
 */

export interface LadderItem {
  label: string;
  productId: string | null;
  valueCents: number;
  availableOn: string;
  note: string;
}

export interface LadderBucket {
  id: string;
  label: string;
  maxDays: number;
  valueCents: number;
  cumulativeCents: number;
  cumulativePct: number;
  items: LadderItem[];
}

export interface PendingCash {
  amountCents: number;
  settleOn: string;
  label: string;
}

const BUCKETS: { id: string; label: string; maxDays: number }[] = [
  { id: "today", label: "Today", maxDays: 0 },
  { id: "week", label: "Within 7 days", maxDays: 7 },
  { id: "quarter", label: "Within 90 days", maxDays: 90 },
  { id: "year", label: "Within 1 year", maxDays: 365 },
  { id: "five", label: "Within 5 years", maxDays: 365 * 5 },
  { id: "later", label: "After 5 years", maxDays: Number.POSITIVE_INFINITY },
];

export function buildLiquidityLadder(
  snapshot: PortfolioSnapshot,
  lots: Lot[],
  pending: PendingCash[],
): LadderBucket[] {
  const today = snapshot.date;
  const items: LadderItem[] = [];

  if (snapshot.cashCents > 0) {
    items.push({
      label: "Cash",
      productId: null,
      valueCents: snapshot.cashCents,
      availableOn: today,
      note: "Available now",
    });
  }
  for (const p of pending) {
    items.push({
      label: p.label,
      productId: null,
      valueCents: p.amountCents,
      availableOn: p.settleOn,
      note: "Settling",
    });
  }

  for (const holding of snapshot.holdings) {
    const { product, price } = holding;
    const terms = product.liquidity;
    for (const lot of lots.filter((l) => l.productId === product.id && l.units > 1e-9)) {
      const valueCents = Math.round(lot.units * price * 100);
      const unlock = lot.lockedUntil && lot.lockedUntil > today ? lot.lockedUntil : today;

      if (terms.redemption === "instant" || terms.redemption === "daily") {
        const on = addDays(unlock, terms.settlementDays);
        items.push({
          label: product.name,
          productId: product.id,
          valueCents,
          availableOn: on,
          note:
            terms.settlementDays === 0
              ? "Sells settle instantly"
              : `Sells settle T+${terms.settlementDays}`,
        });
      } else if (terms.redemption === "quarterly") {
        const window = nextRedemptionWindow(unlock, terms.noticeDays);
        items.push({
          label: product.name,
          productId: product.id,
          valueCents,
          availableOn: addDays(window, terms.settlementDays),
          note: `Quarterly window, ${terms.noticeDays}-day notice, ${Math.round((terms.gatePct ?? 0) * 100)}% gate (requests may be pro-rated)`,
        });
      } else {
        items.push({
          label: product.name,
          productId: product.id,
          valueCents,
          availableOn: addDays(unlock, terms.settlementDays),
          note: lot.lockedUntil ? `Locked until ${lot.lockedUntil}` : "Lock-up ended",
        });
      }
    }
  }

  let cumulative = 0;
  const total = items.reduce((s, i) => s + i.valueCents, 0);
  return BUCKETS.map((bucket, index) => {
    const minDays = index === 0 ? -Infinity : BUCKETS[index - 1]!.maxDays;
    const bucketItems = items.filter((i) => {
      const days = diffDays(today, i.availableOn);
      return days > minDays && days <= bucket.maxDays;
    });
    const valueCents = bucketItems.reduce((s, i) => s + i.valueCents, 0);
    cumulative += valueCents;
    return {
      ...bucket,
      valueCents,
      cumulativeCents: cumulative,
      cumulativePct: total > 0 ? cumulative / total : 0,
      items: bucketItems.sort((a, b) => a.availableOn.localeCompare(b.availableOn)),
    };
  });
}
