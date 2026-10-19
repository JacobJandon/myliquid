import { notFound } from "next/navigation";
import { FieldNotes } from "../concepts/FieldNotes";
import { NightMarket } from "../concepts/NightMarket";
import { PaperPixels } from "../concepts/PaperPixels";
import { QuietWealth } from "../concepts/QuietWealth";
import { DIRECTIONS } from "../directions";
import { Switcher } from "../Switcher";

const VIEWS = {
  "field-notes": FieldNotes,
  "night-market": NightMarket,
  "quiet-wealth": QuietWealth,
  "paper-pixels": PaperPixels,
} as const;

export function generateStaticParams() {
  return DIRECTIONS.map((d) => ({ id: d.id }));
}

export default async function DirectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const View = VIEWS[id as keyof typeof VIEWS];
  const d = DIRECTIONS.find((x) => x.id === id);
  if (!View || !d) notFound();
  return (
    <>
      <Switcher current={id} />
      <View />
      <footer className="border-t border-black/10 bg-white px-5 py-6 text-center text-[12px] text-black/50">
        Direction {d.n} of {DIRECTIONS.length} · after {d.after} · a design comp with a sample
        account, not the live app
      </footer>
    </>
  );
}
