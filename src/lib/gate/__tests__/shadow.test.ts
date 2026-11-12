import { describe, expect, it } from "vitest";
import { testbedBundle } from "@/lib/ainra";
import { createGateProxy, type ProxyCall, type ProxyConfig } from "../proxy";
import { replayShadow, shadowLine, shadowReport } from "../shadow";

/** Shadow mode: the proxy's decision, replayed out of band on a log of agent calls. */

const config: ProxyConfig = {
  upstream: "http://broker.example/mcp",
  policy: {
    mode: "auto",
    perActionLimitCents: 2_000_00,
    dailyLimitCents: 2_500_00,
    allowedInstruments: ["MLUS", "MLWX"],
    maxActionsPerHour: 10,
  },
  tools: [
    {
      tool: "propose_trade",
      kind: "trade",
      amount: { field: "amountUsd", unit: "dollars" },
      side: { field: "side" },
      instrument: { field: "productId" },
    },
  ],
};

const AGENT = "did:ainra:registrar-07:northwind:momentum-trader";

const trade = (amountUsd: unknown, productId = "MLUS", passport?: unknown) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "propose_trade",
    arguments: { productId, side: "buy", ...(amountUsd === undefined ? {} : { amountUsd }) },
    ...(passport ? { _meta: { "ainra/passport": passport } } : {}),
  },
});
const line = (at: string, request: unknown, headers?: Record<string, unknown>) =>
  JSON.stringify({ at, request, ...(headers ? { headers } : {}) });

describe("Gate shadow replay", () => {
  it("decides each money-moving call as the proxy would, and passes the rest through", async () => {
    const passport = await testbedBundle("momentum-trader");
    const log = [
      line("2026-12-08T15:00:00Z", { jsonrpc: "2.0", id: 1, method: "tools/list" }),
      line("2026-12-08T15:00:01Z", trade(1_500, "MLUS", passport)),
      line("2026-12-08T15:00:02Z", trade(100)), // no passport: a person decides
      line("2026-12-08T15:00:03Z", trade(100, "BTC", passport)), // not an allowed instrument
      line("2026-12-08T15:00:04Z", {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "get_portfolio", arguments: {} },
      }),
      // The passport can come in the header instead of _meta.
      line("2026-12-08T15:00:05Z", trade(500, "MLWX"), { "x-ainra-passport": passport }),
    ].join("\n");
    const r = replayShadow(config, log);
    expect(r.lines).toBe(6);
    expect(r.passedThrough).toEqual({ "tools/list": 1, get_portfolio: 1 });
    expect(r.decided.map((d) => [d.line, d.agentId, d.decision.decision])).toEqual([
      [2, AGENT, "allow"],
      [3, "unidentified", "review"],
      [4, AGENT, "block"],
      [6, AGENT, "allow"],
    ]);
    expect(r.unreadable).toEqual([]);
    expect(r.from).toBe("2026-12-08T15:00:00.000Z");
    expect(r.to).toBe("2026-12-08T15:00:05.000Z");
  });

  it("matches the live proxy's decision exactly, evidence hash included", async () => {
    const passport = await testbedBundle("momentum-trader");
    const at = "2026-12-08T15:00:00Z";
    const seen: ProxyCall[] = [];
    const proxy = createGateProxy(config, {
      fetch: (async () =>
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: { content: [] },
        })) as unknown as typeof fetch,
      now: () => new Date(at),
      onDecision: (c) => void seen.push(c),
    });
    for (const amount of [1_500, 1_500, 100]) {
      await proxy(
        new Request("http://gate.example/mcp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(trade(amount, amount === 100 ? "BTC" : "MLUS", passport)),
        }),
      );
    }
    const r = replayShadow(
      config,
      [1_500, 1_500, 100]
        .map((a) => line(at, trade(a, a === 100 ? "BTC" : "MLUS", passport)))
        .join("\n"),
    );
    expect(r.decided.map((d) => d.decision.decision)).toEqual(["allow", "review", "block"]);
    expect(r.decided.map((d) => d.decision.evidence.decisionHash)).toEqual(
      seen.map((c) => c.decision.evidence.decisionHash),
    );
  });

  it("replays in time order, so the daily limit counts the way it would have", async () => {
    const passport = await testbedBundle("momentum-trader");
    const r = replayShadow(
      config,
      [
        line("2026-12-08T15:30:00Z", trade(1_500, "MLWX", passport)),
        line("2026-12-08T15:00:00Z", trade(1_500, "MLUS", passport)),
        // Held calls don't use up the limit: $1,000 more still fits after the review.
        line("2026-12-08T15:45:00Z", trade(1_000, "MLUS", passport)),
      ].join("\n"),
    );
    expect(r.decided.map((d) => [d.line, d.decision.decision])).toEqual([
      [2, "allow"],
      [1, "review"],
      [3, "allow"],
    ]);
  });

  it("lists what it can't read and never guesses: unreadable amounts are blocked", () => {
    const log = [
      "this line was cut off",
      JSON.stringify({ request: trade(20) }), // no time
      line("2026-12-08T15:00:00Z", trade(undefined)), // no amount
      line("2026-12-08T15:00:01Z", [trade(10), { jsonrpc: "2.0", id: 9, method: "tools/list" }]),
      line("2026-12-08T15:00:02Z", "tools/call"),
      "",
    ].join("\n");
    const r = replayShadow(config, log);
    expect(r.lines).toBe(5);
    expect(r.unreadable.map((u) => u.line)).toEqual([1, 2, 4, 5]);
    expect(r.unreadable[1]!.reason).toMatch(/not guessed/);
    expect(r.unreadable[2]!.reason).toMatch(/one at a time/);
    expect(r.decided).toHaveLength(1);
    expect(r.decided[0]).toMatchObject({
      line: 3,
      action: null,
      unreadable: 'No amount in "amountUsd".',
    });
    expect(r.decided[0]!.decision.decision).toBe("block");
    expect(JSON.parse(shadowLine(r.decided[0]!))).toMatchObject({
      line: 3,
      decision: "block",
      unreadable: 'No amount in "amountUsd".',
      decisionHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("writes a report with the counts, the reasons and every unreadable line", async () => {
    const passport = await testbedBundle("momentum-trader");
    const log = [
      line("2026-12-08T15:00:00Z", trade(1_500, "MLUS", passport)),
      line("2026-12-08T15:00:01Z", trade(100)),
      line("2026-12-08T15:00:02Z", trade(100, "BTC", passport)),
      line("2026-12-08T15:00:03Z", trade(undefined)),
      "{broken",
    ].join("\n");
    const report = shadowReport(replayShadow(config, log));
    expect(report).toContain("Money-moving calls decided: **4**");
    expect(report).toContain("| Allowed on its own | 1 | 25% | $1,500 |");
    expect(report).toContain("| Sent to a person | 1 | 25% | $100.00 |");
    expect(report).toContain("| Blocked | 2 | 50% | $100.00 |");
    expect(report).toContain(`| ${AGENT} | 1 | 0 | 1 |`);
    expect(report).toContain("| Unidentified (no verified passport) | 0 | 1 | 1 |");
    expect(report).toMatch(/\| Instrument \| blocked \| 1 \|/);
    expect(report).toContain('| Action not readable | blocked | 1 | No amount in "amountUsd". |');
    expect(report).not.toMatch(/\| Amount \|/);
    expect(report).toContain('- Line 4, `propose_trade`: No amount in "amountUsd".');
    expect(report).toContain("- Line 5: Not JSON.");
  });
});
