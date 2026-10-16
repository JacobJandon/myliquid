import { describe, expect, it } from "vitest";
import { benchmarkMove, benchmarkPrice } from "../realPrices";

const closes = [
  { date: "2026-10-08", close: 100 }, // Thu
  { date: "2026-10-09", close: 102 }, // Fri
  { date: "2026-10-12", close: 101 }, // Mon
];

describe("benchmarkMove", () => {
  it("moves market day D by the benchmark's move into the close on or before D-1", () => {
    expect(benchmarkMove(closes, "2026-10-10", "2026-10-10")).toBeCloseTo(1.02); // Sat: Thu → Fri
    expect(benchmarkMove(closes, "2026-10-11", "2026-10-11")).toBe(1); // Sun: no new close
    expect(benchmarkMove(closes, "2026-10-12", "2026-10-12")).toBe(1); // Mon: still Fri's close
    expect(benchmarkMove(closes, "2026-10-13", "2026-10-13")).toBeCloseTo(101 / 102); // Tue: Fri → Mon
  });

  it("can't say when the feed wasn't asked on or after the day, or has gone quiet", () => {
    expect(benchmarkMove(closes, "2026-10-13", null)).toBeNull();
    expect(benchmarkMove(closes, "2026-10-13", "2026-10-12")).toBeNull();
    expect(benchmarkMove(closes, "2026-10-20", "2026-10-20")).toBeNull(); // last close 8 days old
    expect(benchmarkMove(closes, "2026-10-09", "2026-10-09")).toBeNull(); // nothing before Thu
  });

  it("prices a fund by its benchmark's moves, and an asset that is the benchmark at its level", () => {
    expect(benchmarkPrice("moves", 50, closes, "2026-10-10", "2026-10-10")?.price).toBeCloseTo(51);
    expect(benchmarkPrice("level", 50, closes, "2026-10-13", "2026-10-13")).toEqual({
      price: 101,
      close: { date: "2026-10-12", close: 101 },
    });
    expect(benchmarkPrice("level", 50, closes, "2026-10-13", null)).toBeNull();
  });
});
