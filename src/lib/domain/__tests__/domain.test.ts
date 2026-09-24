import { describe, expect, it } from "vitest";
import { DEALS, PRODUCTS, requireProduct } from "../catalog";
import { addMonths, nextRedemptionWindow, quarterEnd } from "../dates";
import { scoreDeal } from "../diligence";
import { buildLiquidityLadder } from "../liquidity";
import { generateHistory } from "../market";
import { parseAmountToCents } from "../money";
import { buildSnapshot } from "../portfolio";
import { RISK_PROFILES } from "../profiles";
import { planRebalance } from "../rebalance";
import { isBlocked, runPreTradeChecks, runMandateChecks } from "../risk";
import { describeRule, ruleTriggered, type AutopilotRule } from "../signals";
import type { AgentMandate, Lot, PricePoint } from "../types";
import { reviewValuation } from "../valuation";

const TODAY = "2026-09-24";

function snapshotWith(lots: Lot[], cashCents: number, prices: Record<string, number> = {}) {
  const latestPrices = new Map<string, PricePoint>();
  for (const p of PRODUCTS)
    latestPrices.set(p.id, { date: TODAY, price: prices[p.id] ?? p.startPrice, source: "market" });
  return buildSnapshot({ date: TODAY, cashCents, pendingCashCents: 0, lots, latestPrices });
}

function lot(productId: string, dollars: number, lockedUntil: string | null = null): Lot {
  const product = requireProduct(productId);
  return {
    id: `lot-${productId}-${dollars}`,
    productId,
    units: dollars / product.startPrice,
    costCents: dollars * 100,
    acquiredOn: "2025-09-24",
    lockedUntil,
  };
}

