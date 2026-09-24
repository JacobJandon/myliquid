/** Deterministic compact form ("$1.2M", "$250K"). Intl's compact output differs between Node and browsers. */
function compactDollars(abs: number): string {
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const v = abs / size;
      const text = v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
      return `$${text}${suffix}`;
    }
  }
  return `$${abs.toFixed(0)}`;
}

export function formatUsd(cents: number, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const formatted = opts.compact
    ? compactDollars(abs)
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: abs >= 1000 ? 0 : 2,
      }).format(abs);
  if (dollars < 0 && formatted !== "$0") return `-${formatted}`;
  return opts.sign && dollars > 0 ? `+${formatted}` : formatted;
}

export function formatPct(ratio: number, digits = 1, sign = false): string {
  const pct = (ratio * 100).toFixed(digits);
  return sign && ratio > 0 ? `+${pct}%` : `${pct}%`;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: price >= 1000 ? 0 : 2,
  }).format(price);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Parses "$5,000", "5k", "2.5m" or "1200" into cents. Returns null if it isn't a number. */
export function parseAmountToCents(text: string): number | null {
  const match = text.trim().match(/^\$?\s*([\d,]*\.?\d+)\s*([km])?$/i);
  if (!match?.[1]) return null;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult =
    match[2]?.toLowerCase() === "k" ? 1_000 : match[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
  return Math.round(n * mult * 100);
}
