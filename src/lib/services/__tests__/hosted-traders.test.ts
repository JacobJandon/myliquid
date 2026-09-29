import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, simDate, type Db } from "@/lib/db";
import { GET as cronGet } from "@/app/api/cron/traders/route";
import {
  momentumStrategy,
  parsePct,
  parseUsdCents,
  ticketCents,
  treasuryStrategy,
  type PortfolioView,
  type SignalView,
} from "@/lib/domain/traderStrategies";
import { listApiKeys } from "@/lib/services/apiKeys";
import {
  fireTrader,
  hireTrader,
  listHostedTraders,
  runDueTraders,
  runTrader,
  setHostedStatus,
  traderRecord,
} from "@/lib/services/hostedTraders";
import { listOrders } from "@/lib/services/orders";
import { advanceDays } from "@/lib/services/sim";

const sig = (id: string, trend: SignalView["trend"], strength: number): SignalView => ({
  id,
  name: id,
  trend,
  strength,
  return30d: strength * 2,
  drawdownFromHigh: -0.05,
});

const book = (cash: number, holdings: [string, number][] = []): PortfolioView => {
  const total = cash + holdings.reduce((a, [, v]) => a + v, 0);
  return {
    totalCents: total,
    cashCents: cash,
    holdings: holdings.map(([id, v]) => ({ id, name: id, valueCents: v, weight: v / total })),
  };
};

describe("hosted trader strategies (pure)", () => {
  it("reads the formatted numbers an MCP tool returns", () => {
    expect(parseUsdCents("$1,234.56")).toBe(123_456);
    expect(parseUsdCents("-$50")).toBe(-5_000);
    expect(parsePct("+1.25%")).toBeCloseTo(0.0125);
    expect(parsePct("-3.4%")).toBeCloseTo(-0.034);
    expect(ticketCents({ trading: { perTradeLimit: "$1,000", leftToday: "$600" } }, 500_00)).toEqual({
      cents: 600_00,
      auto: true,
    });
    expect(ticketCents({ trading: { mode: "proposes" } }, 500_00)).toEqual({
      cents: 500_00,
      auto: false,
    });
  });

  it("momentum buys the strongest uptrend and trims a held downtrend", () => {
    const r = momentumStrategy(
      [sig("MLUS", "uptrend", 0.02), sig("MLWX", "uptrend", 0.03), sig("MLQM", "downtrend", -0.02)],
      book(50_000_00, [["MLQM", 10_000_00]]),
      1_000_00,
    );
    expect(r.ideas).toEqual([
      expect.objectContaining({ productId: "MLWX", side: "buy", amountCents: 1_000_00 }),
      expect.objectContaining({ productId: "MLQM", side: "sell", amountCents: 1_000_00 }),
    ]);
  });

  it("momentum respects its cash floor, position cap and used-up limit", () => {
    const up = [sig("MLUS", "uptrend", 0.02)];
    expect(momentumStrategy(up, book(4_000_00, [["MLWX", 96_000_00]]), 1_000_00).ideas).toEqual(
      [],
    ); // cash below the 5% floor
    expect(momentumStrategy(up, book(10_000_00, [["MLUS", 30_000_00]]), 1_000_00).ideas).toEqual(
      [],
    ); // already 75% MLUS
    expect(momentumStrategy(up, book(50_000_00), 20_00).note).toMatch(/used up/);
    expect(momentumStrategy([sig("MLBTC", "uptrend", 0.1)], book(50_000_00), 1_000_00).ideas).toEqual(
      [],
    ); // outside its universe
  });

  it("treasury keeps cash inside its band", () => {
    expect(treasuryStrategy(book(20_000_00, [["MLUS", 80_000_00]]), 5_000_00).ideas).toEqual([
      expect.objectContaining({ productId: "MLBD", side: "buy", amountCents: 5_000_00 }),
    ]);
    expect(
      treasuryStrategy(book(2_000_00, [["MLBD", 50_000_00], ["MLUS", 48_000_00]]), 5_000_00)
        .ideas,
    ).toEqual([expect.objectContaining({ productId: "MLBD", side: "sell", amountCents: 5_000_00 })]);
    expect(treasuryStrategy(book(8_000_00, [["MLUS", 92_000_00]]), 5_000_00)).toMatchObject({
      ideas: [],
      note: expect.stringMatching(/Inside the band/),
    });
  });
});

