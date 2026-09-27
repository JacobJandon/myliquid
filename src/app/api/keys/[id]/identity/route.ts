import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { TESTBED_AGENT_IDS, ainraMode, testbedBundle } from "@/lib/ainra";
import {
  bindKeyIdentity,
  getKeyIdentity,
  setRequirePassport,
  setTradingLimits,
  unbindKeyIdentity,
} from "@/lib/services/agentIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const BindBody = z.object({
  passport: z.unknown().optional(),
  sample: z.enum(TESTBED_AGENT_IDS).optional(),
  revoked: z.boolean().optional(),
});

/** Pin an API key to the AINRA identity in a valid passport (the connected agent's permanent AINRA Number). */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  const body = await parseBody(req, BindBody);
  if (body.sample && ainraMode() !== "testbed")
    throw new HttpError(400, "Testbed passports are only available in testbed mode.");
  const passport = body.sample
    ? await testbedBundle(body.sample, { revoked: body.revoked })
    : body.passport;
  return json(bindKeyIdentity(getDb(), investorId, id, passport));
});

const PatchBody = z.object({
  requirePassport: z.boolean().optional(),
  trading: z
    .object({
      mode: z.enum(["propose", "auto"]),
      perTradeLimitUsd: z.number().min(0).max(1_000_000).default(0),
      dailyLimitUsd: z.number().min(0).max(10_000_000).default(0),
    })
    .optional(),
});

/** Require a passport or not, and whether the identified agent may trade on its own within limits. */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  const body = await parseBody(req, PatchBody);
  const db = getDb();
  if (body.requirePassport !== undefined)
    setRequirePassport(db, investorId, id, body.requirePassport);
  if (body.trading)
    setTradingLimits(db, investorId, id, {
      mode: body.trading.mode,
      perTradeLimitCents: Math.round(body.trading.perTradeLimitUsd * 100),
      dailyLimitCents: Math.round(body.trading.dailyLimitUsd * 100),
    });
  return json({ identity: getKeyIdentity(db, investorId, id) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  unbindKeyIdentity(getDb(), investorId, id);
  return json({ ok: true });
});
