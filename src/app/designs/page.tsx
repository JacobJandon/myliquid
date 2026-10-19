import Link from "next/link";
import { DIRECTIONS } from "./directions";
import { Switcher } from "./Switcher";

/** The four design directions for MyLiquid, side by side: the website and the platform in each. */
export default function DesignsIndex() {
  return (
    <div className="min-h-screen bg-[#f4f4f2] font-[family-name:var(--font-geist)] text-[#111]">
      <Switcher />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="font-[family-name:var(--font-geist-mono)] text-[12px] text-black/50">
          MyLiquid · design directions · October 2026
        </div>
        <h1 className="mt-3 max-w-3xl text-[36px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          Four ways MyLiquid could look, website and platform.
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-black/60">
          Built from a measured study of graphify.com and fifteen of the best YC and fintech sites
          (docs/design/study.md). Each direction shows the website and the app, desktop and phone,
          with the same sample account, so you compare design alone.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {DIRECTIONS.map((d) => (
            <Link
              key={d.id}
              href={`/designs/${d.id}`}
              className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-black/45">
                  0{d.n}
                </span>
                <span className="flex gap-1">
                  {d.swatches.map((c) => (
                    <span
                      key={c}
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: c }}
                    />
                  ))}
                </span>
              </div>
              <h2 className="mt-4 text-[26px] font-medium tracking-[-0.02em]">{d.name}</h2>
              <div className="mt-1 text-[13px] text-black/45">after {d.after}</div>
              <p className="mt-3 text-[14px] leading-relaxed text-black/70">{d.pitch}</p>
              <p className="mt-3 text-[13px] text-black/55">
                <span className="font-medium text-black/80">Best for:</span> {d.bestFor}
              </p>
              <span className="mt-4 inline-block text-[14px] font-medium text-[#2f5bff] group-hover:underline">
                Open →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
