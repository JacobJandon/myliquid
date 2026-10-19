import { describe, expect, it, vi } from "vitest";
import { POST as mcpPost } from "@/app/api/mcp/route";
import { testbedBundle } from "@/lib/ainra";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb } from "@/lib/db";
import { createApiKey } from "@/lib/services/apiKeys";
import { actionFromCall, createGateProxy, type ProxyCall, type ProxyConfig } from "../proxy";

/** The proxy in front of a real MCP server: MyLiquid's own /api/mcp. */

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

function setup(policy: Partial<ProxyConfig["policy"]> = {}) {
  const db = openDatabase(":memory:", { today: "2026-10-15" });
  setDb(db);
  const { key } = createApiKey(db, ID, "Broker test agent", ["read", "trade"]);
  const upstream = vi.fn((url: string | URL | Request, init?: RequestInit) =>
    mcpPost(new Request(String(url), init)),
  );
  const decisions: ProxyCall[] = [];
  const reviews: ProxyCall[] = [];
  const proxy = createGateProxy(
    { ...config, policy: { ...config.policy, ...policy } },
    {
      fetch: upstream as unknown as typeof fetch,
      now: () => new Date("2026-10-15T15:00:00Z"),
      onDecision: (c) => void decisions.push(c),
      onReview: (c) => void reviews.push(c),
    },
  );
  let id = 0;
  const rpc = async (method: string, params: Record<string, unknown> = {}) => {
    const res = await proxy(
      new Request("http://gate.example/mcp", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-06-18",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
      }),
    );
    return (await res.json()) as {
      result?: {
        content: { text: string }[];
        isError?: boolean;
        _meta?: Record<string, { decision: string; decisionHash: string }>;
        tools?: { name: string }[];
      };
      error?: unknown;
    };
  };
  const trade = async (amountUsd: number, productId = "MLUS", passport?: unknown) =>
    rpc("tools/call", {
      name: "propose_trade",
      arguments: { productId, side: "buy", amountUsd, rationale: "Testing the guardrail proxy" },
      ...(passport ? { _meta: { "ainra/passport": passport } } : {}),
    });
  return { upstream, rpc, trade, decisions, reviews };
}

describe("MCP guardrail proxy", () => {
  it("passes everything that doesn't move money straight through", async () => {
    const { upstream, rpc, decisions } = setup();
    const list = await rpc("tools/list");
    expect(list.result?.tools?.map((t) => t.name)).toContain("propose_trade");
    const read = await rpc("tools/call", { name: "get_portfolio", arguments: {} });
    expect(read.result?.isError).toBeFalsy();
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(decisions).toHaveLength(0);
  });

  it("forwards an allowed trade from a verified agent, with Gate's evidence on the result", async () => {
    const { upstream, trade, decisions } = setup();
    const res = await trade(1_500, "MLUS", await testbedBundle("momentum-trader"));
    expect(upstream).toHaveBeenCalledTimes(1);
    // The upstream got the call without the 36 KB passport.
    const sent = JSON.parse(String(upstream.mock.calls[0]![1]!.body));
    expect(sent.params._meta).toBeUndefined();
    expect(res.result?._meta?.["myliquid/gate"]).toMatchObject({ decision: "allow" });
    expect(res.result?._meta?.["myliquid/gate"]?.decisionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decisions[0]).toMatchObject({
      agentId: "did:ainra:registrar-07:northwind:momentum-trader",
    });
  });

  it("holds anything that needs a person, and never sends it upstream", async () => {
    const { upstream, trade, reviews } = setup();
    const passport = await testbedBundle("momentum-trader");
    const big = await trade(5_000, "MLUS", passport); // above the per-action limit
    expect(big.result?.isError).toBe(true);
    expect(big.result?.content[0]!.text).toMatch(/needs a person's approval/);
    const anonymous = await trade(100); // no passport
    expect(anonymous.result?.content[0]!.text).toMatch(/identity|passport/i);
    const revoked = await trade(
      100,
      "MLUS",
      await testbedBundle("yield-hunter", { revoked: true }),
    );
    expect(revoked.result?._meta?.["myliquid/gate"]?.decision).toBe("review");
    expect(upstream).not.toHaveBeenCalled();
    expect(reviews).toHaveLength(3);
  });

  it("blocks what the firm forbids, and counts the daily limit across calls", async () => {
    const { upstream, trade } = setup();
    const passport = await testbedBundle("momentum-trader");
    const off = await trade(100, "BTC", passport); // not an allowed instrument
    expect(off.result?._meta?.["myliquid/gate"]?.decision).toBe("block");
    expect((await trade(1_500, "MLUS", passport)).result?._meta?.["myliquid/gate"]?.decision).toBe(
      "allow",
    );
    // $1,500 already used today; another $1,500 passes the $2,500 daily limit.
    expect((await trade(1_500, "MLWX", passport)).result?._meta?.["myliquid/gate"]?.decision).toBe(
      "review",
    );
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("stops every agent at once with the kill switch", async () => {
    const { upstream, trade } = setup({ killSwitch: true });
    const res = await trade(10, "MLUS", await testbedBundle("treasury-agent"));
    expect(res.result?._meta?.["myliquid/gate"]?.decision).toBe("block");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("reads the action from a tool's arguments, and fails closed when it can't", () => {
    const rule = config.tools[0]!;
    expect(actionFromCall(rule, { amountUsd: 12.34, side: "sell", productId: "MLUS" })).toEqual({
      action: { kind: "trade", amountCents: 1234, side: "sell", instrument: "MLUS" },
    });
    expect(actionFromCall(rule, { side: "buy" })).toEqual({ error: 'No amount in "amountUsd".' });
  });
});
