import { getDb } from "@/lib/db";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
  // RFC 4180, and no formula injection when opened in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Every research answer as CSV, for synthesis in a spreadsheet. Admin only. */
export const GET = handle(async () => {
  await requireAdmin();
  const rows = getDb()
    .prepare("SELECT created_at, kind, email, answers FROM research_responses ORDER BY created_at")
    .all() as { created_at: string; kind: string; email: string | null; answers: string }[];
  const lines = [["created_at", "kind", "email", "answers"].join(",")];
  for (const r of rows) lines.push([r.created_at, r.kind, r.email, r.answers].map(cell).join(","));
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="myliquid-research-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
});
