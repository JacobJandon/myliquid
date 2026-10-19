import { LogoMark } from "@/components/brand/LogoMark";
import { PixelPet } from "@/components/pet/PixelPet";
import { BrowserFrame, LineChart, PhoneFrame, ScaledDesktop, Spark } from "../parts";
import { SAMPLE as S, usd } from "../sample";

/**
 * Direction 2 · Night Market. After Robinhood, Mercury and Linear: near-black, a big light serif, our lime as the
 * only loud colour (gains, the one action), full pills, and the pet glowing like a screen at night.
 */

const C = {
  bg: "#0b0b0c",
  surface: "#141416",
  raise: "#1b1b1e",
  line: "rgba(255,255,255,0.08)",
  text: "#f4f4f0",
  muted: "#8b8b86",
  lime: "#c8f560",
  red: "#ff6b5b",
  blue: "#7d94ff",
};

const Pill = ({
  primary,
  children,
  small,
}: {
  primary?: boolean;
  children: React.ReactNode;
  small?: boolean;
}) => (
  <span
    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium ${small ? "h-8 px-3.5 text-[13px]" : "h-11 px-5 text-[15px]"}`}
    style={
      primary
        ? { background: C.lime, color: "#0b0b0c" }
        : { background: "rgba(255,255,255,0.08)", color: C.text }
    }
  >
    {children}
  </span>
);

function Serif({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-[family-name:var(--font-instrument)] font-normal ${className}`}>
      {children}
    </span>
  );
}

