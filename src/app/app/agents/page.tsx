import { getDb } from "@/lib/db";
import { formatUsd } from "@/lib/domain/money";
import { AGENTS, DESK_AGENTS } from "@/lib/agents/registry";
import { agentMode, modelName } from "@/lib/agents/llm";
import { lastRunByAgent, listRuns } from "@/lib/services/audit";
import { getMandate } from "@/lib/services/repo";
import { AgentDesk, type DeskAgentCard } from "@/components/app/AgentDesk";
import { AgentAvatar, Badge, Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agent desk" };

export default function AgentsPage() {
  const db = getDb();
  const mandate = getMandate(db);
  const last = lastRunByAgent(db);
  const mode = agentMode();

  const cards: DeskAgentCard[] = DESK_AGENTS.map((id) => {
    const a = AGENTS[id];
    const run = last.get(id);
    return {
      id,
      name: a.name,
      role: a.role,
      summary: a.summary,
      cannot: a.cannot,
      tools: a.tools,
      lastRun: run
        ? { summary: run.summary, simDate: run.simDate, mode: run.mode, status: run.status }
        : null,
      paused:
        mandate.disabledAgents.includes(id) ||
        (mandate.killSwitch && (id === "atlas" || id === "quant")),
    };
  });

  const history = listRuns(db, 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-fg">Agent desk</h1>
          <p className="mt-1 max-w-3xl text-sm text-fg-2">
            Five specialists with separated duties, modeled on how serious funds split strategy,
            execution, diligence, valuation and risk. Every capability is a typed tool behind the
            same guardrails. Agents propose; you approve.
          </p>
        </div>
        <Badge tone={mode === "claude" ? "violet" : "neutral"}>
          {mode === "claude" ? `Claude · ${modelName()}` : "Offline mode: deterministic agents"}
        </Badge>
      </div>

      <Card
        title="Mandate"
        subtitle="What agents may do without asking. Change it under Guardrails."
        action={
          <LinkButton href="/app/settings" size="sm">
            Edit guardrails
          </LinkButton>
        }
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Autonomy", mandate.autonomy === "propose" ? "Propose only" : "Bounded"],
            ["Auto-execute ≤", formatUsd(mandate.autoExecuteLimitCents)],
            ["Per order ≤", formatUsd(mandate.perOrderCapCents)],
            ["Per day ≤", formatUsd(mandate.dailyCapCents)],
            ["Agent budget", formatUsd(mandate.agentBudgetCents)],
            ["Sleeves", mandate.allowedSleeves.join(", ") || "none"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <AgentDesk agents={cards} killSwitch={mandate.killSwitch} />

      <Card title="Run history" bodyClassName="p-0">
        {history.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">No runs yet.</p>
        ) : (
          <ul>
            {history.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-sm first:border-t-0"
              >
                <AgentAvatar agent={r.agent} size="sm" />
                <span className="w-20 text-fg">
                  {AGENTS[r.agent as keyof typeof AGENTS]?.name ?? r.agent}
                </span>
                <span className="text-xs text-muted">{r.simDate}</span>
                <span className="text-xs text-muted">{r.trigger}</span>
                <Badge tone={r.mode === "claude" ? "violet" : "neutral"}>{r.mode}</Badge>
                <span className="ml-auto">
                  <Badge
                    tone={
                      r.status === "completed"
                        ? "good"
                        : r.status === "failed"
                          ? "critical"
                          : "accent"
                    }
                  >
                    {r.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
