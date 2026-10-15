import { describe, expect, it } from "vitest";
import { testbedBundle } from "@/lib/ainra";
import {
  type GateDecision,
  type GateIdentity,
  type GateRequest,
  canonical,
  decide,
  verifyEvidence,
} from "../engine";
import { identityFromPassport } from "../identity";

const now = new Date("2026-10-15T12:00:00Z");

const L2_TRADER: GateIdentity = {
  verified: true,
  number: "did:ainra:registrar-07:northwind:momentum-trader",
  name: "Northwind Momentum Trader",
  tier: "L2",
  capabilities: ["myliquid:read", "myliquid:trade"],
  reason: null,
};
const UNVERIFIED: GateIdentity = {
  verified: false,
  number: null,
  name: null,
  tier: null,
  capabilities: [],
  reason: "none",
};

function req(over: Partial<GateRequest> & { amountCents?: number } = {}): GateRequest {
  const { amountCents = 1_000_00, ...rest } = over;
  return {
    action: { kind: "trade", amountCents, side: "buy", instrument: "MLUS" },
    agent: { id: "northwind-momentum", identity: L2_TRADER },
    policy: { mode: "auto", perActionLimitCents: 2_000_00, dailyLimitCents: 5_000_00 },
    usage: { usedTodayCents: 0, actionsLastHour: 0 },
    ...rest,
  };
}

const status = (d: GateDecision, id: string) => d.checks.find((c) => c.id === id)?.status;

describe("Gate decisions", () => {
  it("allows an identified agent inside every limit", () => {
    const d = decide(req(), { now });
    expect(d.decision).toBe("allow");
    expect(d.checks.every((c) => c.status === "pass")).toBe(true);
    expect(d.summary).toBe("Allowed: northwind-momentum may buy MLUS for $1,000 on its own.");
  });

  it("sends unidentified agents to a person, never through", () => {
    const d = decide(req({ agent: { id: "x", identity: UNVERIFIED } }), { now });
    expect(d.decision).toBe("review");
    expect(status(d, "identity")).toBe("review");
    expect(d.summary).toContain("didn't present an AINRA passport");
  });

  it("caps autonomy by the identity tier, the declared capability and the firm's limits", () => {
    expect(
      status(
        decide(
          req({
            amountCents: 3_000_00,
            policy: { mode: "auto", perActionLimitCents: 5_000_00, dailyLimitCents: 9_000_00 },
          }),
          { now },
        ),
        "tier",
      ),
    ).toBe("review");
    const l1 = decide(req({ agent: { id: "a", identity: { ...L2_TRADER, tier: "L1" } } }), { now });
    expect(status(l1, "tier")).toBe("review");
    const noPay = decide(
      req({
        action: { kind: "payment", amountCents: 50_00, merchant: "Brew Lab", category: "food" },
      }),
      { now },
    );
    expect(status(noPay, "capability")).toBe("review");
    expect(decide(req({ amountCents: 2_500_00 }), { now }).decision).toBe("review"); // per-action limit
    expect(
      status(decide(req({ usage: { usedTodayCents: 4_500_00 } }), { now }), "daily_limit"),
    ).toBe("review");
    const busy = decide(
      req({
        policy: {
          mode: "auto",
          perActionLimitCents: 2_000_00,
          dailyLimitCents: 5_000_00,
          maxActionsPerHour: 3,
        },
        usage: { actionsLastHour: 3 },
      }),
      { now },
    );
    expect(status(busy, "rate")).toBe("review");
    const propose = decide(
      req({
        policy: { mode: "propose", perActionLimitCents: 2_000_00, dailyLimitCents: 5_000_00 },
      }),
      { now },
    );
    expect(propose.decision).toBe("review");
  });

  it("blocks on the kill switch, a bad amount, an instrument off the list or a blocked category", () => {
    const base = {
      mode: "auto" as const,
      perActionLimitCents: 2_000_00,
      dailyLimitCents: 5_000_00,
    };
    expect(decide(req({ policy: { ...base, killSwitch: true } }), { now }).decision).toBe("block");
    expect(decide(req({ amountCents: 0 }), { now }).decision).toBe("block");
    expect(decide(req({ amountCents: 10.5 }), { now }).decision).toBe("block");
    const offList = decide(req({ policy: { ...base, allowedInstruments: ["mlwx"] } }), { now });
    expect(offList.decision).toBe("block");
    expect(offList.summary).toContain("MLUS: not on the allowed list (MLWX)");
    const pay = decide(
      req({
        agent: { id: "t", identity: { ...L2_TRADER, capabilities: ["myliquid:pay"] } },
        action: {
          kind: "payment",
          amountCents: 20_00,
          merchant: "Lucky Spin",
          category: "Gambling",
        },
        policy: { ...base, blockedCategories: ["gambling"] },
      }),
      { now },
    );
    expect(pay.decision).toBe("block");
    // A block outranks any review.
    expect(
      decide(
        req({ agent: { id: "x", identity: UNVERIFIED }, policy: { ...base, killSwitch: true } }),
        { now },
      ).decision,
    ).toBe("block");
  });

  it("fingerprints each decision so any change to it shows", () => {
    const r = req();
    const d = decide(r, { now });
    expect(d.evidence.requestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.evidence.decidedAt).toBe(now.toISOString());
    expect(verifyEvidence(r, d)).toBe(true);
    expect(verifyEvidence({ ...r, action: { ...r.action, amountCents: 999_00 } }, d)).toBe(false);
    expect(verifyEvidence(r, { ...d, decision: "block" })).toBe(false);
    expect(verifyEvidence(r, { ...d, checks: d.checks.slice(1) })).toBe(false);
    // The same request always hashes the same, whatever its key order.
    expect(canonical({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe('{"a":[2,{"c":4,"d":3}],"b":1}');
  });
});

describe("Gate identity", () => {
  it("trusts only a passport that verifies through AINRA", async () => {
    const valid = identityFromPassport(await testbedBundle("momentum-trader"));
    expect(valid.verified).toBe(true);
    expect(valid.tier).toBe("L2");
    expect(valid.capabilities).toContain("myliquid:trade");

    const revoked = identityFromPassport(await testbedBundle("yield-hunter", { revoked: true }));
    expect(revoked.verified).toBe(false);
    expect(revoked.reason).toBe("revoked");
    expect(revoked.capabilities).toEqual([]);

    expect(identityFromPassport(undefined)).toMatchObject({ verified: false, reason: "none" });
    expect(identityFromPassport({ claims: { tier: "L4" } })).toMatchObject({ verified: false });
  });

  it("decides end to end on real testbed passports", async () => {
    const treasury = identityFromPassport(await testbedBundle("treasury-agent"));
    const pay = decide(
      {
        action: {
          kind: "payment",
          amountCents: 120_00,
          merchant: "Cloud data",
          category: "software",
        },
        agent: { id: "harbor-treasury", identity: treasury },
        policy: { mode: "auto", perActionLimitCents: 500_00, dailyLimitCents: 2_000_00 },
      },
      { now },
    );
    expect(pay.decision).toBe("allow");

    const analyst = identityFromPassport(await testbedBundle("research-analyst"));
    const trade = decide(req({ agent: { id: "northwind-research", identity: analyst } }), { now });
    expect(trade.decision).toBe("review"); // L1, and it doesn't declare myliquid:trade
  });
});
