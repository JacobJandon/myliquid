import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { requireProduct } from "@/lib/domain/catalog";
import { formatUsd } from "@/lib/domain/money";
import { listEvents } from "@/lib/services/audit";
import { listCashMovements, listOrders } from "@/lib/services/orders";
import { Download } from "lucide-react";
import { AgentAvatar, Badge, Card, agentLabel, buttonClass, type Tone } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

const STATUS_TONE: Record<string, Tone> = {
  filled: "good",
  settled: "good",
  settling: "accent",
  queued: "warning",
  rejected: "critical",
  cancelled: "neutral",
};

export default async function ActivityPage() {
  const { id: investorId } = await requireInvestor();
  const db = getDb();
  const orders = listOrders(db, investorId, 60);
  const cash = listCashMovements(db, investorId, 20);
  const events = listEvents(db, investorId, { limit: 120 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-fg">Activity</h1>
          <p className="mt-1 text-sm text-fg-2">
            An append-only record of every order, cash movement and agent action, including the
            ones Sentinel blocked.
          </p>
        </div>
        <a href="/api/statements" download className={buttonClass("secondary", "sm")}>
          <Download className="h-3.5 w-3.5" /> Download statement (CSV)
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="min-w-0 space-y-6 xl:col-span-3">
          <Card title="Orders" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm tabular">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-5 py-3 font-normal">Date</th>
                    <th className="px-3 py-3 font-normal">Order</th>
                    <th className="px-3 py-3 text-right font-normal">Amount</th>
                    <th className="px-3 py-3 font-normal">By</th>
                    <th className="px-5 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-line align-top">
                      <td className="px-5 py-3 text-xs text-muted">{o.createdOn}</td>
                      <td className="px-3 py-3">
                        <div className="text-fg">
                          {o.side === "buy" ? "Buy" : "Sell"} {requireProduct(o.productId).name}
                        </div>
                        {o.status === "rejected" && (
                          <div className="text-[11px] text-fg-2">
                            {o.checks
                              .filter((c) => c.status === "block")
                              .map((c) => c.detail)
                              .join(" ")}
                          </div>
                        )}
                        {o.note && o.status !== "rejected" && (
                          <div className="text-[11px] text-muted">{o.note}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-fg">
                        {formatUsd(o.filledCents || o.amountCents)}
                      </td>
                      <td className="px-3 py-3 text-xs text-fg-2">
                        {agentLabel(o.placedBy)}
                        {o.autonomous ? " (auto)" : o.proposalId ? " (approved)" : ""}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[o.status] ?? "neutral"}>{o.status}</Badge>
                        {o.status === "queued" && o.windowOn && (
                          <div className="mt-1 text-[11px] text-muted">window {o.windowOn}</div>
                        )}
                        {o.status === "settling" && o.settleOn && (
                          <div className="mt-1 text-[11px] text-muted">settles {o.settleOn}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Cash movements" bodyClassName="p-0">
            <ul>
              {cash.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between border-t border-line px-5 py-3 text-sm first:border-t-0"
                >
                  <span className="text-fg">
                    {c.kind === "deposit" ? "Deposit" : "Withdrawal to bank"}
                  </span>
                  <span className="text-xs text-muted">{c.createdOn}</span>
                  <span className="text-fg tabular">
                    {formatUsd(c.kind === "deposit" ? c.amountCents : -c.amountCents)}
                  </span>
                  <Badge tone={c.status === "settled" ? "good" : "accent"}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card
          title="Audit log"
          subtitle="Every agent run, tool call, proposal and alert"
          className="xl:col-span-2"
          bodyClassName="p-0"
        >
          <ol className="max-h-[900px] overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 border-t border-line px-5 py-3 first:border-t-0">
                <AgentAvatar agent={e.agent} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">
                    {agentLabel(e.agent)} · {e.kind.replace("_", " ")} · {e.simDate}
                  </div>
                  <div className="break-words text-sm text-fg-2">{e.title}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
