/** Date helpers. All platform dates are ISO calendar dates (YYYY-MM-DD) in UTC. */

const DAY_MS = 86_400_000;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(iso).getTime() + days * DAY_MS));
}

export function addMonths(iso: string, months: number): string {
  const d = parseIsoDate(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return toIsoDate(d);
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / DAY_MS);
}

/** The last day of the calendar quarter containing `iso`. */
export function quarterEnd(iso: string): string {
  const d = parseIsoDate(iso);
  const q = Math.floor(d.getUTCMonth() / 3);
  return toIsoDate(new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0)));
}

/**
 * The first quarter-end redemption window a request placed on `iso` can make,
 * given the product's notice period.
 */
export function nextRedemptionWindow(iso: string, noticeDays: number): string {
  let window = quarterEnd(iso);
  while (diffDays(iso, window) < noticeDays) {
    window = quarterEnd(addDays(window, 1));
  }
  return window;
}

export function isQuarterEnd(iso: string): boolean {
  return quarterEnd(iso) === iso;
}

export function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
