import { getDb } from "@/lib/db";
import { HttpError, handle, json } from "@/lib/api";
import { getPaymentRequest } from "@/lib/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status for the terminal screen. Shows only what a merchant would see. */
export const GET = handle(
  async (_req: Request, { params }: { params: Promise<{ code: string }> }) => {
    const { code } = await params;
    const request = getPaymentRequest(getDb(), code);
    if (!request) throw new HttpError(404, "No payment request with that code");
    return json({ request });
  },
);
