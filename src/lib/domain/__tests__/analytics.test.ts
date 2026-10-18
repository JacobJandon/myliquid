import { describe, expect, it } from "vitest";
import {
  EXPERIMENTS,
  assignVariant,
  compareRates,
  funnel,
  pmfScore,
  retention,
  sampleSizePerVariant,
  shouldTrack,
} from "../analytics";

describe("analytics maths", () => {
  it("respects opt-outs and skips bots", () => {
    const chrome = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/141.0 Safari/537.36";
    expect(shouldTrack({ userAgent: chrome })).toBe(true);
    expect(shouldTrack({ userAgent: chrome, gpc: "1" })).toBe(false);
    expect(shouldTrack({ userAgent: chrome, dnt: "1" })).toBe(false);
    expect(shouldTrack({ userAgent: "Mozilla/5.0 HeadlessChrome/141.0" })).toBe(false);
    expect(shouldTrack({ userAgent: "Googlebot/2.1" })).toBe(false);
  });

  it("assigns each visitor one stable variant, about evenly", () => {
    const e = EXPERIMENTS.landing_headline;
    expect(assignVariant("visitor-1", e)).toBe(assignVariant("visitor-1", e));
    const counts = { pet: 0, safety: 0 } as Record<string, number>;
    for (let i = 0; i < 2000; i++) counts[assignVariant(`v${i}`, e)]! += 1;
    expect(counts.pet).toBeGreaterThan(900);
    expect(counts.safety).toBeGreaterThan(900);
  });

  it("tests a difference in conversion for significance", () => {
    const big = compareRates(100, 1000, 140, 1000);
    expect(big.lift).toBeCloseTo(0.4);
    expect(big.significant).toBe(true);
    expect(big.p!).toBeLessThan(0.01);
    const noise = compareRates(10, 100, 12, 100);
    expect(noise.significant).toBe(false);
    expect(compareRates(0, 0, 0, 0).p).toBeNull();
    // About 3,600 per variant to see 10% → 12%.
    expect(sampleSizePerVariant(0.1, 0.2)).toBeGreaterThan(3500);
    expect(sampleSizePerVariant(0.1, 0.2)).toBeLessThan(4000);
  });

  it("scores product-market fit the Sean Ellis way", () => {
    expect(pmfScore(["very", "somewhat"]).verdict).toBe("not enough answers");
    const answers = [
      ...Array(18).fill("very"),
      ...Array(20).fill("somewhat"),
      ...Array(2).fill("not"),
      ...Array(5).fill("na"),
    ];
    const s = pmfScore(answers);
    expect(s.n).toBe(40); // "no longer use it" doesn't count
    expect(s.veryShare).toBeCloseTo(0.45);
    expect(s.verdict).toBe("product-market fit signal");
  });

  it("counts a funnel in order, and retention by cohort", () => {
    const reached = new Map([
      ["a", new Set(["landing_viewed", "guest_started", "trade_placed"])],
      ["b", new Set(["landing_viewed", "guest_started"])],
      ["c", new Set(["landing_viewed"])],
      ["d", new Set(["trade_placed"])], // never saw the front page: not in the funnel
    ]);
    expect(funnel([["landing_viewed"], ["guest_started"], ["trade_placed"]], reached)).toEqual([
      3, 2, 1,
    ]);
    const days = new Map([
      ["x", ["2026-10-01", "2026-10-02", "2026-10-09"]],
      ["y", ["2026-10-01"]],
      ["z", ["2026-10-15"]], // too new for day 7
    ]);
    expect(retention(days, 1, "2026-10-16")).toEqual({ cohort: 3, retained: 1, rate: 1 / 3 });
    expect(retention(days, 7, "2026-10-16")).toEqual({ cohort: 2, retained: 1, rate: 0.5 });
  });
});
