import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, setDb, simDate, type Db } from "@/lib/db";
import { executeOrder, deposit, withdraw, listOrders } from "../orders";
import { getLadder, getSnapshot } from "../portfolio";
import { agentTrade, approveProposal, listProposals } from "../proposals";
import { getMandate, updateMandate } from "../repo";
import { advanceDays } from "../sim";
import { createRule, listRules } from "../rules";

let db: Db;

beforeEach(() => {
  db = openDatabase(":memory:", { today: "2026-09-24" });
  setDb(db);
});

describe("seeded demo portfolio", () => {
  it("has a year of history and a $250k starting deposit", () => {
    const snap = getSnapshot(db);
    expect(simDate(db)).toBe("2026-09-24");
    expect(snap.holdings.length).toBe(8);
    expect(snap.totalCents).toBeGreaterThan(200_000_00);
    const ladder = getLadder(db, snap);
    // Cash plus bitcoin (instant settlement) is available today; locked funds are not.
    const btc = snap.holdings.find((h) => h.product.id === "BTC")!;
    expect(ladder[0]!.valueCents).toBe(snap.cashCents + btc.valueCents);
  });
});

describe("orders", () => {
  it("buys, sells with T+1 settlement, and settles on the next day", () => {
    const buy = executeOrder(db, { productId: "MLWX", side: "buy", amountCents: 1_000_00 }, "user");
    expect(buy.status).toBe("filled");
    const sell = executeOrder(db, { productId: "MLWX", side: "sell", amountCents: 500_00 }, "user");
    expect(sell.status).toBe("settling");
    const cashBefore = getSnapshot(db).cashCents;
    advanceDays(db, 1);
    expect(getSnapshot(db).cashCents).toBe(cashBefore + sell.filledCents);
  });

  it("rejects selling a locked private fund and records the attempt", () => {
    const order = executeOrder(
      db,
      { productId: "MLPC", side: "sell", amountCents: 1_000_00 },
      "user",
    );
    expect(order.status).toBe("rejected");
    expect(listOrders(db)[0]!.id).toBe(order.id);
  });

  it("queues quarterly redemptions for the next window", () => {
    const order = executeOrder(
      db,
      { productId: "MLMS", side: "sell", amountCents: 2_000_00 },
      "user",
    );
    expect(order.status).toBe("queued");
    expect(order.windowOn).toBe("2026-12-31");
  });

  it("handles deposits and human-only withdrawals", () => {
    const before = getSnapshot(db).cashCents;
    deposit(db, 5_000_00);
    withdraw(db, 1_000_00);
    expect(getSnapshot(db).cashCents).toBe(before + 4_000_00);
    expect(() => withdraw(db, 999_999_999_00)).toThrow();
  });
});

describe("agent trades", () => {
  it("turns agent trades into proposals by default, then executes on approval", () => {
    const result = agentTrade(
      db,
      "atlas",
      { productId: "MLWX", side: "buy", amountCents: 1_000_00 },
      "test",
    );
    expect(result.outcome).toBe("proposed");
    const pending = listProposals(db, { status: "pending" });
    expect(pending).toHaveLength(1);
    const approved = approveProposal(db, pending[0]!.id);
    expect(approved.status).toBe("executed");
  });

  it("auto-executes small trades in bounded mode and respects the kill switch", () => {
    updateMandate(db, { autonomy: "bounded" });
    const small = agentTrade(
      db,
      "quant",
      { productId: "MLWX", side: "buy", amountCents: 500_00 },
      "test",
    );
    expect(small.outcome).toBe("executed");
    const big = agentTrade(
      db,
      "quant",
      { productId: "MLWX", side: "buy", amountCents: 5_000_00 },
      "test",
    );
    expect(big.outcome).toBe("proposed");
    updateMandate(db, { killSwitch: true, killReason: "test" });
    const paused = agentTrade(
      db,
      "quant",
      { productId: "MLWX", side: "buy", amountCents: 500_00 },
      "test",
    );
    expect(paused.outcome).toBe("proposed");
    expect(getMandate(db).killSwitch).toBe(true);
  });

  it("never lets an agent buy a rejected deal", () => {
    const result = agentTrade(
      db,
      "atlas",
      { productId: "DL-NORDHAVN", side: "buy", amountCents: 1_000_00 },
      "test",
    );
    expect(result.outcome).toBe("blocked");
  });
});

describe("autopilot", () => {
  it("fires a rule through Quant once and then cools down", () => {
    createRule(
      db,
      {
        productId: "MLWX",
        condition: "price_above",
        threshold: 1,
        action: "buy",
        amountCents: 200_00,
      },
      "user",
    );
    advanceDays(db, 2);
    const rule = listRules(db)[0]!;
    expect(rule.lastTriggeredOn).not.toBeNull();
    expect(listProposals(db, { status: "pending" }).length).toBe(1);
  });
});
