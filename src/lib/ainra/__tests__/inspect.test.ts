import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/ainra/inspect/route";
import { testbedBundle } from "../index";
import { TAMPERS, inspect, inspectInput } from "../inspect";

describe("AINRA inspector", () => {
  it("decodes a real passport and verifies it", async () => {
    const r = inspect(await testbedBundle("momentum-trader"));
    expect(r.check.status).toBe("valid");
    expect(r.anatomy.sub).toBe("ainra:registrar-07:northwind:momentum-trader@1.0.0");
    expect(r.anatomy.tier).toBe("L2");
    expect(r.anatomy.capabilities).toEqual(["myliquid:read", "myliquid:trade"]);
    // Hybrid signatures: a 64-byte Ed25519 and a 3,309-byte ML-DSA-65.
    expect(r.anatomy.signatures.ed25519).toBe(64);
    expect(r.anatomy.signatures.mldsa65).toBe(3309);
    expect(r.steps.every((s) => s.state === "pass")).toBe(true);
    expect(r.grant).toMatchObject({ scopes: ["read", "trade"], tradesOnItsOwn: true });
  });

  it("refuses every tampered copy for the reason AINRA gives, at the step it fails", async () => {
    for (const t of TAMPERS.filter((t) => t.expect)) {
      const r = await inspectInput({
        sample: t.id === "revoked" ? "yield-hunter" : "momentum-trader",
        tamper: t.id,
      });
      expect(r?.check.status, t.id).toBe("invalid");
      expect(r?.check.reason, t.id).toBe(t.expect);
      expect(r?.steps.filter((s) => s.state === "fail")).toHaveLength(1);
      expect(r?.grant.scopes).toEqual([]);
    }
  });

  it("grants by tier and declared capabilities", async () => {
    const reader = await inspectInput({ sample: "research-analyst" });
    expect(reader?.grant).toMatchObject({ scopes: ["read"], tradesOnItsOwn: false });
    const treasury = await inspectInput({ sample: "treasury-agent" });
    expect(treasury?.grant).toMatchObject({
      scopes: ["read", "trade", "pay"],
      tradesOnItsOwn: true,
      autoCeilingCents: 10_000_00,
    });
  });

  it("answers publicly, and says when input isn't a passport", async () => {
    const post = (body: unknown) =>
      POST(
        new Request("http://x/api/ainra/inspect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    const ok = await post({ sample: "treasury-agent", tamper: "quantum" });
    expect(ok.status).toBe(200);
    expect((await ok.json()).check.reason).toBe("alg_downgrade");
    expect((await post({ passport: "not a passport" })).status).toBe(400);
    expect((await post({ sample: "momentum-trader", tamper: "revoked" })).status).toBe(400);
  });
});
