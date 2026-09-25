import { describe, expect, it } from "vitest";
import {
  checkinBonus,
  computeVitals,
  levelForXp,
  ageInDays,
  attentionReason,
  hearts,
  levelProgress,
  messCount,
  petThought,
  playQuiz,
  questsForDay,
  quizKinds,
  researchSnacks,
  stageForLevel,
  streakAfterCheckin,
  type CompanionRecord,
  type PortfolioSignals,
  type QuizFacts,
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

  it("plays quizzes about the real portfolio, always with a true answer", () => {
    const facts: QuizFacts = {
      liquidWeekPct: 0.75,
      cashPct: 0.13,
      holdings: [
        { name: "Global Equity Index", weight: 0.28 },
        { name: "Private Credit Fund I", weight: 0.12 },
        { name: "Bitcoin", weight: 0.05 },
      ],
    };
    expect(quizKinds(facts)).toEqual(["liquidity", "cash", "largest"]);
    expect(quizKinds({ ...facts, holdings: [] })).toEqual(["liquidity"]);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const quiz = playQuiz(facts, `seed-${i}`);
      seen.add(quiz.kind);
      expect(new Set(quiz.options).size).toBe(3);
      const answer = quiz.options[quiz.answerIndex];
      if (quiz.kind === "liquidity") expect(answer).toBe("75%");
      if (quiz.kind === "cash") expect(answer).toBe("13%");
      if (quiz.kind === "largest") expect(answer).toBe("Global Equity Index");
      expect(quiz.explanation.length).toBeGreaterThan(20);
    }
    expect(seen.size).toBe(3);
  });

  it("serves true research snacks and Tamagotchi-style stats", () => {
    const snacks = researchSnacks({
      totalCents: 262_158_00,
      dayChangeCents: -3_246_00,
      liquidWeekPct: 0.75,
      cashCents: 34_000_00,
      topHolding: { name: "Global Equity Index", weight: 0.277 },
      lockedPositions: 2,
      nextUnlock: "2029-09-24",
      pendingProposals: 1,
      pendingPayments: 0,
      walletCents: 0,
    });
    expect(snacks[0]).toBe(
      "Your portfolio is $262,158, down $3,246 (1.22%) on the last market day.",
    );
    expect(snacks).toContain("1 proposal is waiting for your OK.");
    expect(snacks).toContain("2 positions are locked. The next unlock is 2029-09-24.");
    expect([hearts(0), hearts(49), hearts(51), hearts(100)]).toEqual([0, 2, 2, 4]);
    expect(ageInDays("2026-09-20T12:00:00Z", NOW)).toBe(4);
  });

  it("calls for attention like a Tamagotchi, money first", () => {
    const v = computeVitals(pet(), signals(), NOW);
    expect(attentionReason(v, signals())).toBeNull();
    expect(attentionReason(v, signals({ pendingProposals: 2, pendingPayments: 1 }))).toBe(
      "1 payment needs your OK",
    );
    expect(attentionReason(v, signals({ pendingProposals: 2 }))).toBe("2 proposals are waiting");
    const hungry = computeVitals(pet({ fullnessAt: "2026-09-23T12:00:00Z" }), signals(), NOW);
    expect(attentionReason(hungry, signals())).toMatch(/^Hungry/);
    // Asleep, it only calls for money matters.
    expect(attentionReason(hungry, signals({ killSwitch: true }))).toBeNull();
    expect(messCount(signals({ warnAlerts: 2 }))).toBe(2);
    expect(messCount(signals({ warnAlerts: 4, criticalAlerts: 1 }))).toBe(3);
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
