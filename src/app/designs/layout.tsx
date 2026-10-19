import { Geist, Geist_Mono, Instrument_Serif, Newsreader } from "next/font/google";

/** Fonts the design directions try (docs/design/study.md). Only these pages load them. */
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

export const metadata = { title: "Design directions", robots: { index: false } };

export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${newsreader.variable} min-h-screen`}
    >
      {children}
    </div>
  );
}
