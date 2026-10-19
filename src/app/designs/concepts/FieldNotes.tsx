import { LogoMark } from "@/components/brand/LogoMark";
import { PixelPet } from "@/components/pet/PixelPet";
import { BrowserFrame, LineChart, PhoneFrame, ScaledDesktop } from "../parts";
import { SAMPLE as S, usd } from "../sample";

/**
 * Direction 1 · Field Notes. After graphify.com: a technical notebook. White paper, deep green-black ink, 2 px
 * corners everywhere, Geist with a mono voice and our pixel type for labels, a narrow reading column, and the
 * system itself (rules → agents → Gate → your money) drawn as the hero.
 */

const C = {
  bg: "#ffffff",
  panel: "#f5f7f5",
  ink: "#0d1f17",
  ink2: "rgba(13,31,23,0.62)",
  rule: "rgba(13,31,23,0.12)",
  green: "#12804a",
  lime: "#c8f560",
  rust: "#a3462a",
};

const Label = ({ n, children }: { n?: string; children: React.ReactNode }) => (
  <div className="font-pixel text-[10px] uppercase tracking-wide" style={{ color: C.ink2 }}>
    {n && <span style={{ color: C.green }}>{n} · </span>}
    {children}
  </div>
);

const Btn = ({ primary, children }: { primary?: boolean; children: React.ReactNode }) => (
  <span
    className="inline-flex h-10 items-center rounded-[2px] px-4 font-[family-name:var(--font-geist)] text-[15px] font-medium"
    style={
      primary
        ? { background: C.ink, color: "#fff" }
        : { border: `1px solid ${C.rule}`, color: C.ink }
    }
  >
    {children}
  </span>
);

