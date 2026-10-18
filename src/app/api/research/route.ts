import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { currentInvestorId } from "@/lib/auth/current";
import { tooManyAttempts } from "@/lib/auth/rateLimit";
import { trackRequest, visitorOf } from "@/lib/analytics/request";
import { PMF_ANSWERS } from "@/lib/domain/analytics";
import { hasResponded, recordResponse } from "@/lib/services/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (max: number) => z.string().trim().max(max).optional();
const email = z.email().max(200);

/** The four research instruments (docs/discovery/2-research-and-validation.md). */
const Body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pmf"),
    answer: z.enum([...PMF_ANSWERS, "dismissed"]),
    benefit: text(1000),
    who: text(1000),
    improve: text(1000),
  }),
  z.object({
    kind: z.literal("waitlist"),
    segment: z.enum(["investor", "developer", "business", "other"]),
    wants: z.array(z.enum(["invest", "rebalance", "pay", "research", "trade", "nothing"])).max(6),
    today: text(300),
    email: email.optional(),
    consent: z.boolean(),
  }),
  z.object({
    kind: z.literal("design_partner"),
    company: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(120),
    email,
    agents: text(1000),
    timeline: z.enum(["now", "quarter", "year", "exploring"]),
    consent: z.literal(true),
  }),
  z.object({
    kind: z.literal("ainra_interest"),
    role: z.enum(["agent_builder", "platform", "registrar", "researcher", "other"]),
    note: text(1000),
    email: email.optional(),
    consent: z.boolean(),
  }),
]);

/**
 * Records an answer to one of MyLiquid's research instruments. Emails are kept only with consent and only for
 * research follow-up (see /privacy).
 */
export const POST = handle(async (req: Request) => {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`research:${ip}`, 20, 3_600_000))
    throw new HttpError(429, "Thanks, we have your answers. Try again later.");
  const body = await parseBody(req, Body);
  const db = getDb();
  const investorId = await currentInvestorId();
  const visitorId = visitorOf(req);
  const subject = { visitorId, investorId };

  switch (body.kind) {
    case "pmf": {
      if (!investorId) throw new HttpError(401, "Sign in to answer");
      if (hasResponded(db, investorId, "pmf")) return json({ ok: true, duplicate: true });
      const { kind, ...answers } = body;
      recordResponse(db, kind, subject, answers);
      if (body.answer !== "dismissed")
        trackRequest(req, "pmf_answered", investorId, { answer: body.answer });
      return json({ ok: true });
    }
    case "waitlist": {
      if (body.email && !body.consent)
        throw new HttpError(400, "Tick the box so we may email you, or leave the email out.");
      const { kind, email: address, consent, ...answers } = body;
      recordResponse(db, kind, subject, { ...answers, consent }, address?.toLowerCase() ?? null);
      trackRequest(req, "waitlist_joined", investorId, { segment: body.segment });
      return json({ ok: true });
    }
    case "design_partner": {
      const { kind, email: address, ...answers } = body;
      recordResponse(db, kind, subject, answers, address.toLowerCase());
      trackRequest(req, "design_partner_requested", investorId, { timeline: body.timeline });
      return json({ ok: true });
    }
    case "ainra_interest": {
      if (body.email && !body.consent)
        throw new HttpError(400, "Tick the box so we may email you, or leave the email out.");
      const { kind, email: address, consent, ...answers } = body;
      recordResponse(db, kind, subject, { ...answers, consent }, address?.toLowerCase() ?? null);
      trackRequest(req, "ainra_interest", investorId, { role: body.role });
      return json({ ok: true });
    }
  }
});
