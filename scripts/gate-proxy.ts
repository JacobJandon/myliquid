/**
 * MyLiquid Gate as an MCP guardrail proxy, standalone (src/lib/gate/proxy.ts). Put it in front of any MCP server;
 * money-moving tool calls go through Gate, everything else passes through.
 *
 *   npx tsx scripts/gate-proxy.ts scripts/gate-proxy.example.json      # PORT=8787 by default
 *
 * Config: { upstream, policy, tools, decisionsLog?, reviewWebhook? }. Every decision is appended to decisionsLog
 * (JSON lines, with the evidence hashes); calls that need a person are POSTed to reviewWebhook.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createGateProxy, type ProxyCall, type ProxyConfig } from "../src/lib/gate/proxy";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/gate-proxy.ts <config.json>");
  process.exit(1);
}
const config = JSON.parse(readFileSync(path, "utf8")) as ProxyConfig & {
  decisionsLog?: string;
  reviewWebhook?: string;
};
const port = Number(process.env.PORT) || 8787;

const line = (c: ProxyCall) =>
  JSON.stringify({
    at: c.decision.evidence.decidedAt,
    tool: c.tool,
    agent: c.agentId,
    action: c.action,
    decision: c.decision.decision,
    summary: c.decision.summary,
    requestHash: c.decision.evidence.requestHash,
    decisionHash: c.decision.evidence.decisionHash,
  });

const handle = createGateProxy(config, {
  onDecision: (c) => {
    console.log(
      `${c.decision.decision.padEnd(6)} ${c.tool} by ${c.agentId}: ${c.decision.summary}`,
    );
    if (config.decisionsLog) appendFileSync(config.decisionsLog, line(c) + "\n");
  },
  onReview: async (c) => {
    if (!config.reviewWebhook) return;
    await fetch(config.reviewWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: line(c),
      signal: AbortSignal.timeout(5000),
    }).catch((e) => console.error(`Review webhook failed: ${e instanceof Error ? e.message : e}`));
  },
});

createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const out = await handle(
      new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, {
        method: req.method,
        headers,
        body: chunks.length && req.method !== "GET" ? Buffer.concat(chunks) : undefined,
      }),
    );
    res.writeHead(out.status, Object.fromEntries(out.headers));
    // Stream the body through as it arrives (event streams included).
    const reader = out.body?.getReader();
    for (let r = await reader?.read(); r && !r.done; r = await reader!.read()) res.write(r.value);
    res.end();
  } catch (e) {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32603, message: String(e) } }),
    );
  }
}).listen(port, () => console.log(`MyLiquid Gate proxy on :${port} → ${config.upstream}`));
