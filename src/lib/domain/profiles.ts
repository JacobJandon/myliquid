import type { RiskProfileId, Sleeve } from "./types";

export interface RiskProfile {
  id: RiskProfileId;
  label: string;
  description: string;
  /** Target weight per sleeve. Sums to 1. */
  targets: Record<Sleeve, number>;
  limits: {
    /** Max share of the portfolio in business + private sleeves. */
    maxIlliquidPct: number;
    maxBitcoinPct: number;
    /** Max share of the portfolio in any single private deal or originator. */
    maxSingleDealPct: number;
    minCashPct: number;
  };
}

export const RISK_PROFILES: Record<RiskProfileId, RiskProfile> = {
  conservative: {
    id: "conservative",
    label: "Conservative",
    description: "Capital preservation first. Mostly index funds, very little locked up.",
    targets: { cash: 0.08, index: 0.7, trading: 0.1, bitcoin: 0.02, business: 0.05, private: 0.05 },
    limits: { maxIlliquidPct: 0.1, maxBitcoinPct: 0.02, maxSingleDealPct: 0.02, minCashPct: 0.05 },
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    description: "Growth with a liquid core. Up to a quarter of the portfolio in private markets.",
    targets: { cash: 0.05, index: 0.5, trading: 0.15, bitcoin: 0.05, business: 0.1, private: 0.15 },
    limits: { maxIlliquidPct: 0.25, maxBitcoinPct: 0.05, maxSingleDealPct: 0.05, minCashPct: 0.03 },
  },
  growth: {
    id: "growth",
    label: "Growth",
    description:
      "Long horizon. Accepts more volatility and longer lock-ups for higher expected returns.",
    targets: { cash: 0.03, index: 0.4, trading: 0.17, bitcoin: 0.08, business: 0.12, private: 0.2 },
    limits: { maxIlliquidPct: 0.35, maxBitcoinPct: 0.1, maxSingleDealPct: 0.05, minCashPct: 0.02 },
  },
  aggressive: {
    id: "aggressive",
    label: "Aggressive",
    description: "Maximum long-term growth. Large drawdowns and long lock-ups are acceptable.",
    targets: {
      cash: 0.02,
      index: 0.28,
      trading: 0.2,
      bitcoin: 0.12,
      business: 0.15,
      private: 0.23,
    },
    limits: { maxIlliquidPct: 0.45, maxBitcoinPct: 0.15, maxSingleDealPct: 0.05, minCashPct: 0.01 },
  },
};

export function getRiskProfile(id: string): RiskProfile {
  return RISK_PROFILES[id as RiskProfileId] ?? RISK_PROFILES.balanced;
}
