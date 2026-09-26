import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, simDate, type Db } from "@/lib/db";
import {
  catchUpRunOn,
  csvField,
  limitTriggered,
  nextRunOn,
  supportsStandingOrders,
  toCsv,
} from "@/lib/domain/automation";
import { requireProduct } from "@/lib/domain/catalog";
import { addDays } from "@/lib/domain/dates";
import { listAlerts } from "../alerts";
import {
  cancelLimitOrder,
  createPlan,
  getLimitOrder,
  getPlan,
  placeLimitOrder,
  setPlanStatus,
} from "../automation";
import { getCash, currentPrice, updateMandate } from "../repo";
import { advanceDays } from "../sim";

let db: Db;

beforeEach(() => {
  db = openDatabase(":memory:", { today: "2026-09-24" });
  setDb(db);
});

describe("standing-order rules", () => {
  it("schedules weekly, biweekly and monthly runs", () => {
    expect(nextRunOn("weekly", "2026-09-24")).toBe("2026-10-01");
    expect(nextRunOn("biweekly", "2026-09-24")).toBe("2026-10-08");
    expect(nextRunOn("monthly", "2026-01-31")).toBe("2026-02-28");
    expect(catchUpRunOn("weekly", "2026-09-01", "2026-09-24")).toBe("2026-09-29");
  });

  it("triggers limits on the right side and only for market-priced daily products", () => {
    expect(limitTriggered("buy", 99, 100)).toBe(true);
    expect(limitTriggered("buy", 101, 100)).toBe(false);
    expect(limitTriggered("sell", 101, 100)).toBe(true);
    expect(supportsStandingOrders(requireProduct("BTC"))).toBe(true);
    expect(supportsStandingOrders(requireProduct("MLWX"))).toBe(true);
    expect(supportsStandingOrders(requireProduct("MLPC"))).toBe(false);
    expect(supportsStandingOrders(requireProduct("DL-HARBOR"))).toBe(false);
  });

  it("writes RFC 4180 CSV", () => {
    expect(csvField('Say "hi", then')).toBe('"Say ""hi"", then"');
    expect(toCsv(["a", "b"], [[1, null]])).toBe("a,b\r\n1,\r\n");
  });
});