/** The hero figure: what happens to every action, drawn as the system. Edges flow; still under reduced motion. */
function SystemFigure() {
  const nodes = [
    { x: 10, y: 14, w: 170, t: "Your rules", s: "limits · approvals" },
    { x: 10, y: 136, w: 170, t: "Agents", s: "Atlas · Quant · L2 trader" },
    { x: 225, y: 75, w: 160, t: "Gate", s: "6 checks · identity" },
    { x: 430, y: 14, w: 170, t: "Your account", s: "orders executed" },
    { x: 430, y: 136, w: 170, t: "You decide", s: "anything bigger" },
  ];
  const edges = [
    "M180,40 C205,40 200,92 225,92",
    "M180,162 C205,162 200,118 225,118",
    "M385,92 C410,92 405,40 430,40",
    "M385,118 C410,118 405,162 430,162",
  ];
  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 610 200"
        className="w-full"
        role="img"
        aria-label="Every agent action passes through Gate"
      >
        <style>{`.fn-flow{stroke-dasharray:4 6;animation:fn-dash 1.2s linear infinite}@keyframes fn-dash{to{stroke-dashoffset:-20}}@media (prefers-reduced-motion:reduce){.fn-flow{animation:none}}`}</style>
        {edges.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={i === 3 ? C.rust : C.green}
            strokeWidth="1.5"
            className="fn-flow"
          />
        ))}
        {nodes.map((n) => (
          <g key={n.t}>
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={52}
              rx="2"
              fill={n.t === "Gate" ? C.ink : "#fff"}
              stroke={C.ink}
              strokeWidth="1"
            />
            <text
              x={n.x + 12}
              y={n.y + 22}
              fontSize="15"
              fontWeight="600"
              fill={n.t === "Gate" ? "#fff" : C.ink}
              fontFamily="var(--font-geist)"
            >
              {n.t}
            </text>
            <text
              x={n.x + 12}
              y={n.y + 40}
              fontSize="11.5"
              fill={n.t === "Gate" ? C.lime : C.ink2}
              fontFamily="var(--font-geist-mono)"
            >
              {n.s}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 font-mono text-[11px]" style={{ color: C.ink2 }}>
        fig. 1 · every agent action passes the gate; green flows on its own, rust waits for you
      </figcaption>
    </figure>
  );
}

function AppDesktop() {
  return (
    <BrowserFrame className="rounded-[2px] border" bar={C.panel} url="app.myliquid.com/home">
      <div
        className="grid grid-cols-[180px_1fr]"
        style={{ background: C.bg, color: C.ink, borderColor: C.rule }}
      >
        <aside className="border-r p-4 text-[13px]" style={{ borderColor: C.rule }}>
          <div className="flex items-center gap-2 font-semibold">
            <LogoMark size={18} animate={false} /> MyLiquid
          </div>
          <nav className="mt-6 space-y-1 font-mono text-[12px]">
            {["home", "invest", "agents", "activity", "rules"].map((n, i) => (
              <div
                key={n}
                className="rounded-[2px] px-2 py-1"
                style={i === 0 ? { background: C.ink, color: "#fff" } : { color: C.ink2 }}
              >
                {i === 0 ? "▸ " : "  "}
                {n}
              </div>
            ))}
          </nav>
          <div className="mt-8 rounded-[2px] border p-2" style={{ borderColor: C.rule }}>
            <div className="flex items-center gap-2">
              <span className="rounded-[2px] bg-lcd p-0.5">
                <PixelPet stage="droplet" mood="happy" lcd size={26} animate={false} />
              </span>
              <div>
                <div className="text-[12px] font-medium">{S.pet}</div>
                <div className="font-pixel text-[8px] uppercase" style={{ color: C.ink2 }}>
                  lv 4 · happy
                </div>
              </div>
            </div>
          </div>
        </aside>
        <main className="p-6">
          <Label n="01">Portfolio</Label>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-[34px] font-medium tracking-tight">
              {usd(S.total, true)}
            </span>
            <span className="font-mono text-[13px]" style={{ color: C.green }}>
              +{usd(S.change.usd)} (+{S.change.pct}%)
            </span>
          </div>
          <LineChart
            values={S.series}
            height={120}
            stroke={C.ink}
            strokeWidth={1.25}
            grid={C.rule}
            className="mt-3 h-[120px]"
          />
          <div className="mt-6 grid grid-cols-[1.2fr_1fr] gap-6">
            <section>
              <Label n="02">Waiting for you</Label>
              <div
                className="mt-2 rounded-[2px] border font-mono text-[12px]"
                style={{ borderColor: C.ink }}
              >
                <div
                  className="flex justify-between border-b px-3 py-2"
                  style={{ borderColor: C.rule }}
                >
                  <span>atlas → {S.proposal.title.toLowerCase()}</span>
                  <span style={{ color: C.ink2 }}>09:14</span>
                </div>
                {S.proposal.orders.map((o) => (
                  <div
                    key={o.what}
                    className="px-3 py-1.5"
                    style={{ background: "rgba(18,128,74,0.06)" }}
                  >
                    <span style={{ color: C.green }}>+ buy {usd(o.usd)}</span> {o.what}
                    <div style={{ color: C.ink2 }}> # {o.why}</div>
                  </div>
                ))}
                <div className="space-y-0.5 px-3 py-2" style={{ color: C.ink2 }}>
                  {S.proposal.checks.map((c) => (
                    <div key={c}>✓ {c}</div>
                  ))}
                </div>
                <div className="flex gap-2 border-t p-2" style={{ borderColor: C.rule }}>
                  <Btn primary>Approve</Btn>
                  <Btn>Reject</Btn>
                </div>
              </div>
            </section>
            <section>
              <Label n="03">Holdings</Label>
              <table className="mt-2 w-full text-[12px]">
                <tbody>
                  {S.holdings.slice(0, 5).map((h) => (
                    <tr key={h.id} className="border-b" style={{ borderColor: C.rule }}>
                      <td className="py-1.5 font-mono" style={{ color: C.ink2 }}>
                        {h.id}
                      </td>
                      <td className="py-1.5">{h.name}</td>
                      <td className="py-1.5 pl-2 text-right font-mono">{usd(h.value)}</td>
                      <td
                        className="py-1.5 text-right font-mono"
                        style={{ color: h.day < 0 ? C.rust : h.day > 0 ? C.green : C.ink2 }}
                      >
                        {h.day > 0 ? "+" : ""}
                        {h.day.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </main>
      </div>
    </BrowserFrame>
  );
}

function AppPhone() {
  return (
    <PhoneFrame bezel={C.ink}>
      <div
        className="h-full overflow-hidden px-4 pt-10 text-[13px]"
        style={{ background: C.bg, color: C.ink }}
      >
        <div className="flex items-center justify-between">
          <LogoMark size={20} animate={false} />
          <span className="font-mono text-[11px]" style={{ color: C.ink2 }}>
            oct 19 · market open
          </span>
        </div>
        <div className="mt-5">
          <Label>Portfolio</Label>
          <div className="font-mono text-[28px] font-medium tracking-tight">{usd(S.total)}</div>
          <div className="font-mono text-[12px]" style={{ color: C.green }}>
            +{usd(S.change.usd)} · +{S.change.pct}% · 1m
          </div>
        </div>
        <LineChart
          values={S.series}
          height={90}
          stroke={C.ink}
          strokeWidth={1.25}
          className="mt-3 h-[90px]"
        />
        <div className="mt-2 flex justify-between font-mono text-[11px]" style={{ color: C.ink2 }}>
          {["1w", "1m", "3m", "1y", "all"].map((p) => (
            <span
              key={p}
              className="rounded-[2px] px-2 py-0.5"
              style={p === "1m" ? { background: C.ink, color: "#fff" } : {}}
            >
              {p}
            </span>
          ))}
        </div>
        <div
          className="mt-5 rounded-[2px] border p-3 font-mono text-[11px]"
          style={{ borderColor: C.ink }}
        >
          <div className="font-sans text-[13px] font-semibold">Atlas wants to rebalance</div>
          {S.proposal.orders.map((o) => (
            <div key={o.what} className="mt-1">
              <span style={{ color: C.green }}>+ {usd(o.usd)}</span> {o.what}
            </div>
          ))}
          <div className="mt-1" style={{ color: C.ink2 }}>
            ✓ 3 checks passed
          </div>
          <div className="mt-3 flex gap-2 font-sans">
            <Btn primary>Approve</Btn>
            <Btn>Details</Btn>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {S.holdings.slice(0, 3).map((h) => (
            <div
              key={h.id}
              className="flex justify-between border-b pb-2"
              style={{ borderColor: C.rule }}
            >
              <span>{h.name}</span>
              <span className="font-mono">{usd(h.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

export function FieldNotes() {
  return (
    <div
      style={{ background: C.bg, color: C.ink }}
      className="font-[family-name:var(--font-geist)]"
    >
      {/* Website */}
      <header
        className="mx-auto flex max-w-6xl items-center justify-between border-b px-5 py-4"
        style={{ borderColor: C.rule }}
      >
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <LogoMark size={22} animate={false} /> MyLiquid
        </div>
        <nav className="hidden gap-6 text-[14px] sm:flex" style={{ color: C.ink2 }}>
          <span>Product</span>
          <span>Gate</span>
          <span>Agent identity</span>
          <span>Docs</span>
        </nav>
        <div className="flex gap-2">
          <span className="hidden sm:inline-flex">
            <Btn>Log in</Btn>
          </span>
          <Btn primary>Try the demo</Btn>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-20">
        <div className="max-w-[560px]">
          <Label n="00">Agentic wealth, with a paper trail</Label>
          <h1 className="mt-4 text-[40px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[54px]">
            Let agents run your money. Only inside the lines you draw.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed" style={{ color: C.ink2 }}>
            Your agents invest, rebalance and pay. Every action passes six checks first; anything
            bigger waits for you; every decision is kept in a record nobody can quietly edit.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Btn primary>Try the live demo</Btn>
            <Btn>Read how it works →</Btn>
          </div>
          <div className="mt-6 font-mono text-[12px]" style={{ color: C.ink2 }}>
            free · demo money · no card
          </div>
        </div>
        <div
          className="self-center rounded-[2px] border p-4"
          style={{ borderColor: C.rule, background: C.panel }}
        >
          <SystemFigure />
        </div>
      </section>
      <section className="border-y" style={{ borderColor: C.rule, background: C.panel }}>
        <div className="mx-auto grid max-w-6xl gap-px px-5 sm:grid-cols-3">
          {[
            ["01", "Bounded", "Per-order and daily caps, enforced before anything executes."],
            ["02", "Identified", "Outside agents act alone only with a verified AINRA passport."],
            ["03", "Provable", "A hash-chained record; change one entry and it shows."],
          ].map(([n, t, d]) => (
            <div key={n} className="py-8 sm:pr-8">
              <Label n={n}>{t}</Label>
              <p className="mt-2 text-[15px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Label n="04">The platform</Label>
        <h2 className="mt-3 text-[30px] font-medium tracking-[-0.02em] sm:text-[36px]">
          Numbers in mono. Proposals as diffs.
        </h2>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ScaledDesktop>
            <AppDesktop />
          </ScaledDesktop>
          <AppPhone />
        </div>
      </section>
    </div>
  );
}
