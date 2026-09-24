import { z } from "zod";
import { getDb } from "@/lib/db";
import { handle, json, parseBody } from "@/lib/api";
import { deleteRule, setRuleStatus } from "@/lib/services/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const StatusBody = z.object({ status: z.enum(["active", "paused"]) });

export const PATCH = handle(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { status } = await parseBody(req, StatusBody);
    setRuleStatus(getDb(), id, status);
    return json({ ok: true });
  },
);

export const DELETE = handle(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    deleteRule(getDb(), id);
    return json({ ok: true });
  },
);
