import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, type Db } from "@/lib/db";
import { GET as x402Get } from "@/app/api/x402/research/[productId]/route";
import { createApiKey } from "../apiKeys";
import { awardXp, checkIn, feed, getCompanionView, getQuiz, play, sleep, wake } from "../companion";
import { createInvestor } from "../investors";
import {
  createPaymentRequest,
  decidePayment,
  fundWallet,
  getPaymentRequest,
  getWalletBalance,
  listPayments,
  payRequest,
  updateCard,
  x402Purchase,
} from "../payments";
import { getMandate } from "../repo";

let db: Db;

beforeEach(() => {
  db = openDatabase(":memory:", { today: "2026-09-24" });
  setDb(db);
});

describe("living agent", () => {
  it("is adopted with the account, named and colored", () => {
    const id = createInvestor(db, {
      kind: "user",
      name: "Mia",
      email: "mia@example.com",
      riskProfile: "growth",
      starter: "cash",
      pet: { name: "Bubbles", color: "pink" },
    });
    const pet = getCompanionView(db, id);
    expect(pet).toMatchObject({ name: "Bubbles", color: "pink", level: 1 });
    expect(pet.stage.name).toBe("Drop");
    expect(pet.quests).toHaveLength(3);
  });

  it("rewards daily habits with capped XP and levels up", () => {
    expect(checkIn(db, ID).xp.awarded).toBeGreaterThanOrEqual(10);
    expect(checkIn(db, ID).xp.awarded).toBe(0); // once per day
    for (let i = 0; i < 12; i++) awardXp(db, ID, "decide_proposal");
    const view = getCompanionView(db, ID);
    expect(view.xp).toBeGreaterThanOrEqual(10 + 60);
    expect(view.level).toBeGreaterThanOrEqual(2);
  });

  it("gets fed, plays the liquidity quiz, and sleeping is the kill switch", () => {
    const before = getCompanionView(db, ID).vitals.fullness;
    expect(feed(db, ID).message).toMatch(/Research snack/);
    expect(getCompanionView(db, ID).vitals.fullness).toBeGreaterThan(before);

    const quiz = getQuiz(db, ID);
    const result = play(db, ID, quiz.answerIndex, quiz.seed);
    expect(result.correct).toBe(true);
    expect(() => play(db, ID, 0, "someone-else:2026")).toThrow();

    sleep(db, ID);
    expect(getMandate(db, ID).killSwitch).toBe(true);
    expect(getCompanionView(db, ID).vitals.mood).toBe("sleeping");
    wake(db, ID);
    expect(getMandate(db, ID).killSwitch).toBe(false);
  });
});

describe("Agent Pay", () => {
  it("funds the wallet from cash and pays a terminal within policy", () => {
    fundWallet(db, ID, 100_00);
    expect(getWalletBalance(db, ID)).toBe(100_00);
    const req = createPaymentRequest(db, {
      merchantId: "m_brewlab",
      amountCents: 5_75,
      description: "Oat flat white",
    });
    expect(req.code).toMatch(/^LQ-/);
    const result = payRequest(db, ID, req.code, "copilot");
    expect(result.decision).toBe("approve");
    expect(getWalletBalance(db, ID)).toBe(94_25);
    const after = getPaymentRequest(db, req.code)!;
    expect(after.status).toBe("paid");
    expect(after.paidBy).toMatch(/^Drip, agent of Alex$/);
    expect(() => payRequest(db, ID, req.code, "copilot")).toThrow(/already paid/);
    // Paying completes the pay quest (if it is today's quest) and always earns habit XP.
    expect(getCompanionView(db, ID).xp).toBeGreaterThan(0);
  });

  it("holds big payments for approval and declines what policy forbids", () => {
    fundWallet(db, ID, 500_00);
    const big = createPaymentRequest(db, { merchantId: "m_pixelstore", amountCents: 129_00 });
    const held = payRequest(db, ID, big.code, "copilot");
    expect(held.decision).toBe("needs_approval");
    expect(getPaymentRequest(db, big.code)!.status).toBe("pending_approval");
    const approved = decidePayment(db, ID, held.payment.id, true);
    expect(approved.decision).toBe("approve");
    expect(getWalletBalance(db, ID)).toBe(371_00);

    const casino = createPaymentRequest(db, { merchantId: "m_luckystar", amountCents: 20_00 });
    expect(payRequest(db, ID, casino.code, "copilot").decision).toBe("decline");

    updateCard(db, ID, { status: "frozen" });
    const coffee = createPaymentRequest(db, { merchantId: "m_brewlab", amountCents: 4_00 });
    expect(payRequest(db, ID, coffee.code, "copilot").decision).toBe("decline");
    expect(listPayments(db, ID).length).toBe(3);
  });

  it("never spends more than the wallet holds", () => {
    const req = createPaymentRequest(db, { merchantId: "m_brewlab", amountCents: 5_00 });
    expect(payRequest(db, ID, req.code, "copilot").decision).toBe("decline");
    expect(() => fundWallet(db, ID, 999_999_00)).toThrow();
  });

  it("buys pay-per-call data through the x402 flow", async () => {
    fundWallet(db, ID, 10_00);
    const bought = x402Purchase(db, ID, "DL-NORDHAVN", "scout");
    expect(bought.decision).toBe("approve");
    expect(JSON.stringify(bought.data)).toMatch(/winding-up petitions/);

    const call = (headers: Record<string, string>) =>
      x402Get(new Request("http://localhost:3000/api/x402/research/DL-HARBOR", { headers }), {
        params: Promise.resolve({ productId: "DL-HARBOR" }),
      });
    const unpaid = await call({});
    expect(unpaid.status).toBe(402);
    expect(
      ((await unpaid.json()) as { accepts: { maxAmountRequired: string }[] }).accepts[0]!
        .maxAmountRequired,
    ).toBe("0.50");

    const readOnly = createApiKey(db, ID, "reader", ["read"]).key;
    expect(
      (await call({ authorization: `Bearer ${readOnly}`, "x-payment": "myliquid-wallet" })).status,
    ).toBe(402);

    const payer = createApiKey(db, ID, "payer", ["pay"]).key;
    const paid = await call({ authorization: `Bearer ${payer}`, "x-payment": "myliquid-wallet" });
    expect(paid.status).toBe(200);
    expect(paid.headers.get("x-payment-response")).toMatch(/"success":true/);
    expect(getWalletBalance(db, ID)).toBe(9_00);
  });
});
