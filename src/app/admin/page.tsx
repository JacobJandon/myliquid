import { notFound } from "next/navigation";
import { AdminLogin, AdminLogout } from "@/components/admin/AdminLogin";
import { Badge, Card } from "@/components/ui";
import { adminEnabled, isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import {
  EVENTS,
  PMF_BAR,
  PMF_LABELS,
  PMF_MIN_RESPONSES,
  sampleSizePerVariant,
} from "@/lib/domain/analytics";
import { metrics } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Founder dashboard", robots: { index: false } };

const pct = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;

/**
 * The founder's dashboard: the numbers docs/discovery says to decide on (funnel, activation, retention,
 * product-market fit, experiments, research answers, AINRA and Gate usage). Needs MYLIQUID_ADMIN_TOKEN.
 */
export default async function AdminPage() {
  if (!adminEnabled()) notFound();
  if (!(await isAdmin())) return <AdminLogin />;
  const m = metrics(getDb());
  const top = Math.max(1, ...m.funnel.map((f) => f.count));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-pixel text-[10px] uppercase text-accent">Founder dashboard</div>
          <h1 className="font-display text-4xl text-fg">What the data says</h1>
          <p className="mt-1 text-sm text-fg-2">
            {m.since} to {m.today}. First-party events only; bots and visitors who opted out
            aren&apos;t counted. Decision rules: docs/discovery/4-measure-and-iterate.md.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/admin/export" className="text-sm text-accent underline">
            Export research (CSV)
          </a>
          <AdminLogout />
        </div>
      </header>

      <Card title="Funnel" subtitle="Each step counts only people who reached the one before it.">
        <ol className="space-y-3" data-admin="funnel">
          {m.funnel.map((f, i) => {
            const prev = i ? m.funnel[i - 1]!.count : null;
            return (
              <li
                key={f.step}
                className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)_7rem] sm:items-center sm:gap-4"
              >
                <span className="text-sm text-fg">{f.step}</span>
                <div className="h-6 rounded-md bg-surface-2" title={`${f.step}: ${f.count}`}>
                  <div
                    className="h-6 rounded-md bg-accent"
                    style={{ width: `${Math.max(f.count ? 2 : 0, (f.count / top) * 100)}%` }}
                  />
                </div>
                <span className="text-sm tabular text-fg">
                  {f.count.toLocaleString("en-US")}
                  {prev ? <span className="text-muted"> · {pct(f.count / prev)}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Retention"
          subtitle="Accounts active again N to N+6 days after their first day."
        >
          <div className="grid grid-cols-3 gap-3" data-admin="retention">
            {m.retention.map((r) => (
              <div key={r.day} className="rounded-xl border border-line p-3">
                <div className="text-xs text-muted">Day {r.day}</div>
                <div className="font-display text-3xl text-fg">{r.cohort ? pct(r.rate) : "—"}</div>
                <div className="text-xs text-muted">
                  {r.retained} of {r.cohort} accounts
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Product-market fit"
          subtitle={`"How would you feel if you could no longer use MyLiquid?" Bar: ${pct(PMF_BAR)} very disappointed, from ${PMF_MIN_RESPONSES}+ answers.`}
        >
          <div data-admin="pmf">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl text-fg">
                {m.pmf.n ? pct(m.pmf.veryShare) : "—"}
              </span>
              <span className="text-sm text-fg-2">very disappointed · {m.pmf.n} answers</span>
              <Badge
                tone={
                  m.pmf.verdict === "product-market fit signal"
                    ? "good"
                    : m.pmf.verdict === "not yet"
                      ? "warning"
                      : "neutral"
                }
              >
                {m.pmf.verdict}
              </Badge>
            </div>
            <div
              className="relative mt-3 h-3 rounded-full bg-surface-2"
              title={`${pct(m.pmf.veryShare)} very disappointed`}
            >
              <div
                className="h-3 rounded-full bg-accent"
                style={{ width: `${m.pmf.veryShare * 100}%` }}
              />
              <div
                className="absolute -top-1 h-5 w-0.5 bg-fg"
                style={{ left: `${PMF_BAR * 100}%` }}
                aria-label="40% bar"
              />
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-xs text-fg-2">
              {(Object.keys(PMF_LABELS) as (keyof typeof PMF_LABELS)[]).map((k) => (
                <li key={k}>
                  {PMF_LABELS[k]}: <span className="tabular text-fg">{m.pmf.counts[k]}</span>
                </li>
              ))}
            </ul>
            {m.pmf.benefits.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-fg">
                  What people get from it ({m.pmf.benefits.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-2">
                  {m.pmf.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </details>
            )}
            {m.pmf.improvements.length > 0 && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-fg">
                  What to improve ({m.pmf.improvements.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-2">
                  {m.pmf.improvements.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </Card>
      </div>

      <Card title="Experiments">
        <div className="space-y-6" data-admin="experiments">
          {m.experiments.map((e) => {
            const base = e.comparison?.rateA ?? 0;
            const need = base > 0 ? sampleSizePerVariant(base, 0.2) : null;
            return (
              <div key={e.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-sm text-fg">{e.id}</code>
                  <span className="text-xs text-muted">goal: {e.goal}</span>
                  {e.comparison?.significant ? (
                    <Badge tone="good">significant (p {e.comparison.p!.toFixed(3)})</Badge>
                  ) : (
                    <Badge>
                      not significant yet
                      {e.comparison?.p !== null && e.comparison?.p !== undefined
                        ? ` (p ${e.comparison.p.toFixed(2)})`
                        : ""}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-fg-2">{e.hypothesis}</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead className="text-xs text-muted">
                      <tr>
                        <th className="py-1 font-medium">Variant</th>
                        <th className="py-1 font-medium">Visitors</th>
                        <th className="py-1 font-medium">Converted</th>
                        <th className="py-1 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.variants.map((v) => (
                        <tr key={v.variant} className="border-t border-line">
                          <td className="py-1 text-fg">{v.variant}</td>
                          <td className="py-1 tabular">{v.exposed}</td>
                          <td className="py-1 tabular">{v.converted}</td>
                          <td className="py-1 tabular">
                            {v.exposed ? pct(v.converted / v.exposed) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {e.comparison?.lift !== null && e.comparison?.lift !== undefined
                    ? `Lift of the second variant: ${e.comparison.lift >= 0 ? "+" : ""}${pct(e.comparison.lift)}. `
                    : ""}
                  {need && Number.isFinite(need)
                    ? `To detect a 20% lift at this base rate: about ${need.toLocaleString("en-US")} visitors per variant.`
                    : "Needs visitors in both variants before it says anything."}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Research answers"
          subtitle="Early access, design partners, AINRA interest, PMF."
        >
          <ul className="space-y-1 text-sm" data-admin="research">
            {m.research.length === 0 && <li className="text-muted">No answers yet.</li>}
            {m.research.map((r) => (
              <li key={r.kind} className="flex justify-between">
                <span className="text-fg">{r.kind}</span>
                <span className="tabular text-fg">{r.count}</span>
              </li>
            ))}
          </ul>
          {m.segments.length > 0 && (
            <>
              <div className="mt-4 text-xs text-muted">Early access, by who they are</div>
              <ul className="mt-1 space-y-1 text-sm">
                {m.segments.map((s) => (
                  <li key={s.segment} className="flex justify-between">
                    <span className="text-fg">{s.segment}</span>
                    <span className="tabular">{s.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="AINRA and Gate" subtitle="Is identity something people try, and does it hold?">
          <div className="grid gap-4 text-sm sm:grid-cols-3" data-admin="ainra">
            <div>
              <div className="text-xs text-muted">Lab checks</div>
              <ul className="mt-1 space-y-0.5">
                {m.ainra.inspections.length === 0 && <li className="text-muted">None yet</li>}
                {m.ainra.inspections.map((i) => (
                  <li key={`${i.tamper}${i.verdict}`} className="flex justify-between gap-2">
                    <span className="truncate">
                      {i.tamper} → {i.verdict}
                    </span>
                    <span className="tabular">{i.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-muted">Gate decisions</div>
              <ul className="mt-1 space-y-0.5">
                {m.ainra.gate.length === 0 && <li className="text-muted">None yet</li>}
                {m.ainra.gate.map((g) => (
                  <li key={`${g.decision}${g.verified}`} className="flex justify-between gap-2">
                    <span>
                      {g.decision}
                      {g.verified ? " · verified" : " · unverified"}
                    </span>
                    <span className="tabular">{g.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-muted">Agents connected</div>
              <ul className="mt-1 space-y-0.5">
                {m.ainra.connected.length === 0 && <li className="text-muted">None yet</li>}
                {m.ainra.connected.map((c) => (
                  <li key={c.tier} className="flex justify-between gap-2">
                    <span>{c.tier}</span>
                    <span className="tabular">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Leads"
        subtitle="People who asked to hear back. Only email those who ticked consent."
      >
        <div className="overflow-x-auto" data-admin="leads">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-4 font-medium">When</th>
                <th className="py-1 pr-4 font-medium">Kind</th>
                <th className="py-1 pr-4 font-medium">Email</th>
                <th className="py-1 pr-4 font-medium">Answers</th>
              </tr>
            </thead>
            <tbody>
              {m.leads.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-muted">
                    No leads yet.
                  </td>
                </tr>
              )}
              {m.leads.map((l, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-1 pr-4 whitespace-nowrap text-fg-2">
                    {l.createdAt.slice(0, 10)}
                  </td>
                  <td className="py-1 pr-4">{l.kind}</td>
                  <td className="py-1 pr-4 break-all">{l.email ?? "—"}</td>
                  <td className="py-1 text-xs text-fg-2">
                    {Object.entries(l.answers)
                      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Every event">
        <table className="w-full text-left text-sm" data-admin="events">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">Event</th>
              <th className="py-1 font-medium">Count</th>
              <th className="py-1 font-medium">People</th>
            </tr>
          </thead>
          <tbody>
            {m.totals.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-muted">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
            {m.totals.map((t) => (
              <tr key={t.name} className="border-t border-line" title={EVENTS[t.name]}>
                <td className="py-1 font-mono text-xs text-fg">{t.name}</td>
                <td className="py-1 tabular">{t.count}</td>
                <td className="py-1 tabular">{t.subjects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
