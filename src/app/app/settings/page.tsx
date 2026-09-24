import { getDb } from "@/lib/db";
import { getInvestor, getMandate } from "@/lib/services/repo";
import { KillSwitch, ResetDemo, SettingsForm } from "@/components/app/SettingsForm";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guardrails" };

export default function SettingsPage() {
  const db = getDb();
  const investor = getInvestor(db);
  const mandate = getMandate(db);
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-fg">Guardrails</h1>
        <p className="mt-1 text-sm text-fg-2">
          You set the rules; Sentinel enforces them on every order from you, an agent, an autopilot
          rule or the API. Only you can change them. No agent has a tool for it.
        </p>
      </div>
      <KillSwitch mandate={mandate} />
      <SettingsForm
        key={JSON.stringify(mandate) + investor.riskProfile}
        riskProfile={investor.riskProfile}
        mandate={mandate}
      />
      <Card title="Demo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-2">
            Signed in as {investor.name} ({investor.email}), identity {investor.kycStatus}. Markets
            are simulated and deterministic.
          </p>
          <ResetDemo />
        </div>
      </Card>
    </div>
  );
}
