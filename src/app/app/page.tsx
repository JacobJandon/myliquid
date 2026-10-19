import Link from "next/link";
import { requireInvestor } from "@/lib/auth/current";
import { getDb, simDate } from "@/lib/db";
import { SLEEVE_LABELS, requireProduct } from "@/lib/domain/catalog";
import { formatDate } from "@/lib/domain/dates";
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
import { listProposals, recentDecision } from "@/lib/services/proposals";
import { getProfile } from "@/lib/services/repo";
import { getCompanionView, getQuiz } from "@/lib/services/companion";
import { PetRoom } from "@/components/pet/PetRoom";
import { PmfSurvey } from "@/components/research/Research";
import { activeDays, hasResponded } from "@/lib/services/analytics";
import { PortfolioHero } from "@/components/app/PortfolioHero";
import { InstallBanner } from "@/components/pwa/InstallApp";
import { AlertsList } from "@/components/app/AlertsList";
import { CashPanel } from "@/components/app/CashPanel";
import { ProposalInbox } from "@/components/app/ProposalInbox";
import { listHostedTraders, traderRecord } from "@/lib/services/hostedTraders";
import { AllocationBar } from "@/components/charts/AllocationBar";
import { LiquidityLadder } from "@/components/charts/LiquidityLadder";
import clsx from "clsx";
import { AgentAvatar, Badge, Card, LinkButton, SLEEVE_COLORS, Stat } from "@/components/ui";

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
  // Right after a decision, say what happened where the proposal was (the loop's last step).
  const justDecided = proposals.length === 0 ? recentDecision(db, investorId) : undefined;
  const alerts = listAlerts(db, investorId, { openOnly: true }).filter(
    (a) => a.severity !== "info",
  );
  const runs = lastRunByAgent(db, investorId);
  const today = simDate(db);

  // The product-market-fit survey, once someone has come back on a second day and hasn't answered.
  const askPmf = activeDays(db, investorId) >= 2 && !hasResponded(db, investorId, "pmf");

  const contributions = getNetContributions(db, investorId);
  const week = ladder.find((b) => b.id === "week");

  const pet = getCompanionView(db, investorId);
  const quiz = getQuiz(db, investorId);
  const traders = listHostedTraders(db, investorId).map((t) => ({
    ...t,
    record: traderRecord(db, investorId, t.keyId),
  }));

  // Daily values ending at today's live total.
  const heroPoints = [
    ...nav.filter((p) => p.date < today).map((p) => ({ date: p.date, value: p.totalCents })),
    { date: today, value: snapshot.totalCents },
  ];

  return (
    <div className="space-y-6">
      <InstallBanner />

      <div className="hidden flex-wrap items-end justify-between gap-4 lg:flex">
        <div>
          <p className="kicker text-muted">Welcome back, {investor.name.split(" ")[0]}</p>
          <h1 className="type-h1 mt-2 text-fg">Home</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">{profile.label} profile</Badge>
          <LinkButton href="/app/pay" variant="secondary" size="sm">
            Agent Pay
          </LinkButton>
        </div>
      </div>

      {/* The core loop: when an agent is waiting on a decision, it sits beside the money (rules.md §3). */}
      <div
        className={clsx(
          "grid gap-6",
          (proposals.length > 0 || justDecided) &&
            "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start",
        )}
      >
        <PortfolioHero
          points={heroPoints}
          cashCents={snapshot.cashCents}
          totalGainCents={snapshot.totalCents - contributions}
        />

        {proposals.length > 0 && (
          <section id="inbox" aria-label="Waiting for you" className="scroll-mt-24">
            <ProposalInbox proposals={proposals} />
          </section>
        )}

        {justDecided && (
          <Card
            id="inbox"
            title={
              justDecided.status === "rejected"
                ? "You rejected it. Nothing was traded."
                : justDecided.status === "executed"
                  ? "Done. Your approval went through."
                  : justDecided.status === "partially_executed"
                    ? "Partly done. Some orders were blocked."
                    : "Nothing went through. The checks blocked it."
            }
            subtitle={justDecided.title}
          >
            {justDecided.result && justDecided.status !== "rejected" && (
              <ul className="space-y-1 text-sm" data-decided={justDecided.status}>
                {justDecided.orders.map((o, i) => (
                  <li key={i} className="text-fg-2">
                    <span className="text-fg">
                      {o.side === "buy" ? "Buy" : "Sell"} {formatUsd(o.amountCents)} of{" "}
                      {requireProduct(o.productId).name}
                    </span>
                    : {justDecided.result!.messages[i] ?? "—"}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkButton href="/app/activity" size="sm" variant="secondary">
                See it in Activity
              </LinkButton>
              <LinkButton href="/app/settings" size="sm" variant="ghost">
                Change what agents may do
              </LinkButton>
            </div>
          </Card>
        )}
      </div>

      {askPmf && <PmfSurvey />}

      <PetRoom initial={pet} initialQuiz={quiz} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Stat
          label="Cash within 7 days"
          value={formatPct(week?.cumulativePct ?? 0, 0)}
          sub={
            (week?.cumulativePct ?? 0) >= 0.9995
              ? `${formatUsd(week?.cumulativeCents ?? 0)}. Nothing is locked or gated.`
              : `${formatUsd(week?.cumulativeCents ?? 0)}. The rest is locked or gated.`
          }
        />
        <Stat
          label="Needs your attention"
          value={`${proposals.length + alerts.length}`}
          sub={`${proposals.length} proposal${proposals.length === 1 ? "" : "s"} · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
        />
      </div>

      {(snapshot.holdings.length === 0 || runs.size === 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-fg/15 bg-accent-2 p-5">
          <div>
            <div className="font-medium text-fg">
              {snapshot.holdings.length === 0
                ? `${pet.name} and the desk are ready to build your first portfolio.`
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
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]"
                            style={{ background: SLEEVE_COLORS[h.product.sleeve] }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/app/invest/${h.product.id}`}
                              className="text-fg hover:text-accent"
                            >
                              {h.product.name}
                            </Link>
                            <div className="text-[11px] text-muted">
                              {SLEEVE_LABELS[h.product.sleeve]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="num px-3 py-3 text-right text-fg">
                        {formatUsd(h.valueCents)}
                      </td>
                      <td className="num px-3 py-3 text-right text-fg-2">{formatPct(h.weight)}</td>
                      <td className="num px-3 py-3 text-right text-fg-2">
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
          {proposals.length === 0 && (
            <Card title="Approval inbox" subtitle="Agents propose. You decide.">
              <ProposalInbox proposals={proposals} />
            </Card>
          )}
          <Card
            title="Your AI traders"
            subtitle="AINRA-identified agents trading within your limits"
            action={
              <LinkButton href="/app/connect#hosted" size="sm" variant="ghost">
                {traders.length ? "Manage →" : "Hire one →"}
              </LinkButton>
            }
          >
            {traders.length === 0 ? (
              <p className="text-xs text-fg-2">
                Hire a trader that identifies itself with its AINRA passport and trades once a
                market day, on its own within your limits.
              </p>
            ) : (
              <ul className="space-y-3">
                {traders.map((t) => (
                  <li key={t.id} className="text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{t.label}</span>
                      <Badge tone={t.status === "active" ? "good" : "neutral"}>
                        {t.status === "active" ? "working" : "paused"}
                      </Badge>
                      <span
                        className={
                          t.record.pnlCents >= 0 ? "ml-auto text-good" : "ml-auto text-critical"
                        }
                      >
                        {formatUsd(t.record.pnlCents, { sign: true })}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-fg-2">
                      {t.lastSummary
                        ? t.lastSummary.stopped
                          ? `Stopped: ${t.lastSummary.stopped}`
                          : t.lastSummary.decisions.length
                            ? `${t.lastSummary.date}: ${t.lastSummary.decisions
                                .map((d) => `${d.title} (${d.outcome})`)
                                .join("; ")}`
                            : `${t.lastSummary.date}: ${t.lastSummary.note}`
                        : "Starts on the next market day."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card id="alerts" title="Alerts" subtitle="From Sentinel (risk) and Ledger (valuation)">
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
