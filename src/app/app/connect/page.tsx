import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { SCOPE_TOOLS } from "@/lib/mcp/server";
import { listApiKeys } from "@/lib/services/apiKeys";
import { listEvents } from "@/lib/services/audit";
import { KeyManager, Snippet } from "@/components/app/KeyManager";
import { PassportVerifier, type IdentitySummary } from "@/components/app/AgentIdentity";
import {
  ConnectedAgents,
  InviteAgent,
  TraderTestDrive,
  type ConnectionView,
} from "@/components/app/AgentTraders";
import { TESTBED_AGENTS, ainraMode, ainraModeLabel } from "@/lib/ainra";
import { TIER_AUTO_CEILING_CENTS } from "@/lib/domain/agentTrading";
import { formatUsd } from "@/lib/domain/money";
import { listConnections, listKeyIdentities, wallNow } from "@/lib/services/agentIdentity";
import { listInvites } from "@/lib/services/agentInvites";
import { HOSTED_STRATEGIES, listHostedTraders, traderRecord } from "@/lib/services/hostedTraders";
import {
  HostedTraders,
  type HireableAgent,
  type HostedTraderView,
} from "@/components/app/HostedTraders";
import { Badge, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agent traders" };

const TIERS: { tier: string; may: string }[] = [
  { tier: "Not identified", may: "Reads and proposes; you approve every trade" },
  { tier: "AINRA L0–L1", may: "Reads only" },
  {
    tier: "AINRA L2",
    may: `Trades; on its own up to ${formatUsd(TIER_AUTO_CEILING_CENTS.L2!)} a trade within your limits`,
  },
  {
    tier: "AINRA L3",
    may: `Trades and pays; on its own up to ${formatUsd(TIER_AUTO_CEILING_CENTS.L3!)} a trade`,
  },
  {
    tier: "AINRA L4",
    may: `Trades and pays; on its own up to ${formatUsd(TIER_AUTO_CEILING_CENTS.L4!)} a trade`,
  },
];

export default async function ConnectPage() {
  const { id: investorId } = await requireInvestor();
  const db = getDb();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const endpoint = `${origin}/api/mcp`;
  const now = wallNow();
  const testbed = ainraMode() === "testbed";

  const activity = listEvents(db, investorId, { agent: "external", limit: 12 });
  const keys = listApiKeys(db, investorId);
  const connections: ConnectionView[] = listConnections(db, investorId, now).map((c) => ({
    keyId: c.keyId,
    name: c.name,
    prefix: c.prefix,
    lastUsedAt: c.lastUsedAt,
    scopes: c.scopes,
    identified: c.identified,
    identity: c.identity && {
      ainraNumber: c.identity.ainraNumber,
      tier: c.identity.tier,
      capabilities: c.identity.capabilities,
      requirePassport: c.identity.requirePassport,
      verifiedUntil: c.identity.verifiedUntil,
      lastStatus: c.identity.lastPresentedAt ? (c.identity.lastVerdict?.status ?? null) : null,
      lastReason: c.identity.lastPresentedAt ? (c.identity.lastVerdict?.reason ?? null) : null,
      tradeMode: c.identity.tradeMode,
      perTradeLimitCents: c.identity.perTradeLimitCents,
      dailyLimitCents: c.identity.dailyLimitCents,
    },
    tierCeilingCents: c.tierCeilingCents,
    effectivePerTradeLimitCents: c.effectivePerTradeLimitCents,
    usedTodayCents: c.usedTodayCents,
    autonomyBlockedBy: c.autonomyBlockedBy,
  }));
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
  const hosted: HostedTraderView[] = listHostedTraders(db, investorId).map((t) => {
    const c = connections.find((x) => x.keyId === t.keyId);
    const id = c?.identity;
    return {
      id: t.id,
      agent: t.agent,
      label: t.label,
      description: t.description,
      status: t.status,
      tier: id?.tier ?? null,
      ainraNumber: id?.ainraNumber ?? null,
      identifiedUntil: id?.verifiedUntil ?? null,
      runs: t.runs,
      lastRunOn: t.lastRunOn,
      limits: {
        auto: id?.tradeMode === "auto" && !c?.autonomyBlockedBy,
        perTradeCents: c?.effectivePerTradeLimitCents ?? 0,
        dailyCents: id?.dailyLimitCents ?? 0,
      },
      record: traderRecord(db, investorId, t.keyId),
      last: t.lastSummary,
    };
  });
  const hireable: HireableAgent[] = TESTBED_AGENTS.filter((a) => HOSTED_STRATEGIES[a.id]).map(
    (a) => ({
      id: a.id,
      label: a.label,
      tier: a.summary.split(" · ")[0]!,
      description: HOSTED_STRATEGIES[a.id]!.description,
      trades: HOSTED_STRATEGIES[a.id]!.strategy !== "research",
    }),
  );
  const openInvites = listInvites(db, investorId, now)
    .filter((i) => i.status === "open")
    .map((i) => ({
      id: i.id,
      label: i.label,
      scopes: i.scopes,
      tradeMode: i.tradeMode,
      perTradeLimitCents: i.perTradeLimitCents,
      dailyLimitCents: i.dailyLimitCents,
      expiresAt: i.expiresAt,
    }));

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-fg">Agent traders</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          Let outside AI agents trade for you, and know who they are. An agent identifies itself
          with its{" "}
          <a
            href="https://github.com/JacobJandon/ainra"
            className="font-medium text-fg underline underline-offset-2"
          >
            AINRA
          </a>{" "}
          passport: who runs it, its tier, what it declares it may do, and whether its registrar
          still vouches for it. That identity decides what it can do here, on top of your guardrails
          and Sentinel&apos;s checks.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={testbed ? "warning" : "good"}>{ainraModeLabel()}</Badge>
          <span className="text-muted">
            Passports are verified here, offline, with the published <code>@ainra/sdk</code>.
          </span>
        </div>
      </div>

      {testbed && (
        <Card
          id="hosted"
          title="Your AI traders"
          subtitle="Testbed AINRA agents MyLiquid runs for you. Each works once every market day through the same MCP tools and identity gate as any outside agent."
        >
          <HostedTraders traders={hosted} agents={hireable} now={now} />
          <p className="mt-3 text-xs text-muted">
            They work when you advance the market (+1d), when you open MyLiquid on a new market day,
            and daily at 13:45 UTC on Vercel. Every trade passes their AINRA limits, your mandate
            and Sentinel&apos;s checks; pull the kill switch and they stop.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
        <Card
          title="Invite an agent trader"
          subtitle="It connects itself with its passport; you never copy keys around."
        >
          <InviteAgent origin={origin} open={openInvites} />
        </Card>
        <Card
          title="What identity decides"
          subtitle="Least privilege: the lower of these and your settings."
        >
          <table className="w-full text-left text-xs">
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-t border-line first:border-t-0">
                  <th className="py-2 pr-3 font-medium text-fg">{t.tier}</th>
                  <td className="py-2 text-fg-2">{t.may}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-3 space-y-1.5 text-xs text-fg-2">
            <li>
              To trade on its own it must also declare <code>myliquid:trade</code> and present a
              fresh passport at least every 5 minutes.
            </li>
            <li>
              If its registrar revokes it, MyLiquid cuts it off at its next presentation, withdraws
              its pending proposals and alerts you.
            </li>
            <li>Every order and proposal it makes carries its AINRA Number.</li>
          </ul>
        </Card>
      </div>

      <Card
        id="connected"
        title="Connected agents"
        subtitle="Who each one is, whether it's identified right now, and what it may do."
      >
        <ConnectedAgents connections={connections} />
      </Card>

      {testbed && (
        <Card
          title="Test drive an AINRA trader"
          subtitle="A testbed agent connects to this app through the real endpoints, from your browser, step by step."
        >
          <TraderTestDrive
            agents={TESTBED_AGENTS.map((a) => ({ id: a.id, label: a.label, summary: a.summary }))}
            previous={connections.map((c) => ({ keyId: c.keyId, name: c.name }))}
          />
        </Card>
      )}

      <details className="group rounded-2xl border border-line bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-fg">
          Manual setup: API keys for MCP clients, and pinning a passport by hand
          <span className="ml-2 text-xs font-normal text-muted">
            For Claude and other MCP clients without an invite flow
          </span>
        </summary>
        <div className="space-y-6 border-t border-line p-5">
          <KeyManager
            keys={keys}
            endpoint={endpoint}
            identities={identities}
            now={now}
            showList={false}
          />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
            <PassportVerifier
              keys={keys.filter((k) => !k.revokedAt).map((k) => ({ id: k.id, name: k.name }))}
              trust={ainraModeLabel()}
              testbed={testbed}
            />
            <Snippet
              label="The agent presents its passport (valid for 5 minutes)"
              code={`curl -s ${origin}/api/agent-identity \\\n  -H "Authorization: Bearer mlk_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"ainra_passport": <bundle JSON or base64url>}'`}
            />
          </div>
        </div>
      </details>

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
