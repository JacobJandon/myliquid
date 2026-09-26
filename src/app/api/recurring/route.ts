import { z } from "zod";
import { getDb } from "@/lib/db";
import { amountUsd, handle, json, parseBody, toCents } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { createPlan, listPlans } from "@/lib/services/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PlanBody = z.object({
  productId: z.string(),
  amountUsd,
  cadence: z.enum(["weekly", "biweekly", "monthly"]),
});

export const GET = handle(async () =>
  json({ plans: listPlans(getDb(), await requireApiInvestor()) }),
);

/** Sets up a recurring investment. The first buy happens on the next market day. */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, PlanBody);
  return json({
    plan: createPlan(getDb(), investorId, {
      productId: body.productId,
      amountCents: toCents(body.amountUsd),
      cadence: body.cadence,
    }),
  });
});
