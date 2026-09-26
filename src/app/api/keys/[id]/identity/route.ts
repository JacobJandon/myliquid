import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { ainraMode, sampleBundle } from "@/lib/ainra";
import {
  bindKeyIdentity,
  setRequirePassport,
  unbindKeyIdentity,
} from "@/lib/services/agentIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const BindBody = z.object({
  passport: z.unknown().optional(),
  sample: z.enum(["valid", "revoked"]).optional(),
});

/** Pin an API key to the AINRA identity in a valid passport (the connected agent's permanent AINRA Number). */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  const body = await parseBody(req, BindBody);
  if (body.sample && ainraMode() !== "testbed")
    throw new HttpError(400, "Sample passports are only available in testbed mode.");
  const passport = body.sample ? await sampleBundle(body.sample) : body.passport;
  return json(bindKeyIdentity(getDb(), investorId, id, passport));
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  const { requirePassport } = await parseBody(req, z.object({ requirePassport: z.boolean() }));
  return json({ identity: setRequirePassport(getDb(), investorId, id, requirePassport) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const investorId = await requireApiInvestor();
  const { id } = await params;
  unbindKeyIdentity(getDb(), investorId, id);
  return json({ ok: true });
});
