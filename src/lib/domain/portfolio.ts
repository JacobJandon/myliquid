import { requireProduct } from "./catalog";
import type { Holding, Lot, PortfolioSnapshot, PricePoint, Sleeve } from "./types";
import { SLEEVES } from "./types";

export interface SnapshotInput {
  date: string;
  cashCents: number;
  pendingCashCents: number;
  lots: Lot[];
  latestPrices: Map<string, PricePoint>;
}

/** Values every lot at its latest price and aggregates by product and sleeve. */
export function buildSnapshot(input: SnapshotInput): PortfolioSnapshot {
  const byProduct = new Map<string, Lot[]>();
  for (const lot of input.lots) {
    if (lot.units <= 1e-9) continue;
    const list = byProduct.get(lot.productId) ?? [];
    list.push(lot);
    byProduct.set(lot.productId, list);
  }

  const holdings: Holding[] = [];
  for (const [productId, lots] of byProduct) {
    const product = requireProduct(productId);
    const point = input.latestPrices.get(productId);
    const price = point?.price ?? product.startPrice;
    let units = 0;
    let costCents = 0;
    let lockedUnits = 0;
    let nextUnlock: string | null = null;
    for (const lot of lots) {
      units += lot.units;
      costCents += lot.costCents;
      if (lot.lockedUntil && lot.lockedUntil > input.date) {
        lockedUnits += lot.units;
        if (!nextUnlock || lot.lockedUntil < nextUnlock) nextUnlock = lot.lockedUntil;
      }
    }
    holdings.push({
      product,
      units,
      price,
      priceDate: point?.date ?? input.date,
      valueCents: Math.round(units * price * 100),
      costCents,
      lockedValueCents: Math.round(lockedUnits * price * 100),
      nextUnlock,
      weight: 0,
    });
  }

  const investedCents = holdings.reduce((sum, h) => sum + h.valueCents, 0);
  const totalCents = investedCents + input.cashCents + input.pendingCashCents;

  const sleeves = Object.fromEntries(
    SLEEVES.map((s) => [s, { valueCents: 0, weight: 0 }]),
  ) as Record<Sleeve, { valueCents: number; weight: number }>;
  sleeves.cash.valueCents = input.cashCents + input.pendingCashCents;
  for (const h of holdings) {
    h.weight = totalCents > 0 ? h.valueCents / totalCents : 0;
    sleeves[h.product.sleeve].valueCents += h.valueCents;
  }
  for (const s of SLEEVES) {
    sleeves[s].weight = totalCents > 0 ? sleeves[s].valueCents / totalCents : 0;
  }

  holdings.sort((a, b) => b.valueCents - a.valueCents);
  return {
    date: input.date,
    cashCents: input.cashCents,
    pendingCashCents: input.pendingCashCents,
    investedCents,
    totalCents,
    holdings,
    sleeves,
  };
}

export function illiquidWeight(snapshot: PortfolioSnapshot): number {
  return snapshot.sleeves.business.weight + snapshot.sleeves.private.weight;
}
