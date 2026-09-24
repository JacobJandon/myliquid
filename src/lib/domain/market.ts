import { addDays, diffDays } from "./dates";
import type { PricePoint, Product } from "./types";

/**
 * Deterministic market simulation. The price of a product on a date depends only on
 * the product, the previous price and the date, so the platform can always rebuild
 * or extend history and tests are reproducible.
 */

/** 53-bit string hash (cyrb53) mapped to (0, 1). */
export function hashToUnit(key: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return (n + 0.5) / 9007199254740992;
}

/** Standard normal draw derived from a key (Box-Muller). */
export function normalFromKey(key: string): number {
  const u1 = hashToUnit(`${key}:u1`);
  const u2 = hashToUnit(`${key}:u2`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const DT = 1 / 365;

/** Next daily price for a market-traded product (geometric Brownian motion with a common factor). */
export function nextMarketPrice(product: Product, prevPrice: number, date: string): number {
  const rho = product.marketCorrelation;
  const zMarket = normalFromKey(`market:${date}`);
  const zOwn = normalFromKey(`${product.id}:${date}`);
  const z = rho * zMarket + Math.sqrt(1 - rho * rho) * zOwn;
  const sigma = product.annualVol;
  const mu = product.annualDrift;
  return prevPrice * Math.exp((mu - 0.5 * sigma * sigma) * DT + sigma * Math.sqrt(DT) * z);
}

/**
 * Appraisal for a privately valued product. Between appraisals the price does not
 * move. On an appraisal date it accrues the expected return plus appraisal noise.
 */
export function nextAppraisal(
  product: Product,
  prevPrice: number,
  date: string,
  daysSince: number,
): number {
  const accrual = Math.pow(1 + product.annualDrift, daysSince / 365);
  const noise =
    product.annualVol *
    Math.sqrt(daysSince / 365) *
    normalFromKey(`${product.id}:appraisal:${date}`);
  return prevPrice * accrual * Math.exp(noise);
}

export function isAppraisalDue(product: Product, lastAppraisalDate: string, date: string): boolean {
  const every = product.valuation.everyDays;
  if (!every) return false;
  return diffDays(lastAppraisalDate, date) >= every;
}

/**
 * Given the last known point for a product, produce the point for `date`, or null
 * when an appraised product is not re-marked that day.
 */
export function simulateNextPoint(
  product: Product,
  last: PricePoint,
  lastAppraisalDate: string,
  date: string,
): PricePoint | null {
  if (product.valuation.source === "market") {
    return { date, price: nextMarketPrice(product, last.price, date), source: "market" };
  }
  if (!isAppraisalDue(product, lastAppraisalDate, date)) return null;
  const days = diffDays(lastAppraisalDate, date);
  return {
    date,
    price: nextAppraisal(product, last.price, date, days),
    source: product.valuation.source,
  };
}

/** Full history from `startDate` to `endDate` inclusive. Only appraisal dates are included for appraised products. */
export function generateHistory(
  product: Product,
  startDate: string,
  endDate: string,
): PricePoint[] {
  const first: PricePoint = {
    date: startDate,
    price: product.startPrice,
    source: product.valuation.source,
  };
  const points: PricePoint[] = [first];
  let last = first;
  let lastAppraisal = startDate;
  for (let date = addDays(startDate, 1); date <= endDate; date = addDays(date, 1)) {
    const next = simulateNextPoint(product, last, lastAppraisal, date);
    if (next) {
      points.push(next);
      last = next;
      if (next.source !== "market") lastAppraisal = date;
    }
  }
  return points;
}
