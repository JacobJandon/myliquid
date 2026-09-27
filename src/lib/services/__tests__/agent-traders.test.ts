import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, type Db } from "@/lib/db";
import { POST as mcpPost } from "@/app/api/mcp/route";
import { POST as presentPost } from "@/app/api/agent-identity/route";
import { POST as enrollPost } from "@/app/api/agent-identity/enroll/route";
import { testbedBundle, type TestbedAgentId } from "@/lib/ainra";
import { autonomyDecision, type OutsideTrader } from "@/lib/domain/agentTrading";
import { listAlerts } from "@/lib/services/alerts";
import { createApiKey } from "@/lib/services/apiKeys";
import { wallNow } from "@/lib/services/agentIdentity";
import {
  EnrollError,
  createInvite,
  enrollAgent,
  listInvites,
  type NewInvite,
} from "@/lib/services/agentInvites";
import { listOrders } from "@/lib/services/orders";
import { listProposals } from "@/lib/services/proposals";
import { updateMandate } from "@/lib/services/repo";

const TRADER: OutsideTrader = {
  keyId: "key_x",
  keyName: "trader",
  ainraNumber: "did:ainra:registrar-07:northwind:momentum-trader",
  ainraName: "ainra:registrar-07:northwind:momentum-trader@1.0.0",
  tier: "L2",
  capabilities: ["myliquid:read", "myliquid:trade"],
  identified: true,
  mode: "auto",
  perTradeLimitCents: 1_000_00,
  dailyLimitCents: 3_000_00,
};

