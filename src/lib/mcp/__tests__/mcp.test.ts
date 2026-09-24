import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, type Db } from "@/lib/db";
import { POST } from "@/app/api/mcp/route";
import { createApiKey } from "@/lib/services/apiKeys";
import { listEvents } from "@/lib/services/audit";
import { listProposals } from "@/lib/services/proposals";

/** Drives the real /api/mcp route handler with JSON-RPC requests, as an MCP client would. */

let db: Db;
let readKey: string;
let tradeKey: string;

beforeEach(() => {
  db = openDatabase(":memory:", { today: "2026-09-24" });
  setDb(db);
  readKey = createApiKey(db, ID, "reader", ["read"]).key;
  tradeKey = createApiKey(db, ID, "trader", ["read", "trade"]).key;
});

async function rpc(
  key: string | null,
  method: string,
  params: unknown = {},
  headers: Record<string, string> = {},
) {
  const res = await POST(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
        ...headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  return {
    status: res.status,
    body: (await res.json()) as { result?: Record<string, unknown>; error?: { message: string } },
  };
}

function toolText(body: { result?: Record<string, unknown> }): Record<string, unknown> {
  const content = body.result?.content as { type: string; text: string }[];
  return JSON.parse(content[0]!.text) as Record<string, unknown>;
}

describe("MCP endpoint", () => {
  it("rejects missing keys and cross-site origins", async () => {
    expect((await rpc(null, "tools/list")).status).toBe(401);
    expect((await rpc("mlk_bad", "tools/list")).status).toBe(401);
    expect((await rpc(readKey, "tools/list", {}, { origin: "https://evil.example" })).status).toBe(
      403,
    );
  });

  it("initializes and lists only the tools the key's scope allows", async () => {
    const init = await rpc(readKey, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    });
    expect(init.status).toBe(200);
    expect((init.body.result?.serverInfo as { name: string }).name).toBe("myliquid");

    const readTools = (
      (await rpc(readKey, "tools/list")).body.result?.tools as { name: string }[]
    ).map((t) => t.name);
    expect(readTools).toContain("get_portfolio");
    expect(readTools).not.toContain("propose_trade");
    const tradeTools = (
      (await rpc(tradeKey, "tools/list")).body.result?.tools as { name: string }[]
    ).map((t) => t.name);
    expect(tradeTools).toContain("propose_trade");
    for (const forbidden of ["withdraw", "deposit", "update_settings"])
      expect(tradeTools).not.toContain(forbidden);
  });

  it("answers read tools with live numbers", async () => {
    const res = await rpc(readKey, "tools/call", { name: "get_portfolio", arguments: {} });
    expect(res.body.result?.isError).toBe(false);
    expect(toolText(res.body).riskProfile).toMatchObject({ name: "Balanced" });
  });

  it("lets a trade key propose (not execute) and still blocks rejected deals", async () => {
    const ok = await rpc(tradeKey, "tools/call", {
      name: "propose_trade",
      arguments: {
        productId: "MLWX",
        side: "buy",
        amountUsd: 1000,
        rationale: "Test from an external agent",
      },
    });
    expect(toolText(ok.body).outcome).toBe("proposed");
    expect(listProposals(db, ID, { status: "pending" })[0]!.agent).toBe("external");

    const bad = await rpc(tradeKey, "tools/call", {
      name: "propose_trade",
      arguments: {
        productId: "DL-NORDHAVN",
        side: "buy",
        amountUsd: 1000,
        rationale: "Try the shipyard bond",
      },
    });
    expect(toolText(bad.body).outcome).toBe("blocked");

    const denied = await rpc(readKey, "tools/call", {
      name: "propose_trade",
      arguments: {
        productId: "MLWX",
        side: "buy",
        amountUsd: 1000,
        rationale: "Read key should not trade",
      },
    });
    expect(denied.body.result?.isError ?? !!denied.body.error).toBe(true);

    expect(listEvents(db, ID, { agent: "external" }).length).toBeGreaterThanOrEqual(2);
  });
});
