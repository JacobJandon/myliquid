import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, simDate, type Db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { createSession, deleteSession, investorForSession } from "@/lib/auth/sessions";
import { authenticateApiKey, createApiKey, listApiKeys, revokeApiKey } from "../apiKeys";
import {
  createInvestor,
  deleteInvestor,
  findInvestorByEmail,
  resetPortfolio,
  upgradeGuest,
} from "../investors";
import { deposit, executeOrder, listOrders, withdraw } from "../orders";
import { getLadder, getNavHistory, getSnapshot } from "../portfolio";
import { agentTrade, approveProposal, getProposal, listProposals } from "../proposals";
import { getMandate, updateMandate } from "../repo";
import { createRule, listRules } from "../rules";
import { advanceDays } from "../sim";

let db: Db;

beforeEach(() => {
  db = openDatabase(":memory:", { today: "2026-09-24" });
  setDb(db);
});

describe("seeded demo investor", () => {
  it("has a year of history and a $250k starting deposit", () => {
    const snap = getSnapshot(db, ID);
    expect(simDate(db)).toBe("2026-09-24");
    expect(snap.holdings.length).toBe(8);
    expect(snap.totalCents).toBeGreaterThan(200_000_00);
    expect(getNavHistory(db, ID, 400).length).toBe(366);
    // Cash plus bitcoin (instant settlement) is available today; locked funds are not.
    const btc = snap.holdings.find((h) => h.product.id === "BTC")!;
    expect(getLadder(db, ID, snap)[0]!.valueCents).toBe(snap.cashCents + btc.valueCents);
  });
});

describe("orders", () => {
  it("buys, sells with T+1 settlement, and settles on the next day", () => {
    const buy = executeOrder(
      db,
      ID,
      { productId: "MLWX", side: "buy", amountCents: 1_000_00 },
      "user",
    );
    expect(buy.status).toBe("filled");
    const sell = executeOrder(
      db,
      ID,
      { productId: "MLWX", side: "sell", amountCents: 500_00 },
      "user",
    );
    expect(sell.status).toBe("settling");
    const cashBefore = getSnapshot(db, ID).cashCents;
    advanceDays(db, 1);
    expect(getSnapshot(db, ID).cashCents).toBe(cashBefore + sell.filledCents);
  });

  it("rejects selling a locked private fund and records the attempt", () => {
    const order = executeOrder(
      db,
      ID,
      { productId: "MLPC", side: "sell", amountCents: 1_000_00 },
      "user",
    );
    expect(order.status).toBe("rejected");
    expect(listOrders(db, ID)[0]!.id).toBe(order.id);
  });

  it("queues quarterly redemptions for the next window", () => {
    const order = executeOrder(
      db,
      ID,
      { productId: "MLMS", side: "sell", amountCents: 2_000_00 },
      "user",
    );
    expect(order.status).toBe("queued");
    expect(order.windowOn).toBe("2026-12-31");
  });

  it("handles deposits and human-only withdrawals", () => {
    const before = getSnapshot(db, ID).cashCents;
    deposit(db, ID, 5_000_00);
    withdraw(db, ID, 1_000_00);
    expect(getSnapshot(db, ID).cashCents).toBe(before + 4_000_00);
    expect(() => withdraw(db, ID, 999_999_999_00)).toThrow();
  });
});

