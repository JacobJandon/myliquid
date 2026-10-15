import { afterEach, describe, expect, it, vi } from "vitest";
import { openDatabase, setDb, simDate } from "@/lib/db";
import { POST as guestPost } from "@/app/api/auth/guest/route";
import { POST as advancePost } from "@/app/api/sim/advance/route";
import { recentGuestCount } from "../investors";
import { canAdvanceMarket, ensureMarketCurrent, marketClock } from "../sim";

/** What keeps a public MyLiquid (anyone can open a guest account) fair to everyone on it. */

vi.mock("@/lib/auth/current", () => ({
  startSession: vi.fn(async () => {}),
  requireApiInvestor: vi.fn(async () => "inv_demo"),
}));

afterEach(() => vi.unstubAllEnvs());

describe("market clock", () => {
  it("follows the calendar on Vercel and lets a local MyLiquid jump ahead", () => {
    vi.stubEnv("MYLIQUID_MARKET_CLOCK", "");
    vi.stubEnv("VERCEL", "1");
    expect(marketClock()).toBe("calendar");
    expect(canAdvanceMarket()).toBe(false);
    vi.stubEnv("VERCEL", "");
    expect(marketClock()).toBe("demo");
    expect(canAdvanceMarket()).toBe(true);
    vi.stubEnv("MYLIQUID_MARKET_CLOCK", "manual");
    expect(marketClock()).toBe("manual");
  });

  it("refuses to move the shared market by hand when it follows the calendar", async () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    setDb(db);
    vi.stubEnv("MYLIQUID_MARKET_CLOCK", "calendar");
    const req = () =>
      new Request("http://x/api/sim/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
    const res = await advancePost(req());
    expect(res.status).toBe(409);
    expect(simDate(db)).toBe("2026-10-15");

    vi.stubEnv("MYLIQUID_MARKET_CLOCK", "demo");
    expect((await advancePost(req())).status).toBe(200);
    expect(simDate(db)).toBe("2026-10-22");
  });

  it("catches up with the calendar, a day at a time, unless the clock is manual", () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    vi.useFakeTimers({ now: new Date("2026-10-18T12:00:00Z"), toFake: ["Date"] });
    try {
      vi.stubEnv("MYLIQUID_MARKET_CLOCK", "manual");
      expect(ensureMarketCurrent(db)).toBe(0);
      vi.stubEnv("MYLIQUID_MARKET_CLOCK", "calendar");
      expect(ensureMarketCurrent(db)).toBe(3);
      expect(simDate(db)).toBe("2026-10-18");
      expect(ensureMarketCurrent(db)).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("guest accounts", () => {
  const open = (ip: string) =>
    guestPost(
      new Request("http://x/api/auth/guest", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: "{}",
      }),
    );

  it("limits how many one visitor opens an hour", async () => {
    setDb(openDatabase(":memory:", { today: "2026-10-15" }));
    for (let i = 0; i < 10; i++) expect((await open("203.0.113.7")).status).toBe(200);
    const res = await open("203.0.113.7");
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/Try again/);
    expect((await open("203.0.113.8")).status).toBe(200);
  });

  it("limits how many everyone opens an hour", async () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    setDb(db);
    vi.stubEnv("MYLIQUID_GUESTS_PER_HOUR", "2");
    expect((await open("198.51.100.1")).status).toBe(200);
    expect((await open("198.51.100.2")).status).toBe(200);
    expect((await open("198.51.100.3")).status).toBe(429);
    expect(recentGuestCount(db)).toBe(2);
  });
});
