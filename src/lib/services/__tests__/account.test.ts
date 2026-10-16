import { describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth/crypto";
import { createSession, deleteOtherSessions, investorForSession } from "@/lib/auth/sessions";
import { changePassword, createInvestor, findInvestorByEmail } from "../investors";
import { verifyPassword } from "@/lib/auth/crypto";

describe("changing a password", () => {
  it("needs the current password, then signs out every other session", () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    const id = createInvestor(db, {
      kind: "user",
      name: "Ada",
      email: "ada@example.com",
      passwordHash: hashPassword("first-password"),
      riskProfile: "balanced",
      starter: "cash",
    });
    const here = createSession(db, id).token;
    const phone = createSession(db, id).token;

    expect(changePassword(db, id, "wrong", "second-password")).toBe(false);
    expect(changePassword(db, id, "first-password", "second-password")).toBe(true);
    const stored = findInvestorByEmail(db, "ada@example.com")!.passwordHash;
    expect(verifyPassword("second-password", stored)).toBe(true);
    expect(verifyPassword("first-password", stored)).toBe(false);

    expect(deleteOtherSessions(db, id, here)).toBe(1);
    expect(investorForSession(db, here)).toBe(id);
    expect(investorForSession(db, phone)).toBeNull();
  });

  it("isn't possible for a guest, who has no password", () => {
    const db = openDatabase(":memory:", { today: "2026-10-15" });
    const guest = createInvestor(db, {
      kind: "guest",
      name: "Guest",
      riskProfile: "balanced",
      starter: "cash",
    });
    expect(changePassword(db, guest, "", "anything-new")).toBe(false);
  });
});
