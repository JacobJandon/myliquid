import { afterEach, describe, expect, it, vi } from "vitest";
import { openDatabase, simDate, type Db } from "@/lib/db";
import { priceFeeds, refreshQuotes } from "../realPrices";
import { ensureMarketCurrent } from "../sim";

/** The market follows real closes, from feeds faked here, and falls back to the simulation when they can't say. */

const SPY = { "2026-10-13": 600, "2026-10-14": 606, "2026-10-15": 603, "2026-10-16": 609 };
const BTC = {
  "2026-10-14": 100_000,
  "2026-10-15": 110_000,
  "2026-10-16": 99_000,
  "2026-10-17": 99_000,
};

function fakeFeeds({ yahooDown = false } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("yahoo.com")) {
        if (yahooDown) return new Response("Too Many Requests", { status: 429 });
        if (!u.includes("/SPY?"))
          return Response.json({
            chart: { result: null, error: { description: "No data found" } },
          });
        // Session opens (13:30 UTC), as Yahoo stamps them, with New York's offset.
        const ts = Object.keys(SPY).map((d) => Date.parse(`${d}T13:30:00Z`) / 1000);
        return Response.json({
          chart: {
            result: [
              {
                meta: { gmtoffset: -14400 },
                timestamp: ts,
                indicators: { quote: [{ close: Object.values(SPY) }] },
              },
            ],
          },
        });
      }
      if (u.includes("coinbase.com")) {
        const rows = Object.entries(BTC).map(([d, c]) => [Date.parse(d) / 1000, 0, 0, 0, c, 0]);
        return Response.json(rows.reverse());
      }
      throw new Error(`unexpected ${u}`);
    }),
  );
}

const price = (db: Db, id: string, date: string) =>
  db.prepare("SELECT price, feed FROM prices WHERE product_id = ? AND date = ?").get(id, date) as
    { price: number; feed: string | null } | undefined;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("real prices", () => {
  it("prices index funds and bitcoin from the previous close, and simulates the rest", async () => {
    vi.stubEnv("MYLIQUID_PRICES", "real");
    vi.stubEnv("MYLIQUID_MARKET_CLOCK", "calendar");
    fakeFeeds();
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    vi.useFakeTimers({ now: new Date("2026-10-18T09:00:00Z"), toFake: ["Date"] });
    const start = price(db, "MLUS", "2026-10-15")!.price;
    const btcStart = price(db, "BTC", "2026-10-15")!.price;
    const btcValue = () =>
      (
        db
          .prepare(
            "SELECT SUM(l.units * p.price) AS v FROM lots l JOIN prices p ON p.product_id = l.product_id AND p.date = '2026-10-15' WHERE l.product_id = 'BTC'",
          )
          .get() as { v: number }
      ).v;
    const valueBefore = btcValue();
    expect(valueBefore).toBeGreaterThan(0);

    expect(await ensureMarketCurrent(db)).toBe(3);
    expect(simDate(db)).toBe("2026-10-18");

    // MLUS: Oct 16 ← SPY 10-14→10-15, Oct 17 ← 10-15→10-16, Oct 18 (Sun) ← no new close.
    const d16 = price(db, "MLUS", "2026-10-16")!;
    expect(d16.price).toBeCloseTo((start * 603) / 606, 6);
    expect(d16.feed).toBe("SPY close 2026-10-15 via yahoo");
    expect(price(db, "MLUS", "2026-10-17")!.price).toBeCloseTo((start * 609) / 606, 6);
    expect(price(db, "MLUS", "2026-10-18")!.price).toBeCloseTo((start * 609) / 606, 6);
    // Bitcoin is its benchmark, so it takes the real price, every day: Oct 16 ← the Oct 15 close.
    expect(btcStart).not.toBe(110_000);
    expect(price(db, "BTC", "2026-10-16")!.price).toBe(110_000);
    expect(price(db, "BTC", "2026-10-17")!.price).toBe(99_000);
    // Its simulated past was re-denominated on that first real day, so no holding jumped.
    expect(price(db, "BTC", "2026-10-15")!.price).toBeCloseTo(110_000, 6);
    expect(btcValue()).toBeCloseTo(valueBefore, 2);
    expect(price(db, "BTC", "2026-10-17")!.feed).toBe("BTC-USD close 2026-10-16 via coinbase");
    // No closes for the world fund here, and the strategy has no benchmark: both simulated.
    expect(price(db, "MLWX", "2026-10-16")!.feed).toBeNull();
    expect(price(db, "MLQM", "2026-10-16")!.feed).toBeNull();
    expect(priceFeeds(db).find((f) => f.productId === "MLUS")?.latest?.feed).toMatch(/^SPY/);
  });

  it("goes to the next source, then to the simulation, when a feed fails", async () => {
    vi.stubEnv("MYLIQUID_PRICES", "real");
    fakeFeeds({ yahooDown: true });
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    const status = await refreshQuotes(db, { force: true, today: "2026-10-16" });
    const spy = status.find((s) => s.symbol === "SPY")!;
    expect(spy.ok).toBe(false);
    expect(spy.error).toMatch(/^SPY: yahoo: HTTP 429$/);
    expect(status.find((s) => s.symbol === "BTC-USD")?.ok).toBe(true);
  });

  it("stays out of the way when off: no fetches, simulated prices", async () => {
    vi.stubEnv("MYLIQUID_MARKET_CLOCK", "calendar");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    vi.useFakeTimers({ now: new Date("2026-10-16T09:00:00Z"), toFake: ["Date"] });
    expect(await ensureMarketCurrent(db)).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(price(db, "MLUS", "2026-10-16")!.feed).toBeNull();
  });
});
