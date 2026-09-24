import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, setDb, type Db } from "@/lib/db";
import { listProposals } from "@/lib/services/proposals";
import { listRules } from "@/lib/services/rules";
import { getMandate } from "@/lib/services/repo";
import type { DeskEvent } from "../events";
import { matchProduct, offlineCopilot, runOfflineRoutine } from "../offline";
import { AGENTS } from "../registry";
import { runDeskCycle } from "../runner";
import { TOOLS, invokeTool, toolInputSchema, toolsFor } from "../tools";
import { listAlerts } from "@/lib/services/alerts";

let db: Db;
const events: DeskEvent[] = [];
const emit = (e: DeskEvent) => events.push(e);

beforeEach(() => {
  db = openDatabase(":memory:", { today: "2026-09-24" });
  setDb(db);
  events.length = 0;
});

describe("tool definitions", () => {
  it("every agent's tools exist and produce object JSON schemas", () => {
    for (const agent of Object.values(AGENTS)) {
      for (const tool of toolsFor(agent.tools)) {
        const schema = toolInputSchema(tool);
        expect(schema.type).toBe("object");
        expect(schema.$schema).toBeUndefined();
      }
    }
  });

  it("rejects invalid input and blocks trading tools while paused", () => {
    const propose = TOOLS.find((t) => t.name === "propose_trade")!;
    const bad = invokeTool(
      propose,
      { productId: "NOPE", side: "buy", amountUsd: 10, rationale: "testing" },
      { db, agent: "atlas", runId: null },
    );
    expect(bad.ok).toBe(false);
    const pause = TOOLS.find((t) => t.name === "pause_all_agents")!;
    invokeTool(pause, { reason: "unit test emergency" }, { db, agent: "sentinel", runId: null });
    const paused = invokeTool(
      propose,
      { productId: "MLWX", side: "buy", amountUsd: 100, rationale: "testing" },
      { db, agent: "atlas", runId: null },
    );
    expect(paused.ok).toBe(false);
    expect(String(paused.result.error)).toMatch(/paused/);
  });
});

describe("offline desk", () => {
  it("runs a full desk cycle: alerts, reviews and a rebalance proposal", async () => {
    await runDeskCycle(emit);
    const finished = events.filter((e) => e.type === "run_finished");
    expect(finished.map((e) => (e as { agent: string }).agent)).toEqual([
      "ledger",
      "scout",
      "sentinel",
      "atlas",
      "quant",
    ]);
    const alerts = listAlerts(db, { openOnly: true });
    expect(alerts.some((a) => a.code === "valuation_self_marked")).toBe(true);
    expect(alerts.some((a) => a.code === "bitcoin_limit")).toBe(true);
    expect(
      listProposals(db, { status: "pending" }).some((p) => p.title.startsWith("Rebalance")),
    ).toBe(true);
  });

  it("Scout's routine rejects the shipyard bond", () => {
    const digest = runOfflineRoutine("scout", { db, agent: "scout", runId: null }, emit);
    expect(digest).toMatch(/⛔ \*\*Nordhavn Shipyard Bond\*\*/);
  });
});

describe("offline copilot", () => {
  const ask = (q: string) => offlineCopilot(q, { db, agent: "copilot", runId: null }, emit);

  it("matches products by alias", () => {
    expect(matchProduct("buy some bitcoin")).toBe("BTC");
    expect(matchProduct("the shipyard bond")).toBe("DL-NORDHAVN");
    expect(matchProduct("MLWX please")).toBe("MLWX");
  });

  it("answers liquidity, refuses withdrawals and proposes trades", () => {
    expect(ask("How liquid am I?")).toMatch(/liquidity ladder/i);
    expect(ask("withdraw $5,000 to my bank")).toMatch(/human-only/);
    expect(ask("buy $2,000 of the global index")).toMatch(/inbox/);
    expect(listProposals(db, { status: "pending" })).toHaveLength(1);
    expect(ask("buy $1,000 of the Nordhavn shipyard bond")).toMatch(/blocked/i);
  });

  it("compiles a plain-language rule, paused", () => {
    const reply = ask("If bitcoin falls 20% from its high, buy $1,000");
    expect(reply).toMatch(/paused/);
    const rule = listRules(db)[0]!;
    expect(rule.condition).toBe("drawdown_below");
    expect(rule.threshold).toBeCloseTo(-0.2);
    expect(rule.amountCents).toBe(1_000_00);
    expect(rule.status).toBe("paused");
  });

  it("can pull the kill switch but never release it", () => {
    ask("pause all agents now");
    expect(getMandate(db).killSwitch).toBe(true);
  });
});
