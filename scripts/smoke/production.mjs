// Drives a MyLiquid deployment the way a visitor would and fails loudly if any of it doesn't work:
// the site password page (when set), the guest demo, every main screen, a trade, a hosted trader, Gate, and the
// phone app's install pieces. Used by .github/workflows/production-check.yml; runs locally too:
//
//   SITE_URL=http://localhost:3000 node scripts/smoke/production.mjs
//
// Optional: SITE_PASSWORD (MYLIQUID_SITE_PASSWORD), VERCEL_BYPASS (Vercel's Protection Bypass for Automation).
import { chromium } from "playwright";

const SITE = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
if (!SITE) throw new Error("Set SITE_URL");
const headers = process.env.VERCEL_BYPASS
  ? {
      "x-vercel-protection-bypass": process.env.VERCEL_BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};
const results = [];
const failures = [];
const step = async (name, fn) => {
  const t = Date.now();
  try {
    const detail = await fn();
    results.push(`✅ ${name} (${Date.now() - t} ms)${detail ? `: ${detail}` : ""}`);
  } catch (e) {
    results.push(`❌ ${name}: ${String(e?.message ?? e).split("\n")[0]}`);
    failures.push(name);
  }
};
const text = (s) => s.replace(/\s+/g, " ").trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  extraHTTPHeaders: headers,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

await step("Health", async () => {
  const r = await page.request.get(`${SITE}/api/health`, { maxRedirects: 0 });
  if (r.status() !== 200) throw new Error(`HTTP ${r.status()} ${r.headers().location ?? ""}`);
  const h = await r.json();
  if (!h.ok) throw new Error(JSON.stringify(h));
  const feeds = (h.priceFeeds ?? []).map((f) => `${f.product}: ${f.latest ?? "simulated today"}`);
  return [
    `database ${h.database}, agents ${h.agentMode}, market day ${h.simDate}`,
    `clock ${h.marketClock ?? "?"}, prices ${h.prices ?? "simulated"}`,
    ...feeds,
  ].join("; ");
});

await step("Front page (and the site password, if any)", async () => {
  await page.goto(`${SITE}/`, { waitUntil: "load" });
  if (new URL(page.url()).pathname === "/gate") {
    if (!process.env.SITE_PASSWORD)
      throw new Error("the site password page is up; add SITE_PASSWORD");
    await page.getByLabel("Site password").fill(process.env.SITE_PASSWORD);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((u) => u.pathname !== "/gate", { timeout: 20000 });
  }
  await page.getByRole("button", { name: "Try the live demo" }).first().waitFor({ timeout: 20000 });
  return await page.title();
});

