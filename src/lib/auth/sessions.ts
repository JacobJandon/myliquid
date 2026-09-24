import { nowIso, type Db } from "@/lib/db";
import { randomToken, sha256 } from "./crypto";

/** Database-backed sessions. Only a hash of the token is stored. */

export const SESSION_DAYS = 30;

export function createSession(db: Db, investorId: string): { token: string; expiresAt: Date } {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.prepare(
    "INSERT INTO sessions (id, investor_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(sha256(token), investorId, nowIso(), expiresAt.toISOString());
  return { token, expiresAt };
}

export function investorForSession(db: Db, token: string | undefined | null): string | null {
  if (!token) return null;
  const row = db
    .prepare(
      "SELECT s.investor_id FROM sessions s JOIN investors i ON i.id = s.investor_id WHERE s.id = ? AND s.expires_at > ?",
    )
    .get(sha256(token), nowIso()) as { investor_id: string } | undefined;
  return row?.investor_id ?? null;
}

export function deleteSession(db: Db, token: string | undefined | null): void {
  if (token) db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
}

export function deleteExpiredSessions(db: Db): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
}
