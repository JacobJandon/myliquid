import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { createInvite, listInvites } from "@/lib/services/agentInvites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  label: z.string().max(60).default(""),
  allowTrade: z.boolean(),
  allowPay: z.boolean().default(false),
  tradeMode: z.enum(["propose", "auto"]),
  perTradeLimitUsd: z.number().min(0).max(1_000_000).default(0),
  dailyLimitUsd: z.number().min(0).max(10_000_000).default(0),
});

export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  return json({ invites: listInvites(getDb(), investorId) });
});

/** The investor invites an outside agent; the code is returned once. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, Body);
  const { code, invite } = createInvite(getDb(), investorId, {
    label: body.label,
    allowTrade: body.allowTrade,
    allowPay: body.allowPay,
    tradeMode: body.tradeMode,
    perTradeLimitCents: Math.round(body.perTradeLimitUsd * 100),
    dailyLimitCents: Math.round(body.dailyLimitUsd * 100),
  });
  return json({ code, invite }, 201);
});
