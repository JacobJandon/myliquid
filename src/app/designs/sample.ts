/**
 * The same sample account in every design direction, so they're compared on design alone. Static: these pages
 * are design comps, not the live app.
 */

export const SAMPLE = {
  name: "Ada",
  pet: "Drip",
  total: 269_814,
  change: { usd: 4_211, pct: 1.59, period: "Past month" },
  cash: 34_000,
  gain: 19_814,
  liquid7d: 0.75,
  // A month of daily values, rising with a dip, for every chart.
  series: [
    252, 254, 253, 256, 258, 257, 255, 251, 249, 252, 256, 259, 261, 260, 258, 262, 264, 263, 266,
    265, 262, 264, 267, 268, 266, 268, 270, 269, 271, 270,
  ].map((v) => v * 1000),
  holdings: [
    {
      id: "MLWX",
      name: "Global Equity Index",
      sleeve: "Index",
      value: 76_407,
      day: 0.42,
      color: "#2a78d6",
    },
    {
      id: "MLUS",
      name: "US Large Cap 500",
      sleeve: "Index",
      value: 33_758,
      day: 0.61,
      color: "#2a78d6",
    },
    {
      id: "MLQM",
      name: "Quant Momentum",
      sleeve: "Trading",
      value: 24_920,
      day: -0.35,
      color: "#eb6834",
    },
    { id: "BTC", name: "Bitcoin", sleeve: "Bitcoin", value: 11_739, day: 2.1, color: "#1baf7a" },
    {
      id: "MLMS",
      name: "Main Street Revenue",
      sleeve: "Business",
      value: 41_200,
      day: 0,
      color: "#eda100",
    },
    {
      id: "MLPC",
      name: "Private Credit",
      sleeve: "Private",
      value: 47_790,
      day: 0,
      color: "#e87ba4",
    },
  ],
  proposal: {
    agent: "Atlas",
    title: "Rebalance to Balanced targets",
    orders: [
      {
        side: "Buy",
        usd: 10_847,
        what: "Quant Momentum",
        why: "Active trading is 4.0% under target",
      },
      {
        side: "Buy",
        usd: 8_434,
        what: "Global Equity Index",
        why: "Index funds are 3.1% under target",
      },
    ],
    checks: [
      "Within your $10,000 per-order cap",
      "Keeps 75% liquid within 7 days",
      "No locked position sold",
    ],
  },
  agents: [
    { name: "Atlas", role: "Allocation", status: "Proposed a rebalance" },
    { name: "Sentinel", role: "Risk", status: "All limits held" },
    { name: "Quant", role: "Signals", status: "Momentum turning up" },
    { name: "Ledger", role: "Valuations", status: "2 marks fresh" },
  ],
  activity: [
    { at: "09:14", who: "Atlas", what: "Proposed a rebalance (2 orders)" },
    { at: "09:14", who: "Sentinel", what: "Checked 6 limits: all pass" },
    {
      at: "08:02",
      who: "Northwind Momentum (AINRA L2)",
      what: "Bought $1,500 of US Large Cap 500 on its own",
    },
    { at: "Yesterday", who: "You", what: "Approved recurring $500 into Global Equity" },
  ],
} as const;

export const usd = (n: number, cents = false) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

/** An SVG path for a series, in a w×h box. */
export function linePath(values: readonly number[], w: number, h: number, pad = 4): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