describe("recurring investments", () => {
  it("buys on schedule through the normal order path", () => {
    const cash = getCash(db, ID);
    const plan = createPlan(db, ID, { productId: "MLWX", amountCents: 250_00, cadence: "weekly" });
    expect(plan.nextRunOn).toBe(addDays(simDate(db), 1));
    advanceDays(db, 1);
    const after = getPlan(db, ID, plan.id)!;
    expect(after.runs).toBe(1);
    expect(after.lastResult).toBe("filled");
    expect(after.nextRunOn).toBe(nextRunOn("weekly", plan.nextRunOn));
    expect(getCash(db, ID)).toBeLessThan(cash);
  });

  it("keeps running while agents are paused, stops when the investor pauses it", () => {
    const plan = createPlan(db, ID, { productId: "MLBD", amountCents: 50_00, cadence: "weekly" });
    updateMandate(db, ID, { killSwitch: true, killReason: "test" });
    advanceDays(db, 1);
    expect(getPlan(db, ID, plan.id)!.runs).toBe(1);
    setPlanStatus(db, ID, plan.id, "paused");
    advanceDays(db, 14);
    expect(getPlan(db, ID, plan.id)!.runs).toBe(1);
    const resumed = setPlanStatus(db, ID, plan.id, "active");
    expect(resumed.nextRunOn >= addDays(simDate(db), 1)).toBe(true);
  });

  it("skips a run it can't afford and raises an alert", () => {
    const plan = createPlan(db, ID, {
      productId: "MLUS",
      amountCents: 100_000_00,
      cadence: "monthly",
    });
    advanceDays(db, 1);
    const after = getPlan(db, ID, plan.id)!;
    expect(after.runs).toBe(0);
    expect(after.lastResult).toMatch(/^skipped/);
    expect(listAlerts(db, ID, { openOnly: true }).some((a) => a.code === "recurring_skipped")).toBe(
      true,
    );
  });

  it("refuses products that aren't traded daily", () => {
    expect(() =>
      createPlan(db, ID, { productId: "MLPC", amountCents: 500_00, cadence: "monthly" }),
    ).toThrow(/isn't traded daily/);
    expect(() =>
      createPlan(db, ID, { productId: "MLWX", amountCents: 5_00, cadence: "monthly" }),
    ).toThrow(/minimum/);
  });
});

describe("limit orders", () => {
  it("fills at once when the price already meets the limit", () => {
    const price = currentPrice(db, "MLWX", simDate(db))!;
    const lo = placeLimitOrder(db, ID, {
      productId: "MLWX",
      side: "buy",
      amountCents: 1_000_00,
      limitPrice: price * 1.05,
    });
    expect(lo.status).toBe("filled");
    expect(lo.orderId).toBeTruthy();
  });

  it("waits, can be cancelled, and expires after 90 days", () => {
    const price = currentPrice(db, "MLUS", simDate(db))!;
    const low = placeLimitOrder(db, ID, {
      productId: "MLUS",
      side: "buy",
      amountCents: 500_00,
      limitPrice: price * 0.2,
    });
    expect(low.status).toBe("open");
    expect(cancelLimitOrder(db, ID, low.id).status).toBe("cancelled");
    expect(() => cancelLimitOrder(db, ID, low.id)).toThrow(/already cancelled/);

    const waiting = placeLimitOrder(db, ID, {
      productId: "MLUS",
      side: "buy",
      amountCents: 500_00,
      limitPrice: price * 0.2,
    });
    advanceDays(db, 60);
    expect(getLimitOrder(db, ID, waiting.id)!.status).toBe("open");
    advanceDays(db, 31);
    expect(getLimitOrder(db, ID, waiting.id)!.status).toBe("expired");
  });

  it("is refused up front when the checks would block it today", () => {
    const price = currentPrice(db, "BTC", simDate(db))!;
    expect(() =>
      placeLimitOrder(db, ID, {
        productId: "BTC",
        side: "buy",
        amountCents: 99_000_00,
        limitPrice: price,
      }),
    ).toThrow();
    expect(() =>
      placeLimitOrder(db, ID, {
        productId: "MLGE",
        side: "buy",
        amountCents: 1_000_00,
        limitPrice: 10,
      }),
    ).toThrow(/no live market price/);
  });
});

describe("statements and agent access", () => {
  it("exports every trade, cash movement and standing-order fill as CSV", async () => {
    const { statementCsv } = await import("../statements");
    createPlan(db, ID, { productId: "MLWX", amountCents: 250_00, cadence: "weekly" });
    advanceDays(db, 1);
    const csv = statementCsv(db, ID);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe(
      "Date,Type,Description,Product,Side,Amount (USD),Units,Price (USD),Status,Initiated by,Note",
    );
    expect(csv).toMatch(/Trade,Buy Global Equity Index,MLWX,buy,250\.00,/);
    expect(csv).toMatch(/Recurring investment \(every week\)/);
    expect(csv).toMatch(/Deposit,Deposit from bank/);
  });

  it("lets agents read standing orders, but not create them", async () => {
    const { invokeTool, TOOLS } = await import("@/lib/agents/tools");
    createPlan(db, ID, { productId: "MLBD", amountCents: 100_00, cadence: "monthly" });
    const tool = TOOLS.find((t) => t.name === "get_standing_orders")!;
    const res = invokeTool(tool, {}, { db, investorId: ID, agent: "copilot", runId: null });
    const result = res.result as { recurringInvestments: { product: string; amount: string }[] };
    expect(result.recurringInvestments[0]).toMatchObject({
      product: "Global Aggregate Bond Index",
      amount: "$100.00",
    });
    expect(tool.trades).toBe(false);
    expect(TOOLS.some((t) => /recurring|limit_order/.test(t.name) && t.trades)).toBe(false);
  });
});
