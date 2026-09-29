import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Db } from "@/lib/db";
import { compactJson } from "@/lib/agents/llm";
import { TOOLS, invokeTool } from "@/lib/agents/tools";
import { logEvent } from "@/lib/services/audit";
import type { GatedPrincipal } from "@/lib/services/agentIdentity";
import type { ApiScope } from "@/lib/services/apiKeys";

/**
 * "Bring your own agent": MyLiquid's tools over the Model Context Protocol,
 * the way Robinhood, Webull, Gemini and Coinbase expose trading to external
 * agents. An external agent gets exactly the tools the desk agents use, under
 * the same guardrails: Sentinel's checks, the investor's autonomy setting, the
 * mandate and the kill switch. It never gets withdrawals or settings.
 */

export const MCP_SERVER_VERSION = "0.2.0";

/** Tools available per scope. Anything not listed is never exposed over MCP. */
export const SCOPE_TOOLS: Record<ApiScope, string[]> = {
  read: [
    "get_portfolio",
    "get_liquidity_ladder",
    "list_products",
    "get_market_signals",
    "list_deals",
    "review_valuations",
    "check_portfolio_risk",
    "plan_rebalance",
    "preview_trade",
    "list_autopilot_rules",
    "get_standing_orders",
    "get_recent_activity",
    "get_my_permissions",
    "get_wallet",
    "list_nearby_terminals",
  ],
  trade: ["propose_trade", "propose_rebalance", "create_autopilot_rule", "pause_all_agents"],
  pay: ["pay_terminal_request", "buy_premium_data"],
};

export function toolNamesFor(scopes: ApiScope[]): string[] {
  return Array.from(new Set(scopes.flatMap((s) => SCOPE_TOOLS[s] ?? [])));
}

const INSTRUCTIONS = `MyLiquid is an agentic wealth platform with simulated markets and demo money. You are acting for one investor.
Numbers must come from tool results. Trades go through propose_trade or propose_rebalance: they run pre-trade risk checks and usually create a proposal the investor approves in the MyLiquid app. You cannot withdraw money or change the investor's guardrails. Private deals that the platform's diligence rejected can never be bought, and locked positions cannot be sold before their lock-up ends.
Identity decides autonomy. If your key is pinned to your AINRA identity, present your passport ({"ainra_passport": …} to /api/agent-identity) at least every 5 minutes. An identified agent at AINRA tier L2 or above whose passport declares myliquid:trade, and whom the investor allowed to trade on its own, executes propose_trade within its limits; otherwise trades become proposals. Call get_my_permissions to see yours.`;

export function buildMcpServer(db: Db, principal: GatedPrincipal): McpServer {
  const server = new McpServer(
    { name: "myliquid", version: MCP_SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );
  const allowed = new Set(toolNamesFor(principal.scopes));
  for (const tool of TOOLS.filter((t) => allowed.has(t.name))) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
        annotations: { readOnlyHint: SCOPE_TOOLS.read.includes(tool.name) },
      },
      async (args: unknown) => {
        const outcome = invokeTool(tool, args, {
          db,
          investorId: principal.investorId,
          agent: "external",
          runId: null,
          outside: principal.trader,
        });
        logEvent(db, principal.investorId, {
          agent: "external",
          kind: "tool_call",
          title: `${principal.keyName}${principal.ainraNumber ? ` (${principal.ainraNumber})` : ""}: ${tool.name}(${compactJson(args)})`,
          payload: {
            keyId: principal.keyId,
            ainraNumber: principal.ainraNumber ?? null,
            ok: outcome.ok,
          },
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(outcome.result, null, 2) }],
          isError: !outcome.ok,
        };
      },
    );
  }
  return server;
}

/** Handles one stateless Streamable HTTP request (JSON responses, no sessions). */
export async function handleMcpRequest(
  req: Request,
  db: Db,
  principal: GatedPrincipal,
): Promise<Response> {
  const server = buildMcpServer(db, principal);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

export interface McpToolResult {
  ok: boolean;
  data: Record<string, unknown>;
}

/**
 * Calls one tool through the MCP server in-process, as JSON-RPC, exactly as an outside agent's HTTP request
 * would after authentication and the identity gate. Used by the traders MyLiquid hosts.
 */
export async function callMcpTool(
  db: Db,
  principal: GatedPrincipal,
  name: string,
  args: Record<string, unknown> = {},
): Promise<McpToolResult> {
  const req = new Request("http://myliquid.internal/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const res = await handleMcpRequest(req, db, principal);
  const body = (await res.json().catch(() => ({}))) as {
    result?: { content?: { text?: string }[]; isError?: boolean };
    error?: { message?: string };
  };
  if (!body.result)
    return { ok: false, data: { error: body.error?.message ?? `HTTP ${res.status}` } };
  const text = body.result.content?.[0]?.text ?? "";
  try {
    return { ok: !body.result.isError, data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { ok: false, data: { error: text } };
  }
}

// Simple per-key rate limit: 120 requests per minute.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const hits = new Map<string, number[]>();

export function rateLimited(keyId: string, now = Date.now()): boolean {
  const recent = (hits.get(keyId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(keyId, recent);
  return recent.length > MAX_REQUESTS;
}
