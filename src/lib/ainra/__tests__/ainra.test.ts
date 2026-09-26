import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_INVESTOR_ID as ID, openDatabase, setDb, type Db } from "@/lib/db";
import { POST as mcpPost } from "@/app/api/mcp/route";
import { POST as presentPost } from "@/app/api/agent-identity/route";
import {
  ainraMode,
  ainraNow,
  checkPassport,
  parsePassport,
  sampleBundle,
  scopesFromCapabilities,
} from "@/lib/ainra";
import { listAlerts } from "@/lib/services/alerts";
import { createApiKey, type ApiPrincipal } from "@/lib/services/apiKeys";
import { listEvents } from "@/lib/services/audit";
import {
  bindKeyIdentity,
  getKeyIdentity,
  identityGate,
  presentPassport,
  setRequirePassport,
  unbindKeyIdentity,
} from "@/lib/services/agentIdentity";

const NUMBER = "did:ainra:registrar-07:acme:invoicing";

describe("AINRA passports (TEST-ROOT testbed)", () => {
  it("runs in testbed mode on the sample clock without configured anchors", () => {
    expect(ainraMode()).toBe("testbed");
    expect(ainraNow()).toBe(1776729600);
  });

  it("verifies a valid passport and names the agent", async () => {
    const check = checkPassport(await sampleBundle("valid"));
    expect(check).toMatchObject({
      status: "valid",
      reason: null,
      name: "ainra:registrar-07:acme:invoicing@1.0.0",
      number: NUMBER,
      tier: "L3",
      capabilities: ["read:invoices"],
    });
    expect(check.event?.freshness_age_s).toBe(1);
  });

  it("fails closed: revoked, stale, tampered and unreadable passports are invalid", async () => {
    expect(checkPassport(await sampleBundle("revoked"))).toMatchObject({
      status: "invalid",
      reason: "revoked",
    });
    // At real time the stapled status is months old: never "probably fine".
    expect(
      checkPassport(await sampleBundle("valid"), { now: Math.floor(Date.now() / 1000) }).reason,
    ).toBe("stale_status");
    const tampered = structuredClone(await sampleBundle("valid")) as Record<string, unknown>;
    const claims = tampered.claims as string;
    tampered.claims = claims.slice(0, 40) + (claims[40] === "A" ? "B" : "A") + claims.slice(41);
    expect(checkPassport(tampered).status).toBe("invalid");
    expect(checkPassport("not a passport").reason).toBe("unreadable");
    expect(checkPassport(12).reason).toBe("unreadable");
  });

  it("accepts the base64url header form", async () => {
    const encoded = Buffer.from(JSON.stringify(await sampleBundle("valid"))).toString("base64url");
    expect(parsePassport(encoded)).not.toBeNull();
    expect(checkPassport(encoded).status).toBe("valid");
  });

  it("maps myliquid:* capabilities to scopes, and nothing else", () => {
    expect(scopesFromCapabilities(["read:invoices"])).toBeNull();
    expect(scopesFromCapabilities(["myliquid:read"])).toEqual(["read"]);
    expect(scopesFromCapabilities(["myliquid:trade"])).toEqual(["read", "trade"]);
    expect(scopesFromCapabilities(["myliquid:*"])).toEqual(["read", "trade", "pay"]);
  });
});

