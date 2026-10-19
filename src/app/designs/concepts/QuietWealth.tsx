import { LogoMark } from "@/components/brand/LogoMark";
import { PixelPet } from "@/components/pet/PixelPet";
import { BrowserFrame, LineChart, PhoneFrame, ScaledDesktop } from "../parts";
import { SAMPLE as S, usd } from "../sample";

/**
 * Direction 3 · Quiet Wealth. After Wealthfront, Stripe and Modern Treasury: a private bank that happens to have
 * agents. Cool off-white, a light serif for headings, Geist for everything else, our blue as the one accent, soft
 * layered cards with real depth, and a lot of air.
 */

const C = {
  bg: "#f6f7fb",
  surface: "#ffffff",
  ink: "#14162b",
  ink2: "#5b6079",
  line: "rgba(20,22,43,0.08)",
  blue: "#2f5bff",
  blueSoft: "#e9eeff",
  green: "#0f9d58",
  amber: "#b7791f",
};

const shadow = "0 1px 2px rgba(20,22,43,0.06), 0 12px 32px rgba(20,22,43,0.08)";

const Serif = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-[family-name:var(--font-newsreader)] ${className}`}>{children}</span>
);

const Btn = ({ primary, children }: { primary?: boolean; children: React.ReactNode }) => (
  <span
    className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-xl px-5 text-[15px] font-medium"
    style={
      primary
        ? { background: C.ink, color: "#fff" }
        : { background: C.surface, color: C.ink, boxShadow: shadow }
    }
  >
    {children}
  </span>
);

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] p-5 ${className}`}
      style={{ background: C.surface, boxShadow: shadow }}
    >
      {children}
    </div>
  );
}

