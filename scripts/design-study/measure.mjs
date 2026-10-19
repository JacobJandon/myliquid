/**
 * Design study: opens a reference website in Chromium and measures its design (type, colour, layout, components,
 * motion), at desktop and phone width. Writes screenshots and a JSON summary, and prints the summary as a GitHub
 * annotation so it can be read without downloading anything. Used by .github/workflows/design-study.yml.
 *   node scripts/design-study/measure.mjs https://example.com out/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const [url, out = "design-study-out"] = process.argv.slice(2);
const name = new URL(url).hostname.replace(/^www\./, "");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const result = { site: name, url };

for (const [tag, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
]) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: tag === "phone",
    userAgent:
      tag === "phone"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    // Scroll through once so lazy sections render, then back to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${name}-${tag}-hero.png` });
    await page.screenshot({ path: `${out}/${name}-${tag}-full.png`, fullPage: true }).catch(() => {});
    result[tag] = await page.evaluate(() => {
      const px = (v) => Math.round(parseFloat(v) * 10) / 10;
      const vis = (e) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0;
      };
      const typeOf = (e) => {
        if (!e) return null;
        const s = getComputedStyle(e);
        return {
          text: (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 140),
          font: s.fontFamily.split(",").slice(0, 2).join(",").replace(/"/g, ""),
          size: px(s.fontSize),
          weight: s.fontWeight,
          lineHeight: s.lineHeight === "normal" ? "normal" : px(s.lineHeight),
          letterSpacing: s.letterSpacing,
          color: s.color,
          transform: s.textTransform,
        };
      };
      const h1 = [...document.querySelectorAll("h1")].find(vis);
      const sub = h1 ? [...document.querySelectorAll("p")].find((p) => vis(p) && p.getBoundingClientRect().top > h1.getBoundingClientRect().top && p.innerText.length > 30) : null;
      const h2s = [...document.querySelectorAll("h2")].filter(vis).slice(0, 8).map(typeOf);
      const body = typeOf(document.body);
      // Colour by area: background colours of visible elements, weighted by their visible area on the page.
      const area = new Map();
      for (const e of document.querySelectorAll("body, body *")) {
        if (!vis(e)) continue;
        const s = getComputedStyle(e);
        const bg = s.backgroundColor;
        if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue;
        const r = e.getBoundingClientRect();
        area.set(bg, (area.get(bg) ?? 0) + Math.min(r.width * r.height, 4e6));
      }
      const palette = [...area].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, a]) => [c, Math.round(a / 1000)]);
      const textColors = new Map();
      for (const e of document.querySelectorAll("p, h1, h2, h3, a, span, li")) {
        if (!vis(e) || !e.innerText?.trim()) continue;
        const c = getComputedStyle(e).color;
        textColors.set(c, (textColors.get(c) ?? 0) + 1);
      }
      const buttons = [...document.querySelectorAll("a, button")]
        .filter((e) => {
          if (!vis(e)) return false;
          const s = getComputedStyle(e);
          return s.backgroundColor !== "rgba(0, 0, 0, 0)" && e.innerText.trim().length > 1 && e.innerText.trim().length < 40;
        })
        .slice(0, 4)
        .map((e) => {
          const s = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          return {
            text: e.innerText.trim().slice(0, 30),
            bg: s.backgroundColor,
            color: s.color,
            radius: s.borderRadius,
            border: s.borderWidth !== "0px" ? `${s.borderWidth} ${s.borderColor}` : "none",
            h: Math.round(r.height),
            font: `${px(s.fontSize)}px/${s.fontWeight}`,
            shadow: s.boxShadow !== "none",
          };
        });
      const radii = new Map();
      for (const e of document.querySelectorAll("div, section, article, a, img")) {
        if (!vis(e)) continue;
        const r = getComputedStyle(e).borderTopLeftRadius;
        if (r !== "0px") radii.set(r, (radii.get(r) ?? 0) + 1);
      }
      const nav = document.querySelector("header, nav");
      const widths = [...document.querySelectorAll("main *, body > div *")]
        .filter((e) => vis(e) && e.children.length > 1)
        .map((e) => Math.round(e.getBoundingClientRect().width))
        .filter((w) => w > 600 && w < 1440);
      const commonWidth = Object.entries(widths.reduce((m, w) => ((m[w] = (m[w] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
      const sections = [...document.querySelectorAll("section, main > div, footer")].filter(vis).length;
      const fonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/"/g, "")} ${f.weight}`);
      return {
        title: document.title.slice(0, 100),
        pageHeight: document.documentElement.scrollHeight,
        h1: typeOf(h1),
        sub: typeOf(sub),
        h2s,
        body: { font: body.font, size: body.size, color: body.color, bg: getComputedStyle(document.body).backgroundColor },
        fontsLoaded: [...new Set(fonts)].slice(0, 10),
        palette,
        topTextColors: [...textColors].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c),
        buttons,
        radii: [...radii].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r, n]) => `${r}×${n}`),
        navHeight: nav ? Math.round(nav.getBoundingClientRect().height) : null,
        contentWidth: commonWidth ? Number(commonWidth) : null,
        sections,
        media: {
          canvas: document.querySelectorAll("canvas").length,
          video: document.querySelectorAll("video").length,
          svg: document.querySelectorAll("svg").length,
          img: document.querySelectorAll("img").length,
          lottieOrRive: !!document.querySelector("[class*=lottie], [class*=rive], lottie-player, rive-canvas"),
        },
        motion: {
          animated: [...document.querySelectorAll("*")].filter((e) => getComputedStyle(e).animationName !== "none").length,
          transitions: [...document.querySelectorAll("a, button")].filter((e) => getComputedStyle(e).transitionDuration !== "0s").length,
          reducedMotionCss: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.media?.mediaText?.includes("prefers-reduced-motion")); } catch { return false; } }),
        },
        darkSupport: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.media?.mediaText?.includes("prefers-color-scheme")); } catch { return false; } }),
        cssVars: (() => {
          const s = getComputedStyle(document.documentElement);
          const names = [];
          for (const sheet of document.styleSheets) {
            try { for (const r of sheet.cssRules) if (r.selectorText === ":root") for (const p of r.style) if (p.startsWith("--")) names.push(p); } catch {}
          }
          return [...new Set(names)].filter((n) => /color|bg|font|radius|accent|brand|primary/i.test(n)).slice(0, 12).map((n) => `${n}: ${s.getPropertyValue(n).trim().slice(0, 40)}`);
        })(),
      };
    });
  } catch (e) {
    result[tag] = { error: String(e).slice(0, 200) };
  }
  await ctx.close();
}
await browser.close();

writeFileSync(`${out}/${name}.json`, JSON.stringify(result, null, 2));
// One annotation per site and viewport: the measurements, readable through the API.
for (const tag of ["desktop", "phone"]) {
  const msg = JSON.stringify({ site: name, view: tag, ...result[tag] }).replace(/\r?\n/g, " ");
  console.log(`::notice title=${name} ${tag}::${msg.slice(0, 60000)}`);
}