describe("pinning an API key to an agent's AINRA identity", () => {
  let db: Db;
  let key: string;
  let principal: ApiPrincipal;

  beforeEach(() => {
    db = openDatabase(":memory:", { today: "2026-09-24" });
    setDb(db);
    const created = createApiKey(db, ID, "billing agent", ["read", "trade"]);
    key = created.key;
    principal = {
      investorId: ID,
      keyId: created.apiKey.id,
      keyName: "billing agent",
      scopes: ["read", "trade"],
    };
  });

  it("binds only a valid passport", async () => {
    expect(() => bindKeyIdentity(db, ID, principal.keyId, "garbage")).toThrow(/can't be bound/);
    const { identity } = bindKeyIdentity(db, ID, principal.keyId, await sampleBundle("valid"));
    expect(identity).toMatchObject({
      ainraNumber: NUMBER,
      requirePassport: true,
      verifiedUntil: null,
    });
  });

  it("gates the key until the agent presents, for five minutes, and a revoked passport cuts it off", async () => {
    expect(identityGate(db, principal).allow).toBe(true); // unbound keys are unaffected
    bindKeyIdentity(db, ID, principal.keyId, await sampleBundle("valid"));
    expect(identityGate(db, principal).allow).toBe(false);

    const wallNow = 2_000_000_000;
    const ok = presentPassport(db, principal, await sampleBundle("valid"), { wallNow });
    expect(ok).toMatchObject({ ok: true, verifiedUntil: wallNow + 300 });
    const gate = identityGate(db, principal, wallNow + 10);
    expect(gate.allow && gate.principal.ainraNumber).toBe(NUMBER);
    expect(identityGate(db, principal, wallNow + 301).allow).toBe(false);

    const revoked = presentPassport(db, principal, await sampleBundle("revoked"), { wallNow });
    expect(revoked).toMatchObject({ ok: false, reason: "revoked" });
    expect(identityGate(db, principal, wallNow + 10).allow).toBe(false);
    expect(
      listAlerts(db, ID, { openOnly: true }).some((a) => a.code === "agent_passport_revoked"),
    ).toBe(true);

    setRequirePassport(db, ID, principal.keyId, false);
    expect(identityGate(db, principal, wallNow + 10).allow).toBe(true);
    unbindKeyIdentity(db, ID, principal.keyId);
    expect(getKeyIdentity(db, ID, principal.keyId)).toBeNull();
  });

  it("narrows scopes to myliquid:* capabilities when the passport declares them", async () => {
    bindKeyIdentity(db, ID, principal.keyId, await sampleBundle("valid"));
    db.prepare("UPDATE api_key_identities SET capabilities = ?, require_passport = 0").run(
      JSON.stringify(["myliquid:read"]),
    );
    const gate = identityGate(db, principal);
    expect(gate.allow && gate.principal.scopes).toEqual(["read"]);
  });

  it("applies MyLiquid's tier floor: L1 reads, L2 trades, L3 pays", async () => {
    bindKeyIdentity(db, ID, principal.keyId, await sampleBundle("valid"));
    db.prepare("UPDATE api_key_identities SET require_passport = 0, tier = ?").run("L1");
    const payer = { ...principal, scopes: ["read", "trade", "pay"] as ApiPrincipal["scopes"] };
    const l1 = identityGate(db, payer);
    expect(l1.allow && l1.principal.scopes).toEqual(["read"]);
    db.prepare("UPDATE api_key_identities SET tier = ?").run("L2");
    const l2 = identityGate(db, payer);
    expect(l2.allow && l2.principal.scopes).toEqual(["read", "trade"]);
    db.prepare("UPDATE api_key_identities SET tier = ?").run("L3");
    const l3 = identityGate(db, payer);
    expect(l3.allow && l3.principal.scopes).toEqual(["read", "trade", "pay"]);
  });

  it("refuses presentations for an unbound key or another identity", async () => {
    expect(presentPassport(db, principal, await sampleBundle("valid")).reason).toBe("not_bound");
    bindKeyIdentity(db, ID, principal.keyId, await sampleBundle("valid"));
    db.prepare("UPDATE api_key_identities SET ainra_number = ?").run(
      "did:ainra:registrar-07:acme:other",
    );
    expect(presentPassport(db, principal, await sampleBundle("valid")).reason).toBe(
      "identity_mismatch",
    );
  });

  it("works end to end over HTTP: MCP refuses until the passport is presented", async () => {
    bindKeyIdentity(db, ID, principal.keyId, await sampleBundle("valid"));
    const call = () =>
      mcpPost(
        new Request("http://localhost:3000/api/mcp", {
          method: "POST",
          headers: {
            host: "localhost:3000",
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "mcp-protocol-version": "2025-06-18",
            authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "get_portfolio", arguments: {} },
          }),
        }),
      );
    const refused = await call();
    expect(refused.status).toBe(403);
    expect(((await refused.json()) as { error: { message: string } }).error.message).toMatch(
      /needs a fresh passport/,
    );

    const presented = await presentPost(
      new Request("http://localhost:3000/api/agent-identity", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ ainra_passport: await sampleBundle("valid") }),
      }),
    );
    expect(presented.status).toBe(200);
    expect(presented.headers.get("x-ainra-verdict")).toContain('"status":"valid"');

    const allowed = await call();
    expect(allowed.status).toBe(200);
    const events = listEvents(db, ID, { limit: 5 });
    expect(events.some((e) => e.title.includes(`(${NUMBER}): get_portfolio`))).toBe(true);
  });
});
