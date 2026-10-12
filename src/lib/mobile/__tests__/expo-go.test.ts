import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/siteGate";
import { expoGoLink } from "../expoGo";

describe("Expo Go links", () => {
  it("accepts Expo Go links to the test tunnels", () => {
    for (const u of [
      "exps://quiet-river-dawn.trycloudflare.com",
      "exp://abc123-anonymous-8081.exp.direct",
      "exp://abc123-anonymous-8081.exp.direct:80/--/app",
    ])
      expect(expoGoLink(u), u).toBe(u);
  });

  it("refuses anything else, so the page can't send people elsewhere", () => {
    for (const u of [
      undefined,
      "",
      "https://quiet-river-dawn.trycloudflare.com",
      "exps://evil.example.com",
      "exps://trycloudflare.com.evil.example",
      "javascript:alert(1)",
      'exps://a.trycloudflare.com/"><script>',
      ["exps://a.trycloudflare.com"],
    ])
      expect(expoGoLink(u), String(u)).toBeNull();
  });

  it("is reachable behind the site password", () => {
    expect(isPublicPath("/expo-go")).toBe(true);
  });
});
