import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { createRule, listRules } from "@/lib/services/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RuleBody = z.object({
  productId: z.string(),
  condition: z.enum([
    "price_below",
    "price_above",
    "drawdown_below",
    "weight_above",
    "weight_below",
  ]),
  threshold: z.number(),
  action: z.enum(["buy", "sell"]),
  amountUsd,
  name: z.string().max(120).optional(),
});

export const GET = handle(() => json({ rules: listRules(getDb()) }));

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, RuleBody);
  const rule = createRule(getDb(), { ...body, amountCents: toCents(body.amountUsd) }, "user");
  return json({ rule });
});
