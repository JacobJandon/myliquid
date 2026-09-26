import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { SCOPE_TOOLS } from "@/lib/mcp/server";
import { listApiKeys } from "@/lib/services/apiKeys";
import { listEvents } from "@/lib/services/audit";
import { KeyManager, Snippet } from "@/components/app/KeyManager";
import { PassportVerifier, type IdentitySummary } from "@/components/app/AgentIdentity";
import { ainraMode, ainraModeLabel } from "@/lib/ainra";
import { listKeyIdentities, wallNow } from "@/lib/services/agentIdentity";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect an agent" };

export default async function ConnectPage() {
  const { id: investorId } = await requireInvestor();
  const db = getDb();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const endpoint = `${proto}://${host}/api/mcp`;
  const activity = listEvents(db, investorId, { agent: "external", limit: 12 });
  const keys = listApiKeys(db, investorId);
  const identities: Record<string, IdentitySummary> = Object.fromEntries(
    listKeyIdentities(db, investorId).map((i) => [
      i.keyId,
      {
        keyId: i.keyId,
        ainraNumber: i.ainraNumber,
        tier: i.tier,
        capabilities: i.capabilities,
        requirePassport: i.requirePassport,
        verifiedUntil: i.verifiedUntil,
        lastStatus: i.lastPresentedAt ? (i.lastVerdict?.status ?? null) : null,
        lastReason: i.lastPresentedAt ? (i.lastVerdict?.reason ?? null) : null,
      },
    ]),
  );
  const now = wallNow();
  const origin = endpoint.replace(/\/api\/mcp$/, "");

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-fg">Connect your own agent</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          Robinhood, Webull, Gemini and Coinbase now let people connect their own AI over the Model
          Context Protocol. MyLiquid does too: connect Claude or any other MCP client to{" "}
          <code className="rounded bg-surface-3 px-1 text-xs">{endpoint}</code>. It gets the same
          tools as the desk agents and the same guardrails.
        </p>
      </div>

      <KeyManager keys={keys} endpoint={endpoint} identities={identities} now={now} />

      <Card
        title="Agent identity (AINRA)"
        subtitle="Know who is behind a connected agent, what it may do, and whether it is still trusted right now."
      >
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <PassportVerifier
            keys={keys.filter((k) => !k.revokedAt).map((k) => ({ id: k.id, name: k.name }))}
            trust={ainraModeLabel()}
            testbed={ainraMode() === "testbed"}
          />
          <div className="space-y-3 text-sm text-fg-2">
            <p>
              <a
                href="https://github.com/JacobJandon/ainra"
                className="font-medium text-fg underline underline-offset-2"
              >
                AINRA
              </a>{" "}
              gives AI agents signed passports that anyone can check offline. Pin a key to an
              agent&apos;s permanent AINRA Number and that key only works while the agent presents a
              valid, fresh passport: if its registrar revokes it, MyLiquid cuts it off within five
              minutes, even though the key is still valid.
            </p>
            <p>
              The key can do no more than the agent&apos;s AINRA tier allows (L0–L1 read, L2 trade,
              L3 and up pay) and, if the passport declares them, its <code>myliquid:read</code>,{" "}
              <code>myliquid:trade</code> or <code>myliquid:pay</code> capabilities. Every call is
              logged with the agent&apos;s AINRA Number.
            </p>
            <Snippet
              label="The agent presents its passport (valid for 5 minutes)"
              code={`curl -s ${origin}/api/agent-identity \\\n  -H "Authorization: Bearer mlk_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"ainra_passport": <bundle JSON or base64url>}'`}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tools by scope">
          <div className="space-y-3 text-xs">
            {(["read", "trade", "pay"] as const).map((scope) => (
              <div key={scope}>
                <div className="mb-1 text-fg-2">
                  {scope === "read" ? "Read" : scope === "trade" ? "Trade (adds)" : "Pay (adds)"}
                </div>
                <div className="flex flex-wrap gap-1">
                  {SCOPE_TOOLS[scope].map((t) => (
                    <code
                      key={t}
                      className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-fg-2"
                    >
                      {t}
                    </code>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-muted">
              Never exposed: withdrawals, deposits, guardrail settings and releasing the kill
              switch.
            </p>
          </div>
        </Card>
        <Card title="Recent connected-agent activity" bodyClassName="p-0">
          {activity.length === 0 ? (
            <div className="p-5">
              <EmptyState>No calls yet.</EmptyState>
            </div>
          ) : (
            <ul>
              {activity.map((e) => (
                <li
                  key={e.id}
                  className="border-t border-line px-5 py-2.5 text-xs first:border-t-0"
                >
                  <span className="text-muted">{e.createdAt.slice(0, 16).replace("T", " ")}</span>{" "}
                  <span className="break-all text-fg-2">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
