import Link from "next/link";
import { getDb, simDate } from "@/lib/db";
import { agentMode, modelName } from "@/lib/agents/llm";
import { formatDate } from "@/lib/domain/dates";
import { listAlerts } from "@/lib/services/alerts";
import { listProposals } from "@/lib/services/proposals";
import { getMandate } from "@/lib/services/repo";
import { MobileNav, Sidebar } from "@/components/app/Sidebar";
import { SimControls } from "@/components/app/SimControls";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const db = getDb();
  const pending = listProposals(db, { status: "pending" }).length;
  const alerts = listAlerts(db, { openOnly: true }).filter((a) => a.severity !== "info").length;
  const mandate = getMandate(db);
  const mode = agentMode();

  return (
    <div className="bg-glow min-h-screen">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-6 lg:flex">
          <Sidebar pendingCount={pending} alertCount={alerts} />
          <div className="mt-auto space-y-2 px-3 text-[11px] text-muted">
            <p>Simulated markets, demo money. Not investment advice.</p>
            <Link href="/" className="hover:text-fg">
              ← Back to site
            </Link>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link href="/app" className="mr-2 font-semibold text-fg lg:hidden">
                  MyLiquid
                </Link>
                <span className="text-muted">Market date</span>
                <span className="font-medium text-fg">{formatDate(simDate(db))}</span>
                <Badge tone={mode === "claude" ? "violet" : "neutral"}>
                  {mode === "claude" ? `Agents: Claude (${modelName()})` : "Agents: offline mode"}
                </Badge>
                {mandate.killSwitch ? (
                  <Link href="/app/settings">
                    <Badge tone="critical">Agents paused</Badge>
                  </Link>
                ) : (
                  <Badge tone="good">
                    {mandate.autonomy === "propose" ? "Propose-only" : "Bounded autonomy"}
                  </Badge>
                )}
              </div>
              <SimControls />
            </div>
            <MobileNav />
          </header>
          <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
