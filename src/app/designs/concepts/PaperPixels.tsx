import { LogoMark } from "@/components/brand/LogoMark";
import { PixelPet } from "@/components/pet/PixelPet";
import { TamaDevice } from "@/components/pet/TamaDevice";
import { BrowserFrame, LineChart, PhoneFrame, ScaledDesktop, Spark } from "../parts";
import { SAMPLE as S, usd } from "../sample";

/**
 * Direction 4 · Paper & Pixels 2. Today's brand (cream paper, ink, liquid blue, lime, the Tamagotchi), evolved with
 * what the study found: lighter, tighter display type; a mono voice for numbers and labels; one 14 px radius;
 * hard shadows only on the one object that matters on a screen; the pet as a companion row on Home, not a page.
 */

const C = {
  bg: "#f5f3ee",
  surface: "#ffffff",
  ink: "#111111",
  ink2: "#55534d",
  muted: "#8a877e",
  line: "rgba(17,17,17,0.1)",
  blue: "#2f5bff",
  lime: "#c8f560",
  good: "#0c8f0c",
  bad: "#d03b3b",
};

const Btn = ({ primary, children }: { primary?: boolean; children: React.ReactNode }) => (
  <span
    className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium"
    style={
      primary
        ? { background: C.ink, color: "#fff", boxShadow: "3px 3px 0 #2f5bff" }
        : { border: `1px solid ${C.line}`, background: C.surface, color: C.ink }
    }
  >
    {children}
  </span>
);

