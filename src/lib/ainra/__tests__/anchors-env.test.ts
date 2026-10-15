import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

describe("AINRA trust anchors from the environment", () => {
  it("loads them from AINRA_ROOTS_JSON and AINRA_DIRECTORY_JSON (hosts without files)", async () => {
    const dir = new URL("../testbed/", import.meta.url);
    vi.stubEnv("AINRA_ROOTS_JSON", readFileSync(new URL("roots.json", dir), "utf8"));
    vi.stubEnv("AINRA_DIRECTORY_JSON", readFileSync(new URL("directory.json", dir), "utf8"));
    vi.resetModules();
    const { ainraMode, checkPassport } = await import("@/lib/ainra");
    expect(ainraMode()).toBe("configured");
    // The anchors loaded: an unreadable passport is refused for what it is, not for missing anchors.
    expect(checkPassport("not a passport").reason).toBe("unreadable");
    const sample = JSON.parse(readFileSync(new URL("agent-momentum-trader.json", dir), "utf8"));
    const meta = JSON.parse(readFileSync(new URL("meta.json", dir), "utf8"));
    expect(checkPassport(sample, { now: meta.now }).status).toBe("valid");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
