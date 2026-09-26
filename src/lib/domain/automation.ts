import { addDays, addMonths } from "./dates";
import type { Product } from "./types";

/**
 * Standing instructions the investor gives the platform: recurring investments
 * (buy a fixed amount on a schedule) and limit orders (buy or sell once the price
 * reaches a level). Both are executed by the market clock through the normal
 * order path, so every fill passes Sentinel's pre-trade checks. Pure functions only.
 */

export type Cadence = "weekly" | "biweekly" | "monthly";

export const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

/** The next run after `from`. Monthly plans keep their day of the month. */
export function nextRunOn(cadence: Cadence, from: string): string {
  if (cadence === "weekly") return addDays(from, 7);
  if (cadence === "biweekly") return addDays(from, 14);
  return addMonths(from, 1);
}

/**
 * The next run on or after `today` for a plan whose schedule fell behind (for
 * example after being paused): step forward until the date is not in the past.
 */
export function catchUpRunOn(cadence: Cadence, scheduled: string, today: string): string {
  let next = scheduled;
  for (let i = 0; i < 400 && next < today; i++) next = nextRunOn(cadence, next);
  return next;
}

/** Limit orders stay open this long before they expire. */
export const LIMIT_ORDER_DAYS = 90;

export const MIN_STANDING_ORDER_CENTS = 10_00;
export const MAX_STANDING_ORDER_CENTS = 100_000_00;

/** A buy fills at or below the limit; a sell fills at or above it. */
export function limitTriggered(side: "buy" | "sell", price: number, limitPrice: number): boolean {
  return side === "buy" ? price <= limitPrice : price >= limitPrice;
}

/**
 * Standing orders need a live market price and daily liquidity: appraised,
 * gated or locked products can't be traded against a price level or on a schedule.
 */
export function supportsStandingOrders(product: Product): boolean {
  return (
    product.valuation.source === "market" &&
    (product.liquidity.redemption === "daily" || product.liquidity.redemption === "instant")
  );
}

/** Rejects amounts outside the standing-order range, with a reason. */
export function standingOrderAmountError(amountCents: number): string | null {
  if (!Number.isFinite(amountCents) || amountCents < MIN_STANDING_ORDER_CENTS)
    return "The minimum is $10.";
  if (amountCents > MAX_STANDING_ORDER_CENTS) return "The maximum is $100,000.";
  return null;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

/** One CSV field, quoted when needed (RFC 4180). */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}
