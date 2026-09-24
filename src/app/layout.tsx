import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: { default: "MyLiquid: the agentic wealth platform", template: "%s · MyLiquid" },
  description:
    "AI agents that research, trade and guard your portfolio across index funds, bitcoin, business interests and private markets, and always tell you how liquid you really are.",
};

export const viewport: Viewport = {
  themeColor: "#070a11",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
