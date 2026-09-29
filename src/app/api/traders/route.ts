import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { hireTrader, listHostedTraders, runTrader } from "@/lib/services/hostedTraders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HireBody = z.object({
  agent: z.enum(["momentum-trader", "treasury-agent", "research-analyst"]),
  mode: z.enum(["propose", "auto"]).default("auto"),
  perTradeLimitUsd: z.number().min(0).max(1_000_000).default(1000),
  dailyLimitUsd: z.number().min(0).max(10_000_000).default(3000),
});

export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  return json({ traders: listHostedTraders(getDb(), investorId) });
});

/** Hires a hosted trader (it enrolls with its AINRA passport) and lets it work today straight away. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, HireBody);
  const db = getDb();
  const trader = await hireTrader(db, investorId, body.agent, {
    mode: body.mode,
    perTradeLimitCents: Math.round(body.perTradeLimitUsd * 100),
    dailyLimitCents: Math.round(body.dailyLimitUsd * 100),
  });
  const summary = await runTrader(db, investorId, trader.id);
  return json({ trader, summary }, 201);
});