describe("agent trades", () => {
  it("turns agent trades into proposals by default, then executes on approval", () => {
    const result = agentTrade(
      db,
      ID,
      "atlas",
      { productId: "MLWX", side: "buy", amountCents: 1_000_00 },
      "test",
    );
    expect(result.outcome).toBe("proposed");
    const pending = listProposals(db, ID, { status: "pending" });
    expect(pending).toHaveLength(1);
    expect(approveProposal(db, ID, pending[0]!.id).status).toBe("executed");
  });

  it("auto-executes small trades in bounded mode and respects the kill switch", () => {
    updateMandate(db, ID, { autonomy: "bounded" });
    expect(
      agentTrade(db, ID, "quant", { productId: "MLWX", side: "buy", amountCents: 500_00 }, "test")
        .outcome,
    ).toBe("executed");
    expect(
      agentTrade(db, ID, "quant", { productId: "MLWX", side: "buy", amountCents: 5_000_00 }, "test")
        .outcome,
    ).toBe("proposed");
    updateMandate(db, ID, { killSwitch: true, killReason: "test" });
    expect(
      agentTrade(db, ID, "quant", { productId: "MLWX", side: "buy", amountCents: 500_00 }, "test")
        .outcome,
    ).toBe("proposed");
    expect(getMandate(db, ID).killSwitch).toBe(true);
  });

  it("never lets an agent buy a rejected deal", () => {
    expect(
      agentTrade(
        db,
        ID,
        "atlas",
        { productId: "DL-NORDHAVN", side: "buy", amountCents: 1_000_00 },
        "test",
      ).outcome,
    ).toBe("blocked");
  });
});

describe("autopilot", () => {
  it("fires a rule through Quant once and then cools down", () => {
    createRule(
      db,
      ID,
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
    expect(listRules(db, ID)[0]!.lastTriggeredOn).not.toBeNull();
    expect(listProposals(db, ID, { status: "pending" }).length).toBe(1);
  });
});

describe("accounts", () => {
  it("keeps investors isolated from each other", () => {
    const other = createInvestor(db, {
      kind: "user",
      name: "Sam",
      email: "sam@example.com",
      riskProfile: "growth",
      starter: "cash",
    });
    expect(getSnapshot(db, other).holdings).toHaveLength(0);
    expect(getSnapshot(db, other).cashCents).toBe(100_000_00);
    const proposal = agentTrade(
      db,
      ID,
      "atlas",
      { productId: "MLWX", side: "buy", amountCents: 1_000_00 },
      "test",
    );
    expect(proposal.outcome).toBe("proposed");
    const id = (proposal as { proposal: { id: string } }).proposal.id;
    expect(getProposal(db, other, id)).toBeUndefined();
    expect(() => approveProposal(db, other, id)).toThrow();
    // The shared market clock settles everyone.
    advanceDays(db, 1);
    expect(getNavHistory(db, other, 5).length).toBe(2);
  });

  it("hashes passwords, manages sessions and upgrades guests", () => {
    const hash = hashPassword("correct horse");
    expect(verifyPassword("correct horse", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);

    const guest = createInvestor(db, {
      kind: "guest",
      name: "Guest",
      riskProfile: "balanced",
      starter: "sample",
    });
    const { token } = createSession(db, guest);
    expect(investorForSession(db, token)).toBe(guest);
    upgradeGuest(db, guest, { name: "Riley", email: "Riley@Example.com", passwordHash: hash });
    expect(findInvestorByEmail(db, "riley@example.com")?.id).toBe(guest);
    expect(getSnapshot(db, guest).holdings.length).toBe(8);
    deleteSession(db, token);
    expect(investorForSession(db, token)).toBeNull();
  });

  it("resets and deletes an investor's data", () => {
    const id = createInvestor(db, {
      kind: "user",
      name: "Kim",
      email: "kim@example.com",
      riskProfile: "balanced",
      starter: "sample",
    });
    executeOrder(db, id, { productId: "MLWX", side: "buy", amountCents: 1_000_00 }, "user");
    resetPortfolio(db, id, "cash");
    expect(getSnapshot(db, id).holdings).toHaveLength(0);
    expect(listOrders(db, id)).toHaveLength(0);
    deleteInvestor(db, id);
    expect(findInvestorByEmail(db, "kim@example.com")).toBeNull();
  });

  it("issues, authenticates and revokes scoped API keys", () => {
    const { key, apiKey } = createApiKey(db, ID, "Claude", ["trade"]);
    expect(apiKey.scopes).toEqual(["read", "trade"]);
    expect(authenticateApiKey(db, key)?.investorId).toBe(ID);
    expect(authenticateApiKey(db, "mlk_nope")).toBeNull();
    revokeApiKey(db, ID, apiKey.id);
    expect(authenticateApiKey(db, key)).toBeNull();
    expect(listApiKeys(db, ID)[0]!.revokedAt).not.toBeNull();
  });
});
