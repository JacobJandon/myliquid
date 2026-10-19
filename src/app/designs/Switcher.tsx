import Link from "next/link";
import { DIRECTIONS } from "./directions";

/** The bar on top of every direction: which one you're on, and the others. */
export function Switcher({ current }: { current?: string }) {
  return (
    <div className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 py-2 text-[12px] [scrollbar-width:none]">
        <Link href="/designs" className="mr-2 shrink-0 font-semibold text-black">
          Design directions
        </Link>
        {DIRECTIONS.map((d) => (
          <Link
            key={d.id}
            href={`/designs/${d.id}`}
            className={`shrink-0 rounded-full px-3 py-1 ${current === d.id ? "bg-black text-white" : "text-black/60 hover:bg-black/5"}`}
          >
            {d.n} · {d.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