describe("outside traders: their AINRA identity decides their autonomy", () => {
  it("lets only an identified L2+ trader that declares myliquid:trade act on its own", () => {
    expect(autonomyDecision(TRADER, 500_00, 0)).toEqual({ auto: true });
    const no = (t: Partial<OutsideTrader>, amount = 500_00, used = 0) => {
      const d = autonomyDecision({ ...TRADER, ...t }, amount, used);
      return d.auto ? "auto" : d.reason;
    };
    expect(no({ ainraNumber: null })).toMatch(/isn't pinned to an AINRA identity/);
    expect(no({ identified: false })).toMatch(/hasn't presented a fresh AINRA passport/);
    expect(no({ mode: "propose" })).toMatch(/propose only/);
    expect(no({ tier: "L1" })).toMatch(/tier L1 can't trade on its own/);
    expect(no({ capabilities: ["myliquid:read"] })).toMatch(/doesn't declare myliquid:trade/);
    expect(no({}, 1_500_00)).toMatch(/Above its \$1,000 per-trade limit/);
    expect(no({}, 800_00, 2_500_00)).toMatch(/past its \$3,000 daily limit/);
  });

  it("caps the investor's per-trade limit at the tier's ceiling", () => {
    const generous = { ...TRADER, perTradeLimitCents: 20_000_00, dailyLimitCents: 50_000_00 };
    expect(autonomyDecision(generous, 2_500_00, 0)).toEqual({ auto: true });
    const d = autonomyDecision(generous, 3_000_00, 0);
    expect(!d.auto && d.reason).toMatch(/most an L2 agent may trade on its own/);
    expect(autonomyDecision({ ...generous, tier: "L3" }, 9_000_00, 0)).toEqual({ auto: true });
  });
});

function mcp(key: string, method: string, params: Record<string, unknown> = {}) {
  return mcpPost(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
}

async function callTool(key: string, name: string, args: Record<string, unknown> = {}) {
  const res = await mcp(key, "tools/call", { name, arguments: args });
  const body = (await res.json()) as {
    result?: { content: { text: string }[]; isError?: boolean };
    error?: { message: string };
  };
  if (!body.result)
    return { status: res.status, isError: true, data: { error: body.error?.message } };
  const text = body.result.content[0]!.text;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { error: text };
  }
  return { status: res.status, isError: !!body.result.isError, data };
}

async function enroll(code: string, agent: TestbedAgentId, opts: { revoked?: boolean } = {}) {
  const res = await enrollPost(
    new Request("http://localhost:3000/api/agent-identity/enroll", {
      method: "POST",
      headers: { host: "localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({
        invite: code,
        ainra_passport: await testbedBundle(agent, opts),
      }),
    }),
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const trade = (amountUsd: number) => ({
  productId: "MLUS",
  side: "buy",
  amountUsd,
  rationale: "Momentum is positive and the position is small.",
});

describe("an outside agent enrolls with its AINRA passport and trades", () => {
  let db: Db;
  const invite = (input: Partial<NewInvite> = {}) =>
    createInvite(db, ID, {
      label: "Northwind",
      allowTrade: true,
      allowPay: false,
      tradeMode: "auto",
      perTradeLimitCents: 5_000_00,
      dailyLimitCents: 6_000_00,
      ...input,
    });

  beforeEach(() => {
    db = openDatabase(":memory:", { today: "2026-09-24" });
    setDb(db);
  });

  it("an invited L2 trader is identified from its first call and trades on its own within its limits", async () => {
    const { code } = invite();
    const enrolled = await enroll(code, "momentum-trader");
    expect(enrolled.status).toBe(201);
    expect(enrolled.body).toMatchObject({
      ok: true,
      identity: { number: "did:ainra:registrar-07:northwind:momentum-trader", tier: "L2" },
      scopes: ["read", "trade"],
      trading: { mode: "auto", per_trade_limit: "$2,500", daily_limit: "$6,000" },
    });
    expect((await enroll(code, "momentum-trader")).status).toBe(410); // one-time
    const key = enrolled.body.api_key as string;

    const me = await callTool(key, "get_my_permissions");
    expect(me.data).toMatchObject({
      ainra: { tier: "L2", presentationFresh: true },
      trading: { perTradeLimit: "$2,500", leftToday: "$6,000" },
    });

    const first = await callTool(key, "propose_trade", trade(500));
    expect(first.data).toMatchObject({ outcome: "executed" });
    const order = listOrders(db, ID, 1)[0]!;
    expect(order).toMatchObject({
      placedBy: "external",
      autonomous: true,
      ainraNumber: "did:ainra:registrar-07:northwind:momentum-trader",
    });

    const big = await callTool(key, "propose_trade", trade(3_000));
    expect(big.data).toMatchObject({ outcome: "proposed" });
    expect(big.data.whyNotAutomatic).toMatch(/most an L2 agent may trade on its own/);
    const proposal = listProposals(db, ID, { status: "pending" })[0]!;
    expect(proposal.ainraNumber).toBe("did:ainra:registrar-07:northwind:momentum-trader");

    expect((await callTool(key, "propose_trade", trade(2_500))).data.outcome).toBe("executed");
    expect((await callTool(key, "propose_trade", trade(2_500))).data.outcome).toBe("executed");
    const over = await callTool(key, "propose_trade", trade(1_000));
    expect(over.data.outcome).toBe("proposed");
    expect(over.data.whyNotAutomatic).toMatch(/daily limit \(\$5,500 used today\)/);
  });

  it("an L1 analyst only reads, whatever the invite allowed", async () => {
    const enrolled = await enroll(invite().code, "research-analyst");
    expect(enrolled.body).toMatchObject({ scopes: ["read"], trading: { mode: "propose" } });
    const key = enrolled.body.api_key as string;
    const list = (await (await mcp(key, "tools/list")).json()) as {
      result: { tools: { name: string }[] };
    };
    const names = list.result.tools.map((t) => t.name);
    expect(names).toContain("get_portfolio");
    expect(names).not.toContain("propose_trade");
    expect((await callTool(key, "propose_trade", trade(100))).isError).toBe(true);
  });

  it("refuses a revoked agent, raises an alert and keeps the invite open", async () => {
    const { code, invite: created } = invite();
    const refused = await enroll(code, "yield-hunter", { revoked: true });
    expect(refused).toMatchObject({ status: 403, body: { ok: false, reason: "revoked" } });
    expect(listAlerts(db, ID, { openOnly: true }).map((a) => a.code)).toContain(
      "agent_enroll_revoked",
    );
    expect(listInvites(db, ID).find((i) => i.id === created.id)?.status).toBe("open");
  });

  it("withdraws a revoked agent's pending proposals and cuts it off", async () => {
    const enrolled = await enroll(invite({ tradeMode: "propose" }).code, "yield-hunter");
    const key = enrolled.body.api_key as string;
    const proposed = await callTool(key, "propose_trade", trade(400));
    expect(proposed.data).toMatchObject({ outcome: "proposed" });
    expect(proposed.data.whyNotAutomatic).toMatch(/propose only/);

    const present = await presentPost(
      new Request("http://localhost:3000/api/agent-identity", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          ainra_passport: await testbedBundle("yield-hunter", { revoked: true }),
        }),
      }),
    );
    expect(present.status).toBe(403);
    expect(listProposals(db, ID, { status: "withdrawn" })).toHaveLength(1);
    expect(listProposals(db, ID, { status: "pending" })).toHaveLength(0);
    expect((await mcp(key, "tools/list")).status).toBe(403);
  });

  it("won't redeem an expired invite, and validates limits", async () => {
    const { code } = invite();
    db.prepare("UPDATE agent_invites SET expires_at = ?").run(wallNow() - 1);
    expect(() => enrollAgent(db, code, null)).toThrow(EnrollError);
    expect(() => invite({ perTradeLimitCents: 0 })).toThrow(/per-trade limit/);
    expect(() => invite({ perTradeLimitCents: 1_000_00, dailyLimitCents: 500_00 })).toThrow(
      /daily limit/,
    );
  });

  it("keeps unidentified keys at proposals, even in bounded autonomy", async () => {
    updateMandate(db, ID, { autonomy: "bounded" });
    const { key } = createApiKey(db, ID, "plain key", ["read", "trade"]);
    const result = await callTool(key, "propose_trade", trade(300));
    expect(result.data).toMatchObject({ outcome: "proposed" });
    expect(result.data.whyNotAutomatic).toMatch(/isn't pinned to an AINRA identity/);
  });
});

describe("schema upgrade", () => {
  it("adds the outside-trader columns to an existing database in place", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "myliquid-")), "old.db");
    openDatabase(file, { today: "2026-09-24" }).close();
    const raw = new Database(file);
    raw.exec("DROP INDEX orders_agent_key; ALTER TABLE orders DROP COLUMN ainra_number;");
    raw.exec("ALTER TABLE api_key_identities DROP COLUMN trade_mode;");
    raw.close();
    const db = openDatabase(file);
    const cols = (t: string) =>
      (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
    expect(cols("orders")).toContain("ainra_number");
    expect(cols("api_key_identities")).toContain("trade_mode");
    expect(db.prepare("SELECT COUNT(*) AS n FROM investors").get()).toEqual({ n: 1 });
    db.close();
  });
});