describe("dates", () => {
  it("finds quarter ends and redemption windows that respect notice", () => {
    expect(quarterEnd("2026-09-24")).toBe("2026-09-30");
    expect(nextRedemptionWindow("2026-09-24", 0)).toBe("2026-09-30");
    // 90 days' notice from Sep 24 misses the Sep 30 window (6 days away) but makes Dec 31 (98 days).
    expect(nextRedemptionWindow("2026-09-24", 90)).toBe("2026-12-31");
    expect(nextRedemptionWindow("2026-10-15", 90)).toBe("2027-03-31");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("market simulation", () => {
  it("is deterministic and only re-marks appraised products on schedule", () => {
    const btc = requireProduct("BTC");
    expect(generateHistory(btc, "2025-01-01", "2025-03-01")).toEqual(
      generateHistory(btc, "2025-01-01", "2025-03-01"),
    );
    const credit = requireProduct("MLPC");
    const marks = generateHistory(credit, "2025-01-01", "2025-12-31");
    expect(marks.length).toBeGreaterThanOrEqual(12);
    expect(marks.length).toBeLessThanOrEqual(14);
  });
});

describe("money", () => {
  it("parses loose amounts", () => {
    expect(parseAmountToCents("$5,000")).toBe(500_000);
    expect(parseAmountToCents("2.5k")).toBe(250_000);
    expect(parseAmountToCents("abc")).toBeNull();
  });
});

describe("liquidity ladder", () => {
  it("puts locked lots after their lock-up and daily funds within a week", () => {
    const lots = [lot("MLWX", 10_000), lot("MLPC", 10_000, "2030-01-01"), lot("MLMS", 5_000)];
    const snap = snapshotWith(lots, 1_000_00);
    const ladder = buildLiquidityLadder(snap, lots, []);
    const byId = Object.fromEntries(ladder.map((b) => [b.id, b]));
    expect(byId.today!.valueCents).toBe(1_000_00);
    expect(byId.week!.valueCents).toBe(10_000_00);
    expect(byId.five!.valueCents).toBe(10_000_00);
    // MLMS needs 90 days' notice, so its window lands after the first quarter.
    expect(byId.year!.valueCents).toBe(5_000_00);
    expect(ladder[ladder.length - 1]!.cumulativePct).toBeCloseTo(1, 5);
  });
});

describe("Sentinel pre-trade checks", () => {
  const profile = RISK_PROFILES.balanced;

  it("blocks buying a rejected deal and selling locked lots", () => {
    const lots = [lot("MLPC", 20_000, "2030-01-01")];
    const snap = snapshotWith(lots, 50_000_00);
    const buyBad = runPreTradeChecks({
      today: TODAY,
      snapshot: snap,
      lots,
      profile,
      actor: "user",
      kycVerified: true,
      dealVerdict: "reject",
      order: { productId: "DL-NORDHAVN", side: "buy", amountCents: 1_000_00 },
    });
    expect(isBlocked(buyBad)).toBe(true);
    const sellLocked = runPreTradeChecks({
      today: TODAY,
      snapshot: snap,
      lots,
      profile,
      actor: "user",
      kycVerified: true,
      order: { productId: "MLPC", side: "sell", amountCents: 1_000_00 },
    });
    expect(sellLocked.find((c) => c.id === "lockup")?.status).toBe("block");
  });

  it("enforces bitcoin, illiquid and single-deal limits", () => {
    const lots = [lot("MLWX", 90_000)];
    const snap = snapshotWith(lots, 10_000_00); // $100k total
    const check = (productId: string, dollars: number) =>
      runPreTradeChecks({
        today: TODAY,
        snapshot: snap,
        lots,
        profile,
        actor: "user",
        kycVerified: true,
        dealVerdict: "approve",
        order: { productId, side: "buy", amountCents: dollars * 100 },
      });
    expect(check("BTC", 4_000).find((c) => c.id === "bitcoin")?.status).toBe("pass");
    expect(check("BTC", 6_000).find((c) => c.id === "bitcoin")?.status).toBe("block");
    expect(check("DL-HARBOR", 6_000).find((c) => c.id === "concentration")?.status).toBe("block");
    expect(check("DL-HARBOR", 5_000).find((c) => c.id === "concentration")?.status).toBe("pass");
  });

  it("applies the agent mandate only to autonomous orders", () => {
    const mandate: AgentMandate = {
      autonomy: "bounded",
      autoExecuteLimitCents: 1_000_00,
      agentBudgetCents: 5_000_00,
      perOrderCapCents: 2_000_00,
      dailyCapCents: 3_000_00,
      maxOrdersPerDay: 2,
      allowedSleeves: ["index", "bitcoin"],
      readOnly: false,
      killSwitch: false,
      killReason: null,
      circuitBreakerPct: 0.05,
      disabledAgents: [],
    };
    const ctx = { mandate, ordersToday: 0, notionalTodayCents: 0, budgetUsedCents: 0 };
    expect(
      isBlocked(
        runMandateChecks(
          "quant",
          { productId: "MLWX", side: "buy", amountCents: 1_500_00 },
          "index",
          ctx,
        ),
      ),
    ).toBe(false);
    expect(
      isBlocked(
        runMandateChecks(
          "quant",
          { productId: "MLQM", side: "buy", amountCents: 1_500_00 },
          "trading",
          ctx,
        ),
      ),
    ).toBe(true);
    expect(
      isBlocked(
        runMandateChecks(
          "quant",
          { productId: "MLWX", side: "buy", amountCents: 2_500_00 },
          "index",
          ctx,
        ),
      ),
    ).toBe(true);
    expect(
      isBlocked(
        runMandateChecks(
          "quant",
          { productId: "MLWX", side: "buy", amountCents: 100_00 },
          "index",
          { ...ctx, mandate: { ...mandate, killSwitch: true } },
        ),
      ),
    ).toBe(true);
    expect(
      isBlocked(
        runMandateChecks(
          "quant",
          { productId: "MLWX", side: "buy", amountCents: 100_00 },
          "index",
          { ...ctx, ordersToday: 2 },
        ),
      ),
    ).toBe(true);
  });
});

describe("Scout diligence", () => {
  it("rejects the circular, self-marked shipyard bond and approves the senior secured loan", () => {
    const results = Object.fromEntries(DEALS.map((d) => [d.productId, scoreDeal(d)]));
    expect(results["DL-NORDHAVN"]!.verdict).toBe("reject");
    expect(results["DL-NORDHAVN"]!.flags.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        "circular",
        "related_party",
        "self_marked",
        "originator_concentration",
        "liquidity_mismatch",
      ]),
    );
    expect(results["DL-HARBOR"]!.verdict).toBe("approve");
    expect(results["DL-BAKE"]!.verdict).toBe("watchlist");
  });
});

describe("Ledger valuation review", () => {
  it("flags originator marks, stale marks and too-smooth returns", () => {
    const bond = requireProduct("DL-NORDHAVN");
    const marks = generateHistory(bond, "2025-09-24", TODAY);
    const codes = reviewValuation(bond, marks, TODAY).map((f) => f.code);
    expect(codes).toContain("self_marked");
    expect(codes).toContain("too_smooth");

    const credit = requireProduct("MLPC");
    const stale = reviewValuation(
      credit,
      [{ date: "2026-07-01", price: 10, source: "independent" }],
      TODAY,
    );
    expect(stale.map((f) => f.code)).toContain("stale");
  });
});

describe("Atlas rebalance", () => {
  it("trims overweight liquid sleeves and never sells locked sleeves", () => {
    const lots = [lot("BTC", 20_000), lot("MLWX", 40_000), lot("MLPC", 30_000, "2030-01-01")];
    const snap = snapshotWith(lots, 10_000_00);
    const plan = planRebalance(snap, RISK_PROFILES.balanced, lots, ["MLPC"]);
    expect(plan.trades.some((t) => t.productId === "BTC" && t.side === "sell")).toBe(true);
    expect(plan.trades.some((t) => t.productId === "MLPC" && t.side === "sell")).toBe(false);
    expect(plan.trades.some((t) => t.productId === "MLWX" && t.side === "buy")).toBe(true);
  });
});

describe("autopilot rules", () => {
  it("evaluates conditions", () => {
    const rule: AutopilotRule = {
      id: "r",
      name: "dip",
      productId: "BTC",
      condition: "price_below",
      threshold: 50_000,
      action: "buy",
      amountCents: 1_000_00,
      status: "active",
      lastTriggeredOn: null,
    };
    expect(ruleTriggered(rule, { price: 49_000, drawdownFromHigh: -0.2, weight: 0.05 })).toBe(true);
    expect(ruleTriggered(rule, { price: 51_000, drawdownFromHigh: -0.2, weight: 0.05 })).toBe(
      false,
    );
    expect(describeRule(rule)).toBe("When BTC price falls below $50,000, buy $1,000");
    expect(describeRule({ ...rule, condition: "drawdown_below", threshold: -0.2 })).toBe(
      "When BTC falls 20% from its 1-year high, buy $1,000",
    );
  });
});
