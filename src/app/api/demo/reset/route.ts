import { handle, json } from "@/lib/api";
import { resetDatabase, simDate } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Wipes the demo database and re-seeds a fresh year of history. */
export const POST = handle(() => {
  const db = resetDatabase();
  return json({ ok: true, simDate: simDate(db) });
});
