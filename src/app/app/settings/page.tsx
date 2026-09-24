import { getDb } from "@/lib/db";
import { requireInvestor } from "@/lib/auth/current";
import { getMandate } from "@/lib/services/repo";
import { AccountActions, KillSwitch, SettingsForm } from "@/components/app/SettingsForm";
import { Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guardrails" };

export default async function SettingsPage() {
  const investor = await requireInvestor();
  const mandate = getMandate(getDb(), investor.id);
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-fg">Guardrails</h1>
        <p className="mt-1 text-sm text-fg-2">
          You set the rules, and Sentinel enforces them on every order from you, an agent, an
          autopilot rule or a connected agent. Only you can change them: no agent has a tool for it.
        </p>
      </div>
      <KillSwitch mandate={mandate} />
      <SettingsForm
        key={JSON.stringify(mandate) + investor.riskProfile}
        riskProfile={investor.riskProfile}
        mandate={mandate}
      />
      <Card title="Account">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-sm text-fg-2">
            <div className="text-fg">{investor.name}</div>
            <div>
              {investor.kind === "guest"
                ? "Guest account (not saved)"
                : (investor.email ?? "Demo account")}
            </div>
            <div className="mt-1 text-xs text-muted">
              Identity {investor.kycStatus}. Markets are simulated and money is demo money.
            </div>
          </div>
          {investor.kind === "guest" && (
            <LinkButton href="/signup" variant="primary" size="sm">
              Save this account
            </LinkButton>
          )}
        </div>
        <div className="mt-5 border-t border-line pt-5">
          <AccountActions isGuest={investor.kind === "guest"} />
        </div>
      </Card>
    </div>
  );
}
