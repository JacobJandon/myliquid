import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "Privacy",
  description: "What MyLiquid records, why, and how to opt out or have it removed.",
};

const SECTIONS: [string, React.ReactNode][] = [
  [
    "What we record",
    <>
      To learn what to build, MyLiquid records a small set of product events in its own database:
      for example that the front page was seen, a demo started, an order was placed or a survey
      answered. Each carries a random device id kept in a first-party cookie (<code>ml_vid</code>)
      and, if you have an account, your account id. We never record IP addresses, and use no
      third-party analytics, ads or trackers.
    </>,
  ],
  [
    "Opting out",
    <>
      Turn on Global Privacy Control or Do Not Track in your browser and MyLiquid records nothing
      about you and sets no device id. Automated visitors (bots, crawlers, our own tests) are never
      counted.
    </>,
  ],
  [
    "Research answers",
    <>
      If you answer a survey, join early access or ask about Gate or AINRA, we keep your answers. We
      keep an email only when you give it and tick the box, and use it only to follow up on that
      research or early access. We don&apos;t sell or share it.
    </>,
  ],
  [
    "Deleting",
    <>
      Deleting your account (Guardrails → Account) deletes your data. Product events that remain are
      reduced to anonymous counts: your account id becomes a one-way hash and your device id and any
      research email are erased. Guest accounts are removed after seven days the same way. Raw
      events are deleted after about 13 months.
    </>,
  ],
  [
    "Demo money",
    <>
      MyLiquid runs on demo money. Prices for index funds and bitcoin may follow real markets;
      nothing you do here moves real money.
    </>,
  ],
];

export default function PrivacyPage() {
  return (
    <div className="bg-glow min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h1 className="font-display text-3xl leading-tight text-fg sm:text-4xl lg:text-5xl">
          Privacy
        </h1>
        <p className="mt-3 text-fg-2">What MyLiquid records, why, and how to stop it.</p>
        <div className="mt-8 space-y-6">
          {SECTIONS.map(([title, body]) => (
            <section key={title}>
              <h2 className="font-semibold text-fg">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-2">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