function HomeScreen({ compact = false }: { compact?: boolean }) {
  return (
    <div className="px-5 text-[13px]" style={{ color: C.text }}>
      <div className="text-[12px]" style={{ color: C.muted }}>
        Investing
      </div>
      <Serif className={compact ? "text-[38px] leading-none" : "text-[56px] leading-none"}>
        {usd(S.total)}
      </Serif>
      <div className="mt-1 text-[13px]" style={{ color: C.lime }}>
        ▲ {usd(S.change.usd)} ({S.change.pct}%) <span style={{ color: C.muted }}>past month</span>
      </div>
      <LineChart
        values={S.series}
        height={compact ? 110 : 150}
        stroke={C.lime}
        fill={C.lime}
        strokeWidth={2}
        className={compact ? "mt-3 h-[110px]" : "mt-4 h-[150px]"}
      />
      <div className="mt-3 flex justify-between text-[12px] font-medium" style={{ color: C.muted }}>
        {["1D", "1W", "1M", "3M", "1Y", "ALL"].map((p) => (
          <span
            key={p}
            className="rounded-full px-2.5 py-1"
            style={p === "1M" ? { background: "rgba(200,245,96,0.14)", color: C.lime } : {}}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function Approval() {
  return (
    <div
      className="rounded-3xl p-4"
      style={{ background: C.raise, border: `1px solid rgba(200,245,96,0.35)` }}
    >
      <div className="flex items-center gap-2 text-[12px]" style={{ color: C.lime }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.lime }} /> Waiting for you
      </div>
      <div className="mt-1 text-[15px] font-semibold" style={{ color: C.text }}>
        Atlas: {S.proposal.title}
      </div>
      {S.proposal.orders.map((o) => (
        <div
          key={o.what}
          className="mt-1.5 flex justify-between text-[13px]"
          style={{ color: C.text }}
        >
          <span>
            {o.side} {o.what}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)]">{usd(o.usd)}</span>
        </div>
      ))}
      <div className="mt-2 text-[12px]" style={{ color: C.muted }}>
        3 checks passed · nothing happens until you approve
      </div>
      <div className="mt-3 flex gap-2">
        <Pill primary small>
          Approve
        </Pill>
        <Pill small>Not now</Pill>
      </div>
    </div>
  );
}

function AppDesktop() {
  return (
    <BrowserFrame
      className="rounded-2xl border"
      bar="#18181b"
      dot="rgba(255,255,255,0.18)"
      text="rgba(255,255,255,0.4)"
    >
      <div
        className="grid grid-cols-[minmax(0,1fr)_300px] gap-6 p-6"
        style={{ background: C.bg, borderColor: C.line }}
      >
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div
              className="flex items-center gap-2 text-[14px] font-semibold"
              style={{ color: C.text }}
            >
              <LogoMark size={20} animate={false} /> MyLiquid
            </div>
            <div className="flex gap-1 text-[13px]" style={{ color: C.muted }}>
              {["Home", "Invest", "Agents", "Pay", "Activity"].map((n, i) => (
                <span
                  key={n}
                  className="rounded-full px-3 py-1"
                  style={i === 0 ? { background: "rgba(255,255,255,0.08)", color: C.text } : {}}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          <HomeScreen />
          <div className="mt-6 px-5">
            <div className="text-[15px] font-semibold" style={{ color: C.text }}>
              Holdings
            </div>
            <div className="mt-2 divide-y" style={{ borderColor: C.line }}>
              {S.holdings.slice(0, 5).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderColor: C.line }}
                >
                  <div>
                    <div className="text-[14px]" style={{ color: C.text }}>
                      {h.name}
                    </div>
                    <div className="text-[12px]" style={{ color: C.muted }}>
                      {h.sleeve}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Spark up={h.day >= 0} color={C.lime} down={C.red} />
                    <span
                      className="w-20 rounded-full px-2 py-1 text-center text-[12px] font-medium"
                      style={{
                        background: h.day < 0 ? "rgba(255,107,91,0.16)" : "rgba(200,245,96,0.14)",
                        color: h.day < 0 ? C.red : C.lime,
                      }}
                    >
                      {usd(h.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Approval />
          <div className="rounded-3xl p-4 text-center" style={{ background: C.surface }}>
            <div
              className="mx-auto w-fit rounded-2xl bg-lcd p-2"
              style={{ boxShadow: "0 0 40px rgba(200,245,96,0.25)" }}
            >
              <PixelPet stage="droplet" mood="happy" lcd size={64} />
            </div>
            <div className="mt-2 text-[14px] font-semibold" style={{ color: C.text }}>
              {S.pet} is happy
            </div>
            <div className="text-[12px]" style={{ color: C.muted }}>
              75% of your money is reachable within 7 days
            </div>
          </div>
          <div className="rounded-3xl p-4" style={{ background: C.surface }}>
            <div className="text-[13px] font-semibold" style={{ color: C.text }}>
              Your agents
            </div>
            {S.agents.map((a) => (
              <div key={a.name} className="mt-2 flex justify-between text-[12px]">
                <span style={{ color: C.text }}>{a.name}</span>
                <span style={{ color: C.muted }}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function NightMarket() {
  return (
    <div
      style={{ background: C.bg, color: C.text }}
      className="font-[family-name:var(--font-geist)]"
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <LogoMark size={24} animate={false} /> MyLiquid
        </div>
        <nav className="hidden gap-7 text-[14px] sm:flex" style={{ color: C.muted }}>
          <span>Invest</span>
          <span>Agents</span>
          <span>Agent Pay</span>
          <span>Safety</span>
        </nav>
        <Pill primary small>
          Try the demo
        </Pill>
      </header>
      <section className="relative mx-auto max-w-6xl overflow-hidden px-5 pb-16 pt-10 text-center sm:pt-16">
        <div
          className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[620px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(closest-side, rgba(200,245,96,0.18), transparent)",
          }}
          aria-hidden
        />
        <div className="relative">
          <span
            className="rounded-full px-3 py-1 text-[12px]"
            style={{ background: "rgba(255,255,255,0.06)", color: C.muted }}
          >
            Your agent works the night shift
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-[52px] leading-[0.98] tracking-[-0.02em] sm:text-[92px]">
            <Serif>Money that works</Serif> <Serif className="italic">while you sleep.</Serif>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px]" style={{ color: C.muted }}>
            An AI agent that invests, rebalances and pays inside the limits you set, and asks before
            anything bigger.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Pill primary>Start with demo money</Pill>
            <Pill>See how it decides</Pill>
          </div>
        </div>
        <div className="relative mt-14">
          <PhoneFrame bezel="#1f1f22" className="shadow-[0_40px_120px_rgba(200,245,96,0.12)]">
            <div className="h-full pt-12 text-left" style={{ background: C.bg }}>
              <HomeScreen compact />
              <div className="mt-4 px-4">
                <Approval />
              </div>
            </div>
          </PhoneFrame>
        </div>
      </section>
      <section className="border-y" style={{ borderColor: C.line }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
          {[
            ["$0", "to start, with demo money"],
            ["6", "checks before any agent order"],
            ["1 tap", "stops every agent at once"],
          ].map(([n, d]) => (
            <div key={d}>
              <Serif className="text-[48px] leading-none">{n}</Serif>
              <div className="mt-2 text-[14px]" style={{ color: C.muted }}>
                {d}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-[34px] leading-tight tracking-[-0.01em] sm:text-[52px]">
          <Serif>The platform, after dark.</Serif>
        </h2>
        <p className="mt-2 max-w-xl text-[15px]" style={{ color: C.muted }}>
          Green only means money went up. Everything else stays quiet.
        </p>
        <div className="mt-8">
          <ScaledDesktop>
            <AppDesktop />
          </ScaledDesktop>
        </div>
      </section>
    </div>
  );
}
