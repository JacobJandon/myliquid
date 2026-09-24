import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { logEvent } from "@/lib/services/audit";
import { listAlerts, resolveAlert } from "@/lib/services/alerts";
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
      disabledAgents: z.array(
        z.enum(["atlas", "quant", "scout", "ledger", "sentinel", "copilot", "external"]),
      ),
    })
    .partial()
    .optional(),
});

export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  const db = getDb();
  return json({ investor: getInvestor(db, investorId), mandate: getMandate(db, investorId) });
});

/** Human-only: agents have no tool that can change settings or release the kill switch. */
export const PATCH = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, SettingsBody);
  const db = getDb();
  if (body.riskProfile) {
    setRiskProfile(db, investorId, body.riskProfile);
    logEvent(db, investorId, {
      agent: "user",
      kind: "system",
      title: `Risk profile set to ${body.riskProfile}`,
    });
  }
  if (body.mandate) {
    const before = getMandate(db, investorId);
    const after = updateMandate(db, investorId, {
      ...body.mandate,
      killReason:
        body.mandate.killSwitch && !before.killSwitch
          ? "Paused by the investor"
          : before.killReason,
    });
    if (before.killSwitch && !after.killSwitch) {
      for (const a of listAlerts(db, investorId, { openOnly: true })) {
        if (a.code === "circuit_breaker" || a.code === "agents_paused")
          resolveAlert(db, investorId, a.id);
      }
      logEvent(db, investorId, {
        agent: "user",
        kind: "system",
        title: "Agents resumed by the investor",
      });
    } else if (!before.killSwitch && after.killSwitch) {
      logEvent(db, investorId, {
        agent: "user",
        kind: "system",
        title: "Kill switch pulled by the investor",
      });
    } else {
      logEvent(db, investorId, { agent: "user", kind: "system", title: "Agent mandate updated" });
    }
  }
  return json({ investor: getInvestor(db, investorId), mandate: getMandate(db, investorId) });
});