await step("Security headers", async () => {
  const h = (await page.request.get(`${SITE}/`)).headers();
  const want = {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  const wrong = Object.entries(want).filter(([k, v]) => h[k] !== v);
  if (wrong.length) throw new Error(`missing or wrong: ${wrong.map(([k]) => k).join(", ")}`);
  if (h["x-powered-by"]) throw new Error("x-powered-by is set");
  return "ok";
});

await step("Guest demo opens Home", async () => {
  await page.getByRole("button", { name: "Try the live demo" }).first().click();
  await page.waitForURL("**/app", { timeout: 90000 });
  const hero = text(await page.locator("section[aria-label=Portfolio]").innerText());
  if (!/\$[\d,]+/.test(hero)) throw new Error(`no portfolio value: ${hero.slice(0, 80)}`);
  return hero.slice(0, 70);
});

for (const [name, path, expect] of [
  ["Invest", "/app/invest", "Index funds"],
  ["Pay", "/app/pay", "Agent Pay"],
  ["Talk", "/app/copilot", "Talk to"],
  ["Traders", "/app/connect", "Your AI traders"],
  ["Activity", "/app/activity", "Activity"],
  ["Guardrails", "/app/settings", "Guardrails"],
  ["Autopilot", "/app/autopilot", "Autopilot"],
  ["Desk", "/app/agents", "desk"],
]) {
  await step(`${name} screen`, async () => {
    const r = await page.goto(`${SITE}${path}`, { waitUntil: "load" });
    if (!r || r.status() >= 400) throw new Error(`HTTP ${r?.status()}`);
    const body = await page.locator("main").innerText();
    if (!body.toLowerCase().includes(expect.toLowerCase()))
      throw new Error(`"${expect}" not on the page`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 0) throw new Error(`${overflow}px wider than the phone`);
  });
}

await step("A trade: buy $100 of the US index", async () => {
  const r = await page.request.post(`${SITE}/api/orders`, {
    data: { productId: "MLUS", side: "buy", amountUsd: 100 },
    headers: { origin: SITE },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok()) throw new Error(`HTTP ${r.status()} ${body.error ?? ""}`);
  return text(JSON.stringify(body)).slice(0, 90);
});

await step("Hire a hosted AI trader and let it work", async () => {
  const r = await page.request.post(`${SITE}/api/traders`, {
    data: { agent: "momentum-trader", mode: "auto", perTradeLimitUsd: 1000, dailyLimitUsd: 3000 },
    headers: { origin: SITE },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok()) throw new Error(`HTTP ${r.status()} ${body.error ?? ""}`);
  await page.goto(`${SITE}/app/connect`, { waitUntil: "load" });
  const card = text(await page.locator("#hosted [data-trader]").first().innerText());
  if (!/Market day/.test(card)) throw new Error(`it didn't work a day: ${card.slice(0, 120)}`);
  return (card.match(/(live registrar|testbed)/) ?? ["?"])[0];
});

await step("Market clock", async () => {
  // On a shared site the market follows the calendar and refuses to be moved by hand (409); locally it may jump.
  const r = await page.request.post(`${SITE}/api/sim/advance`, {
    data: { days: 1 },
    headers: { origin: SITE },
  });
  if (r.status() === 409) return "follows the calendar (no time travel)";
  if (!r.ok()) throw new Error(`HTTP ${r.status()}`);
  return "advanced a day (demo clock)";
});

await step("AINRA lab: a real passport verifies, a tampered copy is refused", async () => {
  const post = async (data) => {
    const r = await page.request.post(`${SITE}/api/ainra/inspect`, { data });
    const d = await r.json();
    if (!r.ok()) throw new Error(`HTTP ${r.status()} ${d.error ?? ""}`);
    return d;
  };
  const good = await post({ sample: "momentum-trader" });
  if (good.check.status !== "valid") throw new Error(`as issued: ${good.check.reason}`);
  const bad = await post({ sample: "momentum-trader", tamper: "widen" });
  if (bad.check.reason !== "sig_invalid") throw new Error(`tampered: ${bad.check.reason}`);
  await page.goto(`${SITE}/ainra`, { waitUntil: "load" });
  await page.locator("[data-verdict=valid]").waitFor({ timeout: 20000 });
  return `${good.trust}: valid; tampered → ${bad.check.reason}`;
});

await step("Gate decides (business playground API)", async () => {
  const r = await page.request.post(`${SITE}/api/gate/v1/decide`, {
    data: {
      action: { kind: "trade", amountCents: 150000, side: "buy", instrument: "MLUS" },
      agent: { id: "smoke", sample: "momentum-trader" },
      policy: { mode: "auto", perActionLimitCents: 200000, dailyLimitCents: 500000 },
    },
  });
  const d = await r.json();
  if (!r.ok()) throw new Error(`HTTP ${r.status()} ${d.error ?? ""}`);
  return `${d.decision}: ${d.summary}`.slice(0, 100);
});

await step("Phone app pieces (manifest, service worker, icons)", async () => {
  for (const p of ["/manifest.webmanifest", "/sw.js", "/icons/icon-512.png", "/offline"]) {
    const r = await page.request.get(`${SITE}${p}`);
    if (!r.ok()) throw new Error(`${p}: HTTP ${r.status()}`);
  }
  return "ok";
});

await browser.close();
if (errors.length) results.push(`⚠️ Errors seen: ${[...new Set(errors)].slice(0, 8).join(" | ")}`);
console.log(results.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## MyLiquid production check: ${failures.length ? `${failures.length} failed` : "all passed"}\n\n${SITE}\n\n${results.map((r) => `- ${r}`).join("\n")}\n`,
  );
}
process.exit(failures.length ? 1 : 0);
