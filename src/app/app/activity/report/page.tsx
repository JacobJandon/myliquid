import Link from "next/link";
import { requireInvestor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import type { ItemValue } from "@/lib/domain/evidenceReport";
import { formatPct, formatUsd } from "@/lib/domain/money";
import { evidenceReport } from "@/lib/services/evidenceReport";
import { PrintButton } from "@/components/app/PrintButton";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Evidence report" };

const show = (v: ItemValue) =>
  "count" in v
    ? v.count.toLocaleString("en-US")
    : "cents" in v
      ? formatUsd(v.cents)
      : "pct" in v
        ? formatPct(v.pct, 0)
        : v.text;

/** The account's controls and what they did, under MAS SAFR and FINRA headings. Printable. */
export default async function EvidenceReportPage() {
  const investor = await requireInvestor();
  const { facts, sections } = evidenceReport(getDb(), investor.id);
  const groups = (["SAFR", "FINRA"] as const).map((fw) => ({
    fw,
    sections: sections.filter((s) => s.framework === fw),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/activity" className="text-xs text-muted hover:text-fg print:hidden">
            ← Activity
          </Link>
          <h1 className="font-display text-[1.75rem] leading-tight text-fg sm:text-[2rem]">
            Evidence report
          </h1>
          <p className="mt-1 text-sm text-fg-2">
            {investor.name} · {facts.period.from?.slice(0, 10) ?? "—"} to{" "}
            {facts.period.to?.slice(0, 10) ?? "—"} · generated{" "}
            {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a href="/api/evidence/report" className="text-sm text-accent underline">
            JSON
          </a>
          <PrintButton />
        </div>
      </div>

      <p className="text-sm text-fg-2">
        Every number below comes from this account&apos;s own records. Headings follow MAS&apos;s
        Safeguards for Agentic Finance at Runtime (SAFR) and FINRA&apos;s 2026 oversight
        expectations. This is a record of controls, not legal advice or a compliance opinion.
      </p>

      {groups.map(({ fw, sections: list }) => (
        <section key={fw} className="space-y-3" aria-label={fw}>
          <h2 className="font-semibold text-fg">
            {fw === "SAFR"
              ? "MAS SAFR: the four safeguard classes"
              : "FINRA: what firms are expected to do"}
          </h2>
          {list.map((s) => (
            <article
              key={s.id}
              data-section={s.id}
              className="break-inside-avoid rounded-2xl border border-line bg-surface p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-fg">{s.title}</h3>
                <Badge>{fw}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted">{s.asks}</p>
              <dl className="mt-3 divide-y divide-line text-sm">
                {s.items.map((i) => (
                  <div
                    key={i.label}
                    className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"
                  >
                    <dt className="min-w-0">
                      <span className="text-fg">{i.label}</span>
                      <span className="block text-[11px] text-muted">{i.source}</span>
                    </dt>
                    <dd className="font-medium tabular text-fg sm:text-right">{show(i.value)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
