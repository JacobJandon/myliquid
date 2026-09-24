import Link from "next/link";
import { requireInvestor } from "@/lib/auth/current";
import { getDb, simDate } from "@/lib/db";
import { SLEEVE_LABELS } from "@/lib/domain/catalog";
import { addDays, formatDate } from "@/lib/domain/dates";
import { formatPct, formatUsd } from "@/lib/domain/money";
import { AGENTS, DESK_AGENTS } from "@/lib/agents/registry";
import { listAlerts } from "@/lib/services/alerts";
import { lastRunByAgent } from "@/lib/services/audit";
import {
  getLadder,
  getNavHistory,
  getNetContributions,
  getSnapshot,
} from "@/lib/services/portfolio";
import { listProposals } from "@/lib/services/proposals";
import { getProfile } from "@/lib/services/repo";
import { AlertsList } from "@/components/app/AlertsList";
import { CashPanel } from "@/components/app/CashPanel";
import { ProposalInbox } from "@/components/app/ProposalInbox";
import { AllocationBar } from "@/components/charts/AllocationBar";
import { LineChart } from "@/components/charts/LineChart";
import { LiquidityLadder } from "@/components/charts/LiquidityLadder";
import { AgentAvatar, Badge, Card, LinkButton, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Flattens a markdown digest into one line for the dashboard preview. */
function toPlainText(md: string): string {
  return md
    .replace(/[*_`>#|]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s*\n+\s*/g, " · ")
    .replace(/(· )+/g, "· ")
    .trim();
}

export default async function DashboardPage() {
  const investor = await requireInvestor();
  const investorId = investor.id;
  const db = getDb();
  const profile = getProfile(db, investorId);
  const snapshot = getSnapshot(db, investorId);
  const ladder = getLadder(db, investorId, snapshot);
  const nav = getNavHistory(db, investorId, 366);
  const proposals = listProposals(db, investorId, { status: "pending" });
  const alerts = listAlerts(db, investorId, { openOnly: true }).filter(
    (a) => a.severity !== "info",
  );
  const runs = lastRunByAgent(db, investorId);
  const today = simDate(db);

  const yesterday = nav.findLast((p) => p.date < today)?.totalCents ?? snapshot.totalCents;
  const yearAgo =
    nav.find((p) => p.date >= addDays(today, -365))?.totalCents ?? snapshot.totalCents;
  const contributions = getNetContributions(db, investorId);
  const week = ladder.find((b) => b.id === "week");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Welcome back, {investor.name.split(" ")[0]}</p>
          <h1 className="font-display text-4xl text-fg">Your portfolio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">{profile.label} profile</Badge>
          <LinkButton href="/app/agents" variant="secondary" size="sm">
            Open agent desk
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Total value"
          value={formatUsd(snapshot.totalCents)}
          sub={`${formatPct(snapshot.totalCents / yearAgo - 1, 1, true)} over 1 year · ${formatUsd(snapshot.totalCents - contributions, { sign: true })} total gain`}
        />
        <Stat
          label="Today"
          value={formatUsd(snapshot.totalCents - yesterday, { sign: true })}
          sub={`${formatPct(yesterday ? snapshot.totalCents / yesterday - 1 : 0, 2, true)} since the last market day`}
        />
        <Stat
          label="Cash within 7 days"
          value={formatPct(week?.cumulativePct ?? 0, 0)}
          sub={`${formatUsd(week?.cumulativeCents ?? 0)}. The rest is locked or gated.`}
        />
        <Stat
          label="Needs your attention"
          value={`${proposals.length + alerts.length}`}
          sub={`${proposals.length} proposal${proposals.length === 1 ? "" : "s"} · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
        />
      </div>

      {(snapshot.holdings.length === 0 || runs.size === 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent-2/10 p-5">
          <div>
            <div className="font-medium text-fg">
              {snapshot.holdings.length === 0
                ? "Your agents are ready to build your first portfolio."
                : "Your agents haven't looked at this portfolio yet."}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-fg-2">
              {snapshot.holdings.length === 0
                ? `Run the desk cycle: Scout screens the deals, Sentinel checks your ${profile.label.toLowerCase()} limits, and Atlas proposes an allocation for you to approve.`
                : "Run the desk cycle: Ledger checks the valuations, Scout screens the deals, Sentinel checks your limits and liquidity, and Atlas proposes fixes for you to approve."}
            </p>
          </div>
          <LinkButton href="/app/agents" variant="primary">
            Open the agent desk
          </LinkButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card title="Portfolio value" subtitle="Daily net asset value, including cash">
            <LineChart
              points={nav.map((p) => ({ date: p.date, value: p.totalCents }))}
              format="cents"
              label="Portfolio value"
            />
          </Card>

          <Card
            title="Liquidity ladder"
            subtitle="How much could be cash, and when: settlement, notice periods, gates and lock-ups included."
          >
            <LiquidityLadder buckets={ladder} totalCents={snapshot.totalCents} />
          </Card>

          <Card
            title="Allocation vs target"
            subtitle={`${profile.label} targets. Atlas flags drift beyond 3 points.`}
          >
            <AllocationBar snapshot={snapshot} targets={profile.targets} />
          </Card>

          <Card title="Holdings" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm tabular">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-5 py-3 font-normal">Product</th>
                    <th className="px-3 py-3 text-right font-normal">Value</th>
                    <th className="px-3 py-3 text-right font-normal">Weight</th>
                    <th className="px-3 py-3 text-right font-normal">Gain</th>
                    <th className="px-5 py-3 font-normal">Liquidity</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.holdings.map((h) => (
                    <tr key={h.product.id} className="border-t border-line hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/app/invest/${h.product.id}`}
                          className="text-fg hover:text-accent"
                        >
                          {h.product.name}
                        </Link>
                        <div className="text-[11px] text-muted">
                          {SLEEVE_LABELS[h.product.sleeve]}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-fg">{formatUsd(h.valueCents)}</td>
                      <td className="px-3 py-3 text-right text-fg-2">{formatPct(h.weight)}</td>
                      <td className="px-3 py-3 text-right text-fg-2">
                        {formatPct(h.costCents ? h.valueCents / h.costCents - 1 : 0, 1, true)}
                      </td>
                      <td className="px-5 py-3 text-xs text-fg-2">
                        {h.lockedValueCents > 0 && h.nextUnlock ? (
                          <span>🔒 Locked until {formatDate(h.nextUnlock)}</span>
                        ) : h.product.liquidity.redemption === "quarterly" ? (
                          <span>
                            Quarterly · {Math.round((h.product.liquidity.gatePct ?? 0) * 100)}% gate
                          </span>
                        ) : h.product.liquidity.redemption === "instant" ? (
                          <span>Instant</span>
                        ) : (
                          <span>Daily · T+{h.product.liquidity.settlementDays}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Approval inbox" subtitle="Agents propose. You decide.">
            <ProposalInbox proposals={proposals} />
          </Card>
          <Card title="Alerts" subtitle="From Sentinel (risk) and Ledger (valuation)">
            <AlertsList alerts={alerts} />
          </Card>
          <Card title="Cash">
            <CashPanel cashCents={snapshot.cashCents} pendingCents={snapshot.pendingCashCents} />
          </Card>
          <Card
            title="Latest digests"
            action={
              <LinkButton href="/app/agents" size="sm" variant="ghost">
                All agents →
              </LinkButton>
            }
          >
            <div className="space-y-4">
              {DESK_AGENTS.map((id) => {
                const run = runs.get(id);
                return (
                  <div key={id} className="flex gap-3">
                    <AgentAvatar agent={id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-fg">
                        {AGENTS[id].name}{" "}
                        <span className="font-normal text-muted">
                          · {run ? run.simDate : "not run yet"}
                        </span>
                      </div>
                      {run?.summary ? (
                        <p className="mt-0.5 line-clamp-3 text-xs text-fg-2">
                          {toPlainText(run.summary)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">{AGENTS[id].summary}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
