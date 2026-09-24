import Link from "next/link";
import { getDb, simDate } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { agentMode, modelName } from "@/lib/agents/llm";
import { formatDate } from "@/lib/domain/dates";
import { listAlerts } from "@/lib/services/alerts";
import { listProposals } from "@/lib/services/proposals";
import { getMandate } from "@/lib/services/repo";
import { ensureMarketCurrent } from "@/lib/services/sim";
import { getCompanionView } from "@/lib/services/companion";
import type { Stage } from "@/lib/domain/companion";
import { MobileNav, Sidebar } from "@/components/app/Sidebar";
import { SimControls } from "@/components/app/SimControls";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const investor = await requireInvestor();
  const db = getDb();
  ensureMarketCurrent(db);
  const pending = listProposals(db, investor.id, { status: "pending" }).length;
  const alerts = listAlerts(db, investor.id, { openOnly: true }).filter(
    (a) => a.severity !== "info",
  ).length;
  const mandate = getMandate(db, investor.id);
  const mode = agentMode();
  const pet = getCompanionView(db, investor.id);

  return (
    <div className="bg-glow min-h-screen">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-6 lg:flex">
          <Sidebar
            pendingCount={pending}
            alertCount={alerts}
            user={{ name: investor.name, email: investor.email, kind: investor.kind }}
            pet={{
              name: pet.name,
              color: pet.color,
              level: pet.level,
              stage: pet.stage.id as Stage,
              mood: pet.vitals.mood,
            }}
          />
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-3">
              <div className="flex min-w-0 items-center gap-2 text-xs">
                <Link href="/app" className="mr-1 font-semibold text-fg lg:hidden">
                  MyLiquid
                </Link>
                <span className="hidden text-muted sm:inline">Market date</span>
                <span className="font-medium whitespace-nowrap text-fg">
                  {formatDate(simDate(db))}
                </span>
                <span className="hidden md:inline-flex">
                  <Badge tone={mode === "claude" ? "violet" : "neutral"}>
                    {mode === "claude" ? `Agents: Claude (${modelName()})` : "Agents: offline mode"}
                  </Badge>
                </span>
                {mandate.killSwitch ? (
                  <Link href="/app/settings">
                    <Badge tone="critical">Agents paused</Badge>
                  </Link>
                ) : (
                  <span className="hidden sm:inline-flex">
                    <Badge tone="good">
                      {mandate.autonomy === "propose" ? "Propose-only" : "Bounded autonomy"}
                    </Badge>
                  </span>
                )}
              </div>
              <SimControls />
            </div>
            <MobileNav />
          </header>
          {investor.kind === "guest" && (
            <div className="border-b border-fg/10 bg-accent-2 px-4 py-2 text-xs text-accent-2-ink sm:px-8">
              You&apos;re exploring a private guest account.{" "}
              <Link href="/signup" className="font-semibold underline underline-offset-2">
                Create an account
              </Link>{" "}
              to keep your portfolio and agents.
            </div>
          )}
          <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
