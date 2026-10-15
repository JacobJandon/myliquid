import { describe, expect, it, vi } from "vitest";

/**
 * MyLiquid against a live AINRA registrar (AINRA's registrar-box), end to end, at the real time. Skipped unless one
 * is running: `scripts/ainra-live.sh` starts one and prints the variables, then
 *   AINRA_TEST_REGISTRAR_URL=… AINRA_TEST_REGISTRAR_TOKEN=… AINRA_TEST_ROOTS_FILE=… AINRA_TEST_DIRECTORY_FILE=… npx vitest run ainra-live
 */
const live = process.env.AINRA_TEST_REGISTRAR_URL;

describe.skipIf(!live)("AINRA live registrar", () => {
  it("issues hosted traders real identities, verifies them at the real time, and revokes them", async () => {
    vi.stubEnv("AINRA_REGISTRAR_URL", live!);
    vi.stubEnv("AINRA_REGISTRAR_TOKEN", process.env.AINRA_TEST_REGISTRAR_TOKEN ?? "");
    vi.stubEnv("AINRA_ROOTS_FILE", process.env.AINRA_TEST_ROOTS_FILE ?? "");
    vi.stubEnv("AINRA_DIRECTORY_FILE", process.env.AINRA_TEST_DIRECTORY_FILE ?? "");
    vi.resetModules();
    const { ainraMode } = await import("@/lib/ainra");
    const { registrarEnabled, registrarHealth } = await import("@/lib/ainra/registrar");
    const { DEMO_INVESTOR_ID: ID, openDatabase, setDb } = await import("@/lib/db");
    const { hireTrader, listHostedTraders, revokeTraderIdentity, runTrader } =
      await import("@/lib/services/hostedTraders");
    const { listApiKeys } = await import("@/lib/services/apiKeys");
    const { listAlerts } = await import("@/lib/services/alerts");

    expect(ainraMode()).toBe("configured");
    expect(registrarEnabled()).toBe(true);
    const before = await registrarHealth();
    expect(before.ok).toBe(true);

    const db = openDatabase(":memory:", { today: "2026-10-15" });
    setDb(db);
    const limits = {
      mode: "auto" as const,
      perTradeLimitCents: 1_000_00,
      dailyLimitCents: 3_000_00,
    };

    // Hiring issues a real passport at the registrar, and the trader enrolls with a fresh presentation of it.
    const trader = await hireTrader(db, ID, "momentum-trader", limits);
    expect(trader.ainraSub).toMatch(
      /^ainra:[a-z0-9-]+:myliquid:momentum-trader-[a-z0-9-]+@1\.0\.0$/,
    );
    expect((await registrarHealth()).records).toBe(before.records + 1);

    // A run presents a fresh passport (verified now, not at a pinned time) and trades through the MCP tools.
    const run = await runTrader(db, ID, trader.id, { force: true });
    expect(run?.stopped).toBeNull();
    expect(run?.note).toContain("Signals:");

    // The operator revokes it: MyLiquid refuses it at once, revokes nothing else, and says so.
    const revoked = await revokeTraderIdentity(db, ID, trader.id);
    expect(revoked.reason).toBe("revoked");
    // It can't work again: runs are refused and it can't be resumed.
    expect(listHostedTraders(db, ID)[0]?.status).toBe("revoked");
    expect(await runTrader(db, ID, trader.id, { force: true })).toBeNull();
    expect(trader.label).toBe("MyLiquid Momentum Trader");
    expect(
      listAlerts(db, ID, { openOnly: true }).some((a) => a.code === "agent_passport_revoked"),
    ).toBe(true);
    expect(listApiKeys(db, ID).find((k) => k.id === trader.keyId)).toBeDefined();
    expect(listHostedTraders(db, ID)).toHaveLength(1);
  }, 60_000);
});
