import { formatPct } from "./money";
import type { DealFacts } from "./types";
import type { DealVerdict } from "./risk";

/**
 * Scout's red-flag checklist for private deals. It encodes the lessons from the
 * H2O / Windhorst case (see docs/research): circular financing, related parties,
 * self-marked valuations, originator concentration and promised liquidity that
 * the asset can't support.
 */

export interface DiligenceFlag {
  code: string;
  label: string;
  impact: number;
  severity: "positive" | "minor" | "major" | "fatal";
}

export interface DiligenceResult {
  productId: string;
  score: number;
  verdict: DealVerdict;
  flags: DiligenceFlag[];
  memo: string;
}

export function scoreDeal(deal: DealFacts): DiligenceResult {
  const flags: DiligenceFlag[] = [];
  const add = (code: string, label: string, impact: number, severity: DiligenceFlag["severity"]) =>
    flags.push({ code, label, impact, severity });

  if (deal.circularFinancing) {
    add(
      "circular",
      "Proceeds service the originator's other debt (circular financing)",
      -35,
      "fatal",
    );
  }
  if (deal.relatedParty)
    add("related_party", "Related-party relationship with the originator", -25, "major");
  if (!deal.auditedFinancials) add("unaudited", "Financials are not audited", -15, "major");
  if (!deal.independentValuation)
    add("self_marked", "No independent valuation; the originator marks the asset", -15, "major");
  if (deal.originatorExposurePct > 5) {
    add(
      "originator_concentration",
      `Originator is already ${formatPct(deal.originatorExposurePct / 100, 0)} of the private book (limit 5%)`,
      -15,
      "major",
    );
  }
  if (
    deal.offeredLiquidity === "daily" ||
    deal.offeredLiquidity === "instant" ||
    (deal.offeredLiquidity === "quarterly" && deal.termMonths > 24)
  ) {
    add(
      "liquidity_mismatch",
      `Promises ${deal.offeredLiquidity} liquidity on a ${deal.termMonths}-month asset`,
      -20,
      "major",
    );
  }
  if (deal.leverage !== null && deal.leverage > 6) {
    add("leverage", `High leverage: ${deal.leverage.toFixed(1)}x net debt / EBITDA`, -10, "minor");
  }
  if (deal.trackRecordYears < 3)
    add("track_record", `Short track record (${deal.trackRecordYears} years)`, -10, "minor");
  if (deal.targetYieldPct >= 15 && deal.structure !== "equity") {
    add(
      "yield_outlier",
      `${deal.targetYieldPct}% yield on debt is far above comparable deals`,
      -5,
      "minor",
    );
  }

  if (deal.structure === "senior_secured")
    add("secured", "Senior secured with first-lien collateral", 10, "positive");
  if (deal.auditedFinancials && deal.trackRecordYears >= 5)
    add("audited_history", `${deal.trackRecordYears}-year audited track record`, 5, "positive");
  if (deal.independentValuation)
    add("independent_marks", "Marked monthly by an independent appraiser", 5, "positive");

  const raw = 70 + flags.reduce((s, f) => s + f.impact, 0);
  const score = Math.max(0, Math.min(100, raw));
  const fatal =
    flags.some((f) => f.severity === "fatal") || (deal.relatedParty && !deal.auditedFinancials);
  const verdict: DealVerdict =
    fatal || score < 50 ? "reject" : score < 70 ? "watchlist" : "approve";

  return {
    productId: deal.productId,
    score,
    verdict,
    flags,
    memo: writeMemo(deal, score, verdict, flags),
  };
}

function writeMemo(
  deal: DealFacts,
  score: number,
  verdict: DealVerdict,
  flags: DiligenceFlag[],
): string {
  const concerns = flags.filter((f) => f.impact < 0);
  const strengths = flags.filter((f) => f.impact > 0);
  const lines = [
    `**${deal.originator}** · ${deal.sector} · ${deal.structure.replace("_", " ")} · ${deal.termMonths} months · target ${deal.targetYieldPct}%`,
    "",
    deal.summary,
    "",
    `**Score ${score}/100. Verdict: ${verdict.toUpperCase()}.**`,
  ];
  if (strengths.length) lines.push("", "Strengths:", ...strengths.map((f) => `- ${f.label}`));
  if (concerns.length) lines.push("", "Red flags:", ...concerns.map((f) => `- ${f.label}`));
  if (verdict === "reject") {
    lines.push(
      "",
      "This deal cannot be bought on MyLiquid. Its structure matches patterns that have led to frozen funds and losses for investors.",
    );
  } else if (verdict === "watchlist") {
    lines.push("", "Investable, but size it small and watch the next appraisal.");
  }
  return lines.join("\n");
}
