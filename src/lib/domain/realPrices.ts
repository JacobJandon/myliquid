import { addDays } from "./dates";

/**
 * Pricing a product from a real benchmark's daily closes (pure). Prices are as of the previous close, which every
 * feed has published by the time market day D starts (UTC); a weekend or holiday is a flat day.
 * - "moves": a fund keeps its own price level and history and moves like its benchmark: market day D takes the move
 *   from the close on or before D-2 to the close on or before D-1;
 * - "level": an asset that is the benchmark (bitcoin) takes its price: the close on or before D-1.
 */

export interface Close {
  date: string;
  close: number;
}

/** A feed that hasn't answered for longer than this is treated as down, not as a quiet market. */
export const MAX_GAP_DAYS = 5;

function closeAsOf(closes: Close[], date: string): Close | null {
  let found: Close | null = null;
  for (const c of closes) if (c.date <= date && (!found || c.date > found.date)) found = c;
  return found;
}

/** The close that prices market day `date`, or null when the feed wasn't asked on or after it or has gone quiet. */
function priceClose(closes: Close[], date: string, fetchedOn: string | null): Close | null {
  if (!fetchedOn || fetchedOn < date) return null;
  const latest = closeAsOf(closes, addDays(date, -1));
  if (!latest || latest.date < addDays(date, -1 - MAX_GAP_DAYS)) return null;
  return latest;
}

/** The benchmark's move that prices market day `date`, as a ratio (1.01 = up 1%), or null when the closes can't say. */
export function benchmarkMove(
  closes: Close[],
  date: string,
  fetchedOn: string | null,
): number | null {
  const latest = priceClose(closes, date, fetchedOn);
  const before = closeAsOf(closes, addDays(date, -2));
  if (!latest || !before) return null;
  const move = latest.close / before.close;
  return Number.isFinite(move) && move > 0 ? move : null;
}

export type Follow = "moves" | "level";

/** The product's price for market day `date`, following its benchmark, or null to simulate the day. */
export function benchmarkPrice(
  follow: Follow,
  previous: number,
  closes: Close[],
  date: string,
  fetchedOn: string | null,
): { price: number; close: Close } | null {
  const latest = priceClose(closes, date, fetchedOn);
  if (!latest) return null;
  if (follow === "level") return { price: latest.close, close: latest };
  const move = benchmarkMove(closes, date, fetchedOn);
  return move === null ? null : { price: previous * move, close: latest };
}
