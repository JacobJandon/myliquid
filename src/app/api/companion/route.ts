import { z } from "zod";
import { getDb } from "@/lib/db";
import { HttpError, handle, json, parseBody } from "@/lib/api";
import { requireApiInvestor } from "@/lib/auth/current";
import { PET_COLORS } from "@/lib/domain/companion";
import {
  checkIn,
  customize,
  feed,
  getCompanionView,
  getQuiz,
  play,
  sleep,
  wake,
} from "@/lib/services/companion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("checkin") }),
  z.object({ action: z.literal("feed") }),
  z.object({
    action: z.literal("play"),
    answerIndex: z.number().int().min(0).max(2),
    seed: z.string().max(120),
  }),
  z.object({ action: z.literal("sleep") }),
  z.object({ action: z.literal("wake") }),
  z.object({
    action: z.literal("customize"),
    name: z.string().max(40).optional(),
    color: z
      .enum(Object.keys(PET_COLORS) as [keyof typeof PET_COLORS, ...(keyof typeof PET_COLORS)[]])
      .optional(),
  }),
]);

export const GET = handle(async () => {
  const investorId = await requireApiInvestor();
  const db = getDb();
  return json({ companion: getCompanionView(db, investorId), quiz: getQuiz(db, investorId) });
});

/** Caring for the pet. Sleep and wake are the kill switch, so they are human-only (session required). */
export const POST = handle(async (req: Request) => {
  const investorId = await requireApiInvestor();
  const body = await parseBody(req, ActionBody);
  const db = getDb();
  let result: { message: string } & Record<string, unknown>;
  switch (body.action) {
    case "checkin":
      result = { ...checkIn(db, investorId) };
      break;
    case "feed":
      result = { ...feed(db, investorId) };
      break;
    case "play":
      result = { ...play(db, investorId, body.answerIndex, body.seed) };
      break;
    case "sleep":
      result = { ...sleep(db, investorId) };
      break;
    case "wake":
      result = { ...wake(db, investorId) };
      break;
    case "customize":
      customize(db, investorId, { name: body.name, color: body.color });
      result = { message: "Saved." };
      break;
    default:
      throw new HttpError(400, "Unknown action");
  }
  return json({
    ...result,
    companion: getCompanionView(db, investorId),
    quiz: getQuiz(db, investorId),
  });
});