const Mono = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-[family-name:var(--font-geist-mono)] ${className}`}>{children}</span>
);

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <div className="font-pixel text-[10px] uppercase" style={{ color: C.muted }}>
    {children}
  </div>
);

function Approval({ tight = false }: { tight?: boolean }) {
  return (
    <div
      className="rounded-[14px] border-2 p-4"
      style={{ background: C.surface, borderColor: C.ink, boxShadow: "4px 4px 0 #111" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[10px] uppercase" style={{ color: C.blue }}>
          Waiting for you · 1
        </span>
        <Mono className="text-[11px]">
          <span style={{ color: C.muted }}>atlas · 09:14</span>
        </Mono>
      </div>
      <div className="mt-1.5 text-[15px] font-semibold" style={{ color: C.ink }}>
        {S.proposal.title}
      </div>
      {S.proposal.orders.map((o) => (
        <div key={o.what} className="mt-1.5 text-[13px]" style={{ color: C.ink }}>
          Buy <Mono className="font-medium">{usd(o.usd)}</Mono> of {o.what}
          {!tight && (
            <div className="text-[12px]" style={{ color: C.muted }}>
              {o.why}
            </div>
          )}
        </div>
      ))}
      <div className="mt-3 flex gap-2">
        <Btn primary>Approve</Btn>
        <Btn>Reject</Btn>
      </div>
    </div>
  );
}

function Companion() {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border p-3"
      style={{ background: C.surface, borderColor: C.line }}
    >
      <span className="rounded-[10px] border-2 bg-lcd p-1" style={{ borderColor: C.ink }}>
        <PixelPet stage="droplet" mood="happy" lcd size={36} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold" style={{ color: C.ink }}>
          {S.pet}{" "}
          <span
            className="whitespace-nowrap font-pixel text-[9px] uppercase"
            style={{ color: C.muted }}
          >
            lv 4 · happy
          </span>
        </div>
        <div className="truncate text-[12px]" style={{ color: C.ink2 }}>
          1 quest left
        </div>
      </div>
      <Btn>Feed</Btn>
    </div>
  );
}

function HoldingsList({ n = 5 }: { n?: number }) {
  return (
    <div
      className="divide-y rounded-[14px] border"
      style={{ background: C.surface, borderColor: C.line }}
    >
      {S.holdings.slice(0, n).map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ borderColor: C.line }}
        >
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: h.color }} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px]" style={{ color: C.ink }}>
              {h.name}
            </div>
            <Mono className="text-[11px]">
              <span style={{ color: C.muted }}>
                {h.id} · {h.sleeve}
              </span>
            </Mono>
          </div>
          <Spark up={h.day >= 0} color={C.good} down={C.bad} />
          <div className="w-24 text-right">
            <Mono className="block text-[13px]">{usd(h.value)}</Mono>
            <Mono className="text-[11px]">
              <span style={{ color: h.day < 0 ? C.bad : h.day > 0 ? C.good : C.muted }}>
                {h.day > 0 ? "+" : ""}
                {h.day.toFixed(2)}%
              </span>
            </Mono>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <div>
      <Kicker>Portfolio</Kicker>
      <div
        className={`font-[family-name:var(--font-display-face)] font-semibold tracking-[-0.035em] ${size === "lg" ? "text-[44px]" : "text-[32px]"} leading-none`}
        style={{ color: C.ink }}
      >
        {usd(S.total)}
      </div>
      <Mono className="mt-1 block text-[13px]">
        <span style={{ color: C.good }}>
          +{usd(S.change.usd)} (+{S.change.pct}%)
        </span>{" "}
        <span style={{ color: C.muted }}>past month</span>
      </Mono>
      <LineChart
        values={S.series}
        height={size === "lg" ? 130 : 90}
        stroke={C.blue}
        strokeWidth={2}
        className={size === "lg" ? "mt-3 h-[130px]" : "mt-2 h-[90px]"}
      />
      <div className="mt-2 flex gap-1 text-[12px]">
        {["1W", "1M", "3M", "1Y", "ALL"].map((p) => (
          <Mono key={p} className="rounded-full px-2.5 py-0.5">
            <span style={p === "1M" ? { color: C.ink, fontWeight: 600 } : { color: C.muted }}>
              {p}
            </span>
          </Mono>
        ))}
      </div>
    </div>
  );
}

export function PaperPixels() {
  return (
    <div style={{ background: C.bg, color: C.ink }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <LogoMark size={24} animate={false} /> MyLiquid
        </div>
        <nav className="hidden gap-6 text-[14px] sm:flex" style={{ color: C.ink2 }}>
          <span>Your agent</span>
          <span>Agent Pay</span>
          <span>Safety</span>
          <span>For business</span>
        </nav>
        <Btn primary>Hatch yours</Btn>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-14">
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px]"
            style={{ borderColor: C.line, background: C.surface }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: C.lime, boxShadow: "0 0 0 2px #111" }}
            />{" "}
            Agentic wealth · Agent Pay · AINRA
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-display-face)] text-[44px] font-semibold leading-[1.06] tracking-[-0.04em] sm:text-[68px]">
            An agent for your money that{" "}
            <span className="whitespace-nowrap rounded-md px-1.5" style={{ background: C.lime }}>
              asks first.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed" style={{ color: C.ink2 }}>
            It invests, rebalances and pays inside the limits you set. Anything bigger waits for
            your tap. Look after it, and it looks after you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn primary>Try the live demo →</Btn>
            <Btn>Hatch your agent</Btn>
          </div>
          <Mono className="mt-5 block text-[12px]">
            <span style={{ color: C.muted }}>
              free · demo money · real prices for index funds and bitcoin
            </span>
          </Mono>
        </div>
        <div className="relative mx-auto">
          <TamaDevice name={S.pet} stage="splash" mood="happy" color="blue" level={5} size={260} />
          <div
            className="absolute -right-24 top-4 hidden whitespace-nowrap rounded-full border bg-white px-3 py-1.5 text-[12px] shadow-sm sm:block"
            style={{ borderColor: C.line }}
          >
            ✓ Sentinel: 6 checks passed
          </div>
          <div
            className="absolute -left-24 bottom-24 hidden whitespace-nowrap rounded-full border bg-white px-3 py-1.5 text-[12px] shadow-sm sm:block"
            style={{ borderColor: C.line }}
          >
            <Mono>75%</Mono> liquid in 7 days
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-12 sm:grid-cols-3">
        {[
          [
            "Sets its own limits? Never.",
            "You set caps, approvals and what it may never do. It can't change them.",
          ],
          ["Proves what it did.", "Every action lands in a hash-chained record you can download."],
          [
            "Knows who's knocking.",
            "Outside agents act alone only with a verified AINRA passport.",
          ],
        ].map(([t, d]) => (
          <div
            key={t}
            className="rounded-[14px] border p-5"
            style={{ background: C.surface, borderColor: C.line }}
          >
            <div className="text-[16px] font-semibold">{t}</div>
            <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: C.ink2 }}>
              {d}
            </p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <Kicker>The platform</Kicker>
        <h2 className="mt-2 font-[family-name:var(--font-display-face)] text-[30px] font-semibold tracking-[-0.03em] sm:text-[40px]">
          Home, with the decision first.
        </h2>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ScaledDesktop>
            <BrowserFrame className="rounded-[14px] border" bar="#ebe8e0">
              <div className="grid grid-cols-[170px_1fr] gap-6 p-5" style={{ background: C.bg }}>
                <aside className="space-y-1 text-[13px]">
                  <div className="mb-4 flex items-center gap-2 font-semibold">
                    <LogoMark size={18} animate={false} /> MyLiquid
                  </div>
                  {[
                    "Home",
                    "Invest",
                    "Autopilot",
                    "Agent Pay",
                    "Talk",
                    "Traders",
                    "Activity",
                    "Guardrails",
                  ].map((n, i) => (
                    <div
                      key={n}
                      className="rounded-[10px] px-2.5 py-1.5"
                      style={i === 0 ? { background: C.ink, color: "#fff" } : { color: C.ink2 }}
                    >
                      {n}
                    </div>
                  ))}
                </aside>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-5">
                  <div
                    className="rounded-[14px] border p-4"
                    style={{ background: C.surface, borderColor: C.line }}
                  >
                    <Hero />
                  </div>
                  <div className="space-y-4">
                    <Approval />
                    <Companion />
                  </div>
                  <div className="col-span-2">
                    <HoldingsList />
                  </div>
                </div>
              </div>
            </BrowserFrame>
          </ScaledDesktop>
          <PhoneFrame>
            <div
              className="h-full space-y-3 overflow-hidden px-4 pt-11"
              style={{ background: C.bg }}
            >
              <Hero size="sm" />
              <Approval tight />
              <Companion />
            </div>
          </PhoneFrame>
        </div>
      </section>
    </div>
  );
}
