import { z } from "zod";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { TESTBED_AGENT_IDS } from "@/lib/ainra";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { GATE_MAX_ACTION_CENTS, decide } from "@/lib/gate/engine";
import { identityFromPassport, samplePassport } from "@/lib/gate/identity";
import { trackRequest } from "@/lib/analytics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cents = z.number().int().min(0).max(GATE_MAX_ACTION_CENTS);
const list = z.array(z.string().trim().min(1).max(64)).max(200);

const Body = z.object({
  action: z.object({
    kind: z.enum(["trade", "payment"]),
    amountCents: z.number().int(),
    side: z.enum(["buy", "sell"]).optional(),
    instrument: z.string().trim().max(64).optional(),
    merchant: z.string().trim().max(120).optional(),
    category: z.string().trim().max(64).optional(),
  }),
  agent: z.object({
    id: z.string().trim().min(1).max(120),
    /** An AINRA presentation bundle (object, JSON text or base64url), as the agent presented it. */
    passport: z.unknown().optional(),
    /** Instead of a passport: one of MyLiquid's testbed agents (testbed mode only). */
    sample: z.enum(TESTBED_AGENT_IDS).optional(),
    revoked: z.boolean().optional(),
  }),
  policy: z.object({
    mode: z.enum(["auto", "propose"]),
    perActionLimitCents: cents,
    dailyLimitCents: cents,
    maxActionsPerHour: z.number().int().min(0).max(100_000).optional(),
    allowedInstruments: list.optional(),
    blockedCategories: list.optional(),
    killSwitch: z.boolean().optional(),
  }),
  usage: z
    .object({
      usedTodayCents: cents.optional(),
      actionsLastHour: z.number().int().min(0).max(1_000_000).optional(),
    })
    .optional(),
});

/**
 * MyLiquid Gate, v1: decides whether an agent may take an action on its own, needs a person, or is blocked
 * (`lib/gate/engine.ts`). Stateless: it stores nothing and moves no money; the caller keeps the decision and its
 * evidence hashes for its own records.
 */
export const POST = handle(async (req: Request) => {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`gate:${ip}`, 600, 60_000))
    throw new HttpError(429, "Too many decisions; slow down.");
  const body = await parseBody(req, Body);
  let passport = body.agent.passport;
  if (passport === undefined && body.agent.sample) {
    passport = await samplePassport(body.agent.sample, body.agent.revoked);
    if (passport === null)
      throw new HttpError(400, "Sample agents are only available in testbed mode.");
  }
  const identity = identityFromPassport(passport);
  const decision = decide(
    {
      action: body.action,
      agent: { id: body.agent.id, identity },
      policy: body.policy,
      usage: body.usage,
    },
    { now: new Date() },
  );
  trackRequest(req, "gate_decided", null, {
    decision: decision.decision,
    verified: identity.verified,
  });
  return json({ ...decision, identity });
});
