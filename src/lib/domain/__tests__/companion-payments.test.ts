import { describe, expect, it } from "vitest";
import {
  checkinBonus,
  computeVitals,
  levelForXp,
  levelProgress,
  liquidityQuiz,
  petThought,
  questsForDay,
  stageForLevel,
  streakAfterCheckin,
  type CompanionRecord,
  type PortfolioSignals,
} from "../companion";
import {
  DEFAULT_CARD_POLICY,
  evaluatePayment,
  makeRequestCode,
  normalizeRequestCode,
  requireMerchant,
  type PaymentContext,
} from "../payments";

const NOW = new Date("2026-09-24T12:00:00Z");

const pet = (over: Partial<CompanionRecord> = {}): CompanionRecord => ({
  name: "Drip",
  color: "blue",
  bornAt: "2026-09-20T12:00:00Z",
  xp: 0,
  fullness: 80,
  fullnessAt: NOW.toISOString(),
  energy: 90,
  energyAt: NOW.toISOString(),
  joy: 70,
  joyAt: NOW.toISOString(),
  streak: 0,
  lastCheckinDay: null,
  lastLevel: 1,
  ...over,
});

const signals = (over: Partial<PortfolioSignals> = {}): PortfolioSignals => ({
  criticalAlerts: 0,
  warnAlerts: 0,
  topAlertTitle: null,
  pendingProposals: 0,
  pendingPayments: 0,
  liquidWeekPct: 0.75,
  killSwitch: false,
  circuitBreaker: false,
  holdings: 8,
  walletCents: 0,
  lastPayment: null,
  ...over,
});

describe("companion vitals", () => {
  it("gets hungry in real time and sleeps when agents are paused", () => {
    const hungry = computeVitals(pet({ fullnessAt: "2026-09-23T12:00:00Z" }), signals(), NOW);
    expect(hungry.fullness).toBe(0);
    expect(hungry.mood).toBe("hungry");
    expect(computeVitals(pet(), signals({ killSwitch: true }), NOW).mood).toBe("sleeping");
    expect(
      computeVitals(pet(), signals({ killSwitch: true, circuitBreaker: true }), NOW).mood,
    ).toBe("scared");
  });

  it("feels the portfolio: critical alerts make it anxious, a healthy book makes it happy", () => {
    expect(computeVitals(pet(), signals({ criticalAlerts: 1 }), NOW).mood).toBe("anxious");
    expect(["happy", "ecstatic"]).toContain(computeVitals(pet(), signals(), NOW).mood);
  });

  it("levels up and evolves", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(130)).toBe(3);
    expect(stageForLevel(3).id).toBe("droplet");
    expect(stageForLevel(10).id).toBe("tide");
    expect(levelProgress(80)).toMatchObject({ level: 2, into: 40, span: 80 });
  });

  it("tracks streaks and quests deterministically", () => {
    expect(streakAfterCheckin(null, "2026-09-24", 0)).toBe(1);
    expect(streakAfterCheckin("2026-09-23", "2026-09-24", 4)).toBe(5);
    expect(streakAfterCheckin("2026-09-20", "2026-09-24", 4)).toBe(1);
    expect(streakAfterCheckin("2026-09-24", "2026-09-24", 4)).toBeNull();
    expect(checkinBonus(5)).toBe(4);
    const q = questsForDay("inv_a", "2026-09-24");
    expect(q).toHaveLength(3);
    expect(new Set(q).size).toBe(3);
    expect(questsForDay("inv_a", "2026-09-24")).toEqual(q);
  });

  it("builds a quiz whose answer is the true liquidity", () => {
    const quiz = liquidityQuiz(0.75, "seed");
    expect(quiz.options[quiz.answerIndex]).toBe("75%");
    expect(new Set(quiz.options).size).toBe(3);
  });

  it("speaks from state", () => {
    const v = computeVitals(pet(), signals({ pendingProposals: 2 }), NOW);
    expect(
      petThought({
        name: "Drip",
        vitals: v,
        signals: signals({ pendingProposals: 2 }),
        streak: 1,
        openQuest: null,
        hourSeed: 0,
      }),
    ).toMatch(/2 ideas in your inbox/);
  });
});

describe("agent payment policy", () => {
  const base: PaymentContext = {
    card: DEFAULT_CARD_POLICY,
    walletCents: 100_00,
    spentTodayCents: 0,
    spentMonthCents: 0,
    paymentsLastHour: 0,
    agentsPaused: false,
    merchant: requireMerchant("m_brewlab"),
    amountCents: 5_75,
    firstTimeMerchant: false,
  };

  it("auto-approves a small coffee within policy", () => {
    expect(evaluatePayment(base).decision).toBe("approve");
  });

  it("declines blocked categories, frozen cards and empty wallets", () => {
    expect(
      evaluatePayment({ ...base, merchant: requireMerchant("m_luckystar"), amountCents: 10_00 })
        .decision,
    ).toBe("decline");
    expect(
      evaluatePayment({ ...base, card: { ...DEFAULT_CARD_POLICY, status: "frozen" } }).decision,
    ).toBe("decline");
    expect(evaluatePayment({ ...base, walletCents: 1_00 }).decision).toBe("decline");
    expect(evaluatePayment({ ...base, spentTodayCents: 299_00 }).decision).toBe("decline");
  });

  it("asks the owner above the threshold, for new merchants, fast bursts or a sleeping agent", () => {
    expect(evaluatePayment({ ...base, walletCents: 500_00, amountCents: 80_00 }).decision).toBe(
      "needs_approval",
    );
    expect(evaluatePayment({ ...base, firstTimeMerchant: true, amountCents: 30_00 }).decision).toBe(
      "needs_approval",
    );
    expect(evaluatePayment({ ...base, paymentsLastHour: 5 }).decision).toBe("needs_approval");
    expect(evaluatePayment({ ...base, agentsPaused: true }).decision).toBe("needs_approval");
    // Once the owner approves, only hard rules apply.
    expect(
      evaluatePayment({ ...base, walletCents: 500_00, amountCents: 80_00 }, { ownerApproved: true })
        .decision,
    ).toBe("approve");
    expect(
      evaluatePayment(
        { ...base, amountCents: 250_00, walletCents: 500_00 },
        { ownerApproved: true },
      ).decision,
    ).toBe("decline");
  });

  it("makes and normalizes terminal codes", () => {
    const code = makeRequestCode(() => 0.5);
    expect(code).toMatch(/^LQ-[2-9A-Z]{4}$/);
    expect(normalizeRequestCode(code.toLowerCase().replace("-", " "))).toBe(code);
    expect(normalizeRequestCode("LQ-0000")).toBeNull();
  });
});
