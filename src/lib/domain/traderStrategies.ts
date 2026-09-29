import { formatPct, formatUsd } from "./money";

/**
 * Strategies for MyLiquid's hosted reference traders. They decide from what an outside agent actually sees: the
 * formatted results of MCP tools (get_portfolio, get_market_signals, get_my_permissions), parsed back into
 * numbers here. Pure functions only.
 */

export interface SignalView {
  id: string;
  name: string;
  trend: "uptrend" | "downtrend" | "neutral";
  /** 20-day average over the 60-day, minus 1. */
  strength: number;
  return30d: number;
  drawdownFromHigh: number;
}

export interface HoldingView {
  id: string;
  name: string;
  valueCents: number;
  weight: number;
}

export interface PortfolioView {
  totalCents: number;
  cashCents: number;
  holdings: HoldingView[];
}

export interface TradeIdea {
  productId: string;
  side: "buy" | "sell";
  amountCents: number;
  rationale: string;
}

export interface StrategyResult {
  ideas: TradeIdea[];
  /** What it saw and why it did (or didn't) act, in a sentence or two. */
  note: string;
}

// ── Parsing tool output ─────────────────────────────────────────────────────

/** "$1,234.56" or "-$1,234" → cents. Anything unreadable → 0. */
export function parseUsdCents(text: unknown): number {
  if (typeof text !== "string") return 0;
  const n = Number(text.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** "+1.23%" → 0.0123. Anything unreadable → 0. */
export function parsePct(text: unknown): number {
  if (typeof text !== "string") return 0;
  const n = Number(text.replace(/[%+\s]/g, ""));
  return Number.isFinite(n) ? n / 100 : 0;
}

export function readPortfolio(raw: Record<string, unknown>): PortfolioView {
  const holdings = Array.isArray(raw.holdings) ? (raw.holdings as Record<string, unknown>[]) : [];
  return {
    totalCents: parseUsdCents(raw.total),
    cashCents: parseUsdCents(raw.availableCash),
    holdings: holdings.map((h) => ({
      id: String(h.id),
      name: String(h.name ?? h.id),
      valueCents: parseUsdCents(h.value),
      weight: parsePct(h.weight),
    })),
  };
}

export function readSignals(raw: Record<string, unknown>): SignalView[] {
  const signals = Array.isArray(raw.signals) ? (raw.signals as Record<string, unknown>[]) : [];
  return signals.map((s) => ({
    id: String(s.id),
    name: String(s.name ?? s.id),
    trend: s.trend === "uptrend" || s.trend === "downtrend" ? s.trend : "neutral",
    strength: parsePct(s.strength),
    return30d: parsePct(s.return30d),
    drawdownFromHigh: parsePct(s.drawdownFromHigh),
  }));
}

/**
 * How big one trade may be: its per-trade limit and what's left of today's, when it may trade on its own;
 * otherwise a proposal-sized ticket.
 */
export function ticketCents(
  permissions: Record<string, unknown>,
  proposalTicketCents: number,
): {
  cents: number;
  auto: boolean;
} {
  const trading = (permissions.trading ?? {}) as Record<string, unknown>;
  if (typeof trading.perTradeLimit === "string") {
    return {
      cents: Math.min(parseUsdCents(trading.perTradeLimit), parseUsdCents(trading.leftToday)),
      auto: true,
    };
  }
  return { cents: proposalTicketCents, auto: false };
}

const roundDown = (cents: number, step = 10_00) => Math.floor(cents / step) * step;
const MIN_TRADE_CENTS = 50_00;

// ── Momentum ────────────────────────────────────────────────────────────────

/** Liquid index and trading funds. Bitcoin is left out (a tight cap), and so are bonds (they barely trend). */
export const MOMENTUM_UNIVERSE = ["MLUS", "MLWX", "MLQM"];
const MOMENTUM_MAX_WEIGHT = 0.25;
const MOMENTUM_CASH_FLOOR = 0.05;

/**
 * Buys the strongest uptrend it isn't already heavy in, and trims the weakest downtrend it holds. At most two
 * trades a market day.
 */
export function momentumStrategy(
  signals: SignalView[],
  portfolio: PortfolioView,
  ticket: number,
): StrategyResult {
  const universe = signals.filter((s) => MOMENTUM_UNIVERSE.includes(s.id));
  const held = new Map(portfolio.holdings.map((h) => [h.id, h]));
  const ideas: TradeIdea[] = [];
  const notes: string[] = [];
  if (ticket < MIN_TRADE_CENTS) {
    return { ideas, note: "Today's trading limit is used up; watching only." };
  }

  const best = universe
    .filter((s) => s.trend === "uptrend")
    .sort((a, b) => b.strength - a.strength)[0];
  if (best) {
    const weight = held.get(best.id)?.weight ?? 0;
    const spendable = portfolio.cashCents - portfolio.totalCents * MOMENTUM_CASH_FLOOR;
    const amount = roundDown(Math.min(ticket, spendable));
    if (weight >= MOMENTUM_MAX_WEIGHT)
      notes.push(`${best.name} leads but is already ${formatPct(weight, 1)} of the portfolio.`);
    else if (amount < MIN_TRADE_CENTS)
      notes.push(
        `${best.name} leads, but cash is at its ${formatPct(MOMENTUM_CASH_FLOOR, 0)} floor.`,
      );
    else
      ideas.push({
        productId: best.id,
        side: "buy",
        amountCents: amount,
        rationale: `${best.name} is the strongest uptrend: 20-day average ${formatPct(best.strength, 2, true)} over the 60-day, ${formatPct(best.return30d, 1, true)} in 30 days.`,
      });
  } else {
    notes.push("No uptrend among the index and trading funds.");
  }

  const worst = universe
    .filter((s) => s.trend === "downtrend" && (held.get(s.id)?.valueCents ?? 0) > 0)
    .sort((a, b) => a.strength - b.strength)[0];
  if (worst) {
    const amount = roundDown(Math.min(ticket, held.get(worst.id)!.valueCents * 0.5));
    if (amount >= MIN_TRADE_CENTS)
      ideas.push({
        productId: worst.id,
        side: "sell",
        amountCents: amount,
        rationale: `${worst.name} is in a downtrend (${formatPct(worst.strength, 2, true)}); trimming it.`,
      });
  }

  const summary = universe
    .map((s) => `${s.id} ${s.trend} ${formatPct(s.strength, 2, true)}`)
    .join(", ");
  return {
    ideas,
    note: [`Signals: ${summary || "none"}.`, ...notes].join(" "),
  };
}

// ── Treasury ────────────────────────────────────────────────────────────────

export const TREASURY_TARGET_CASH = 0.08;
export const TREASURY_BAND = 0.02;
const TREASURY_PARKING = "MLBD";

/** Keeps cash near its target: parks the excess in the bond index, and raises cash from it when short. */
export function treasuryStrategy(portfolio: PortfolioView, ticket: number): StrategyResult {
  const total = portfolio.totalCents;
  if (total <= 0) return { ideas: [], note: "The portfolio is empty." };
  const cashPct = portfolio.cashCents / total;
  const target = TREASURY_TARGET_CASH * total;
  const where = `Cash is ${formatPct(cashPct, 1)} of the portfolio; the target is ${formatPct(TREASURY_TARGET_CASH, 0)} ± ${formatPct(TREASURY_BAND, 0)}.`;
  if (ticket < MIN_TRADE_CENTS)
    return { ideas: [], note: `${where} Today's trading limit is used up.` };

  if (cashPct > TREASURY_TARGET_CASH + TREASURY_BAND) {
    const amount = roundDown(Math.min(ticket, portfolio.cashCents - target));
    return amount >= MIN_TRADE_CENTS
      ? {
          ideas: [
            {
              productId: TREASURY_PARKING,
              side: "buy",
              amountCents: amount,
              rationale: `Cash is above target; parking ${formatUsd(amount)} in the bond index.`,
            },
          ],
          note: where,
        }
      : { ideas: [], note: where };
  }
  if (cashPct < TREASURY_TARGET_CASH - TREASURY_BAND) {
    const source =
      portfolio.holdings.find((h) => h.id === TREASURY_PARKING && h.valueCents > 0) ??
      portfolio.holdings.find((h) => h.id === "MLUS" && h.valueCents > 0);
    if (!source) return { ideas: [], note: `${where} Nothing liquid to raise cash from.` };
    const amount = roundDown(Math.min(ticket, target - portfolio.cashCents, source.valueCents));
    return amount >= MIN_TRADE_CENTS
      ? {
          ideas: [
            {
              productId: source.id,
              side: "sell",
              amountCents: amount,
              rationale: `Cash is below target; raising ${formatUsd(amount)} from ${source.name}.`,
            },
          ],
          note: where,
        }
      : { ideas: [], note: where };
  }
  return { ideas: [], note: `${where} Inside the band: nothing to do.` };
}

// ── Research ────────────────────────────────────────────────────────────────

/** The research analyst only reads (tier L1): it writes a daily note from the signals. */
export function researchNote(signals: SignalView[], portfolio: PortfolioView): StrategyResult {
  const up = signals.filter((s) => s.trend === "uptrend");
  const down = signals.filter((s) => s.trend === "downtrend");
  const deepest = [...signals].sort((a, b) => a.drawdownFromHigh - b.drawdownFromHigh)[0];
  const list = (xs: SignalView[]) =>
    xs
      .map(
        (s) =>
          `${s.id} (trend ${formatPct(s.strength, 1, true)}, 30d ${formatPct(s.return30d, 1, true)})`,
      )
      .join(", ") || "none";
  return {
    ideas: [],
    note: `Uptrends: ${list(up)}. Downtrends: ${list(down)}.${
      deepest
        ? ` Furthest from its high: ${deepest.name} (${formatPct(deepest.drawdownFromHigh, 1)}).`
        : ""
    } Cash is ${formatPct(portfolio.totalCents ? portfolio.cashCents / portfolio.totalCents : 0, 1)} of the portfolio.`,
  };
}