describe("hosted traders at work", () => {
  let db: Db;
  const limits = { mode: "auto" as const, perTradeLimitCents: 1_000_00, dailyLimitCents: 3_000_00 };

  beforeEach(() => {
    db = openDatabase(":memory:", { today: "2026-09-24" });
    setDb(db);
  });

  it("hires a trader that enrolls with its AINRA passport and trades once a market day", async () => {
    const trader = await hireTrader(db, ID, "momentum-trader", limits);
    expect(listApiKeys(db, ID).find((k) => k.id === trader.keyId)?.name).toBe(
      "Northwind Momentum Trader",
    );

    const summary = await runTrader(db, ID, trader.id);
    expect(summary).not.toBeNull();
    expect(summary!.stopped).toBeNull();
    expect(summary!.note).toMatch(/^Signals: ML/);
    for (const d of summary!.decisions) expect(["executed", "proposed"]).toContain(d.outcome);
    const mine = listOrders(db, ID).filter((o) => o.agentKeyId === trader.keyId);
    expect(mine.length).toBe(summary!.decisions.filter((d) => d.outcome === "executed").length);
    for (const o of mine) {
      expect(o.autonomous).toBe(true);
      expect(o.ainraNumber).toBe("did:ainra:registrar-07:northwind:momentum-trader");
      expect(o.amountCents).toBeLessThanOrEqual(1_000_00);
    }

    expect(await runTrader(db, ID, trader.id)).toBeNull(); // once a market day
    advanceDays(db, 1);
    expect(await runDueTraders(db, ID)).toBe(1);
    expect(listHostedTraders(db, ID)[0]!.lastRunOn).toBe(simDate(db));
    expect(traderRecord(db, ID, trader.keyId).executed).toBe(
      listOrders(db, ID).filter((o) => o.agentKeyId === trader.keyId).length,
    );
  });

  it("the treasury agent parks excess cash on its own, within its limit", async () => {
    const trader = await hireTrader(db, ID, "treasury-agent", limits);
    const summary = (await runTrader(db, ID, trader.id))!;
    expect(summary.note).toMatch(/Cash is .* of the portfolio/);
    if (summary.decisions.length) {
      expect(summary.decisions[0]).toMatchObject({ outcome: "executed" });
      expect(summary.decisions[0]!.title).toMatch(/^(Buy|Sell) \$1,000 of/);
    }
  });

  it("the research analyst only writes notes", async () => {
    const trader = await hireTrader(db, ID, "research-analyst", limits);
    const summary = (await runTrader(db, ID, trader.id))!;
    expect(summary.decisions).toEqual([]);
    expect(summary.note).toMatch(/Uptrends: .* Downtrends:/);
    expect(listOrders(db, ID).some((o) => o.agentKeyId === trader.keyId)).toBe(false);
  });

  it("pausing stops it, firing revokes its key, and each agent is hired once", async () => {
    const trader = await hireTrader(db, ID, "momentum-trader", limits);
    await expect(hireTrader(db, ID, "momentum-trader", limits)).rejects.toThrow(/already works/);
    setHostedStatus(db, ID, trader.id, "paused");
    expect(await runTrader(db, ID, trader.id, { force: true })).toBeNull();
    setHostedStatus(db, ID, trader.id, "active");
    fireTrader(db, ID, trader.id);
    expect(listApiKeys(db, ID).find((k) => k.id === trader.keyId)?.revokedAt).not.toBeNull();
    expect(listHostedTraders(db, ID)).toHaveLength(0);
    expect(await runTrader(db, ID, trader.id, { force: true })).toBeNull();
  });

  it("the daily cron only answers Vercel's scheduler", async () => {
    await hireTrader(db, ID, "research-analyst", limits);
    advanceDays(db, 1);
    const denied = await cronGet(new Request("http://localhost/api/cron/traders"));
    expect(denied.status).toBe(401);
    const ok = await cronGet(
      new Request("http://localhost/api/cron/traders", {
        headers: { "user-agent": "vercel-cron/1.0" },
      }),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, tradersRan: 1 });
  });
});
