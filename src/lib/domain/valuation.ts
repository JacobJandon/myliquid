import { diffDays } from "./dates";
import { formatPct } from "./money";
import type { PricePoint, Product, Severity } from "./types";

/**
 * Ledger's rulebook: checks that nobody is "marking their own homework".
 */

export interface ValuationFinding {
  productId: string;
  code: "fresh" | "stale" | "self_marked" | "too_smooth" | "no_mark";
  severity: Severity;
  title: string;
  detail: string;
}

export const STALE_AFTER_DAYS = 35;

/** Annualized growth and volatility of a series of marks. */
export function markStats(points: PricePoint[]): {
  annualizedReturn: number;
  annualizedVol: number;
} {
  if (points.length < 3) return { annualizedReturn: 0, annualizedVol: 0 };
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const years = Math.max(diffDays(first.date, last.date) / 365, 1 / 365);
  const annualizedReturn = Math.pow(last.price / first.price, 1 / years) - 1;
  const logReturns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    logReturns.push(Math.log(points[i]!.price / points[i - 1]!.price));
  }
  const mean = logReturns.reduce((s, r) => s + r, 0) / logReturns.length;
  const variance = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / logReturns.length;
  const periodsPerYear = logReturns.length / years;
  return { annualizedReturn, annualizedVol: Math.sqrt(variance * periodsPerYear) };
}

export function reviewValuation(
  product: Product,
  marks: PricePoint[],
  today: string,
): ValuationFinding[] {
  if (product.valuation.source === "market") return [];
  const findings: ValuationFinding[] = [];
  const last = marks[marks.length - 1];
  if (!last) {
    return [
      {
        productId: product.id,
        code: "no_mark",
        severity: "critical",
        title: `${product.name} has no valuation`,
        detail: "There is no mark on record. Do not rely on its NAV.",
      },
    ];
  }

  const age = diffDays(last.date, today);
  if (age > STALE_AFTER_DAYS) {
    findings.push({
      productId: product.id,
      code: "stale",
      severity: "warn",
      title: `${product.name} mark is ${age} days old`,
      detail: `The last appraisal was ${age} days ago (policy: re-mark within ${STALE_AFTER_DAYS} days). Treat the NAV as indicative.`,
    });
  }

  if (last.source === "originator") {
    findings.push({
      productId: product.id,
      code: "self_marked",
      severity: "critical",
      title: `${product.name} is marked by its originator`,
      detail: `${product.valuation.appraiser ?? "The originator"} values this position itself. MyLiquid requires an independent appraiser.`,
    });
  }

  const recent = marks.slice(-7);
  const stats = markStats(recent);
  if (recent.length >= 5 && stats.annualizedReturn > 0.12 && stats.annualizedVol < 0.01) {
    findings.push({
      productId: product.id,
      code: "too_smooth",
      severity: "critical",
      title: `${product.name} returns look too smooth`,
      detail: `Marks rose ${formatPct(stats.annualizedReturn)} a year with ${formatPct(stats.annualizedVol, 2)} volatility. Returns that smooth usually mean mark-to-model, not mark-to-market.`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      productId: product.id,
      code: "fresh",
      severity: "info",
      title: `${product.name} valuation is current`,
      detail: `Independently appraised ${age} day${age === 1 ? "" : "s"} ago by ${product.valuation.appraiser ?? "an independent appraiser"}.`,
    });
  }
  return findings;
}