function Allocation() {
  const total = S.holdings.reduce((n, h) => n + h.value, 0);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {S.holdings.map((h) => (
          <span
            key={h.id}
            style={{ width: `${(h.value / total) * 100}%`, background: h.color }}
            className="border-r-2 border-white last:border-r-0"
          />
        ))}
      </div>
      <div className="mt-3 grid gap-y-1.5 text-[12px]">
        {S.holdings.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between gap-2"
            style={{ color: C.ink2 }}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
              {h.name}
            </span>
            <span style={{ color: C.ink }}>{Math.round((h.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Proposal({ compact = false, phone = false }: { compact?: boolean; phone?: boolean }) {
  return (
    <Card className={phone ? "!p-4" : ""}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{ background: C.blueSoft, color: C.blue }}
        >
          For your approval
        </span>
        <span className="whitespace-nowrap text-[12px]" style={{ color: C.ink2 }}>
          {phone ? "Atlas" : "from Atlas · 09:14"}
        </span>
      </div>
      <Serif className={`mt-3 block leading-snug ${phone ? "text-[19px]" : "text-[22px]"}`}>
        Bring your portfolio back to balance.
      </Serif>
      <div className="mt-3 space-y-2">
        {S.proposal.orders.map((o) => (
          <div
            key={o.what}
            className="flex items-baseline justify-between gap-3 rounded-xl px-3 py-2"
            style={{ background: C.bg }}
          >
            <div>
              <div className="text-[14px]" style={{ color: C.ink }}>
                {o.side} {o.what}
              </div>
              {!compact && (
                <div className="text-[12px]" style={{ color: C.ink2 }}>
                  {o.why}
                </div>
              )}
            </div>
            <span className="text-[14px] font-medium tabular-nums" style={{ color: C.ink }}>
              {usd(o.usd)}
            </span>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-[12px]" style={{ color: C.ink2 }}>
        {(phone ? [`${S.proposal.checks.length} checks passed`] : S.proposal.checks).map((c) => (
          <li key={c}>
            <span style={{ color: C.green }}>●</span> {c}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <Btn primary>Approve</Btn>
        <Btn>Not now</Btn>
      </div>
    </Card>
  );
}

function AppDesktop() {
  return (
    <BrowserFrame className="rounded-[22px]" bar="#eceef5" url="app.myliquid.com">
      <div className="grid grid-cols-[160px_1fr] p-6" style={{ background: C.bg, color: C.ink }}>
        <aside className="pr-6 text-[14px]">
          <div className="flex items-center gap-2 font-semibold">
            <LogoMark size={20} animate={false} /> MyLiquid
          </div>
          <nav className="mt-8 space-y-1">
            {["Overview", "Invest", "Agents", "Agent Pay", "Activity", "Guardrails"].map((n, i) => (
              <div
                key={n}
                className="rounded-lg px-3 py-2"
                style={i === 0 ? { background: C.surface, boxShadow: shadow } : { color: C.ink2 }}
              >
                {n}
              </div>
            ))}
          </nav>
        </aside>
        <main className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
          <div className="space-y-5">
            <Card>
              <div className="text-[13px]" style={{ color: C.ink2 }}>
                Total wealth
              </div>
              <Serif className="mt-1 block text-[40px] leading-none tracking-[-0.01em]">
                {usd(S.total)}
              </Serif>
              <div className="mt-2 text-[13px]" style={{ color: C.green }}>
                +{usd(S.change.usd)} ({S.change.pct}%) this month
              </div>
              <LineChart
                values={S.series}
                height={130}
                stroke={C.blue}
                fill={C.blue}
                strokeWidth={2}
                className="mt-4 h-[130px]"
              />
            </Card>
            <Card>
              <div className="mb-3 text-[14px] font-medium">Where it is</div>
              <Allocation />
            </Card>
          </div>
          <div className="space-y-5">
            <Proposal compact />
            <Card className="flex items-center gap-4">
              <span className="rounded-2xl bg-lcd p-2">
                <PixelPet stage="droplet" mood="happy" lcd size={44} animate={false} />
              </span>
              <div>
                <div className="text-[14px] font-medium">{S.pet} is keeping watch</div>
                <div className="text-[12px]" style={{ color: C.ink2 }}>
                  75% reachable within 7 days · all limits held
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </BrowserFrame>
  );
}

export function QuietWealth() {
  return (
    <div
      style={{ background: C.bg, color: C.ink }}
      className="font-[family-name:var(--font-geist)]"
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <LogoMark size={22} animate={false} /> MyLiquid
        </div>
        <nav className="hidden gap-7 text-[14px] sm:flex" style={{ color: C.ink2 }}>
          <span>How it works</span>
          <span>Safety</span>
          <span>For business</span>
          <span>Pricing</span>
        </nav>
        <Btn primary>Open the demo</Btn>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="text-[13px] font-medium" style={{ color: C.blue }}>
            Private-bank care, for everyone
          </div>
          <h1 className="mt-4 text-[46px] font-light leading-[1.04] tracking-[-0.02em] sm:text-[64px]">
            <Serif>Wealth, handled.</Serif>
            <br />
            <Serif className="italic">You stay in the loop.</Serif>
          </h1>
          <p className="mt-6 max-w-lg text-[18px] leading-relaxed" style={{ color: C.ink2 }}>
            A team of AI agents looks after your portfolio within the rules you set. They explain
            every move and ask before anything that matters.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn primary>Try it with demo money</Btn>
            <Btn>How we keep it safe</Btn>
          </div>
        </div>
        <div
          className="relative rounded-[32px] p-4 sm:p-8"
          style={{
            background:
              "radial-gradient(120% 90% at 80% 10%, #dfe6ff 0%, #f6f7fb 60%), radial-gradient(80% 70% at 0% 100%, #efe7ff, transparent)",
          }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-4">
            <Card className="max-sm:!p-4">
              <div className="text-[12px]" style={{ color: C.ink2 }}>
                Total wealth
              </div>
              <Serif className="block text-[30px] leading-none sm:text-[34px]">{usd(S.total)}</Serif>
              <LineChart
                values={S.series}
                height={56}
                stroke={C.blue}
                strokeWidth={2}
                className="mt-3 h-[56px]"
              />
            </Card>
            <Card className="!p-4">
              <div className="text-[12px]" style={{ color: C.ink2 }}>
                Reachable <span className="whitespace-nowrap">in 7 days</span>
              </div>
              <div className="mt-1 text-[24px] font-medium leading-none sm:text-[28px]">75%</div>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: C.blueSoft }}>
                <div className="h-1.5 w-3/4 rounded-full" style={{ background: C.blue }} />
              </div>
            </Card>
          </div>
          <div className="mt-4 sm:ml-12">
            <Proposal compact />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["You set the rules", "How much, how often, and what agents may never do."],
            ["They do the work", "Rebalancing, recurring investing, paying bills, on schedule."],
            ["You see everything", "Every decision explained, in a record nobody can edit."],
          ].map(([t, d]) => (
            <Card key={t}>
              <Serif className="text-[22px]">{t}</Serif>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: C.ink2 }}>
                {d}
              </p>
            </Card>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-[34px] tracking-[-0.01em] sm:text-[44px]">
          <Serif>A calm place to check in.</Serif>
        </h2>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ScaledDesktop>
            <AppDesktop />
          </ScaledDesktop>
          <PhoneFrame bezel="#d9dce8">
            <div
              className="h-full space-y-4 overflow-hidden px-4 pt-12"
              style={{ background: C.bg }}
            >
              <Card className="!p-4">
                <div className="text-[12px]" style={{ color: C.ink2 }}>
                  Total wealth
                </div>
                <Serif className="block text-[32px] leading-none">{usd(S.total)}</Serif>
                <div className="mt-1 text-[12px]" style={{ color: C.green }}>
                  +{S.change.pct}% this month
                </div>
                <LineChart
                  values={S.series}
                  height={70}
                  stroke={C.blue}
                  fill={C.blue}
                  className="mt-2 h-[70px]"
                />
              </Card>
              <Proposal compact phone />
            </div>
          </PhoneFrame>
        </div>
      </section>
    </div>
  );
}
