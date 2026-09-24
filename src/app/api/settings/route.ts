import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { logEvent } from "@/lib/services/audit";
import { resolveAlert, listAlerts } from "@/lib/services/alerts";
import { getInvestor, getMandate, setRiskProfile, updateMandate } from "@/lib/services/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cents = z.number().int().min(0).max(100_000_000_00);

const SettingsBody = z.object({
  riskProfile: z.enum(["conservative", "balanced", "growth", "aggressive"]).optional(),
  mandate: z
    .object({
      autonomy: z.enum(["propose", "bounded"]),
      autoExecuteLimitCents: cents,
      agentBudgetCents: cents,
      perOrderCapCents: cents,
      dailyCapCents: cents,
      maxOrdersPerDay: z.number().int().min(0).max(100),
      allowedSleeves: z.array(z.enum(["index", "trading", "bitcoin", "business", "private"])),
      readOnly: z.boolean(),
      killSwitch: z.boolean(),
      circuitBreakerPct: z.number().min(0.01).max(0.5),
      disabledAgents: z.array(z.enum(["atlas", "quant", "scout", "ledger", "sentinel", "copilot"])),
    })
    .partial()
    .optional(),
});

export const GET = handle(() => {
  const db = getDb();
  return json({ investor: getInvestor(db), mandate: getMandate(db) });
});

/** Human-only: agents have no tool that can change settings or release the kill switch. */
export const PATCH = handle(async (req: Request) => {
  const body = await parseBody(req, SettingsBody);
  const db = getDb();
  if (body.riskProfile) {
    setRiskProfile(db, body.riskProfile);
    logEvent(db, {
      agent: "user",
      kind: "system",
      title: `Risk profile set to ${body.riskProfile}`,
    });
  }
  if (body.mandate) {
    const before = getMandate(db);
    const after = updateMandate(db, {
      ...body.mandate,
      killReason:
        body.mandate.killSwitch && !before.killSwitch
          ? "Paused by the investor"
          : before.killReason,
    });
    if (before.killSwitch && !after.killSwitch) {
      for (const a of listAlerts(db, { openOnly: true })) {
        if (a.code === "circuit_breaker" || a.code === "agents_paused") resolveAlert(db, a.id);
      }
      logEvent(db, { agent: "user", kind: "system", title: "Agents resumed by the investor" });
    } else if (!before.killSwitch && after.killSwitch) {
      logEvent(db, { agent: "user", kind: "system", title: "Kill switch pulled by the investor" });
    } else {
      logEvent(db, { agent: "user", kind: "system", title: "Agent mandate updated" });
    }
  }
  return json({ investor: getInvestor(db), mandate: getMandate(db) });
});
