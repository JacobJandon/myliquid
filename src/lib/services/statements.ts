import type { Db } from "@/lib/db";
import { toCsv } from "@/lib/domain/automation";
import { getProduct } from "@/lib/domain/catalog";
import { getMerchant } from "@/lib/domain/payments";

/**
 * An account statement as CSV: every trade, cash movement, agent payment and
 * agent-wallet transfer for one investor, newest first. Dates are market dates
 * for trades and cash, and wall-clock dates for card payments.
 */

const HEADER = [
  "Date",
  "Type",
  "Description",
  "Product",
  "Side",
  "Amount (USD)",
  "Units",
  "Price (USD)",
  "Status",
  "Initiated by",
  "Note",
];

type Row = (string | number | null)[];

const usd = (cents: number) => (cents / 100).toFixed(2);

export function statementRows(db: Db, investorId: string): Row[] {
  const rows: Row[] = [];

  const orders = db
    .prepare(
      "SELECT created_on, product_id, side, amount_cents, filled_cents, units, price, status, placed_by, note FROM orders WHERE investor_id = ?",
    )
    .all(investorId) as {
    created_on: string;
    product_id: string;
    side: string;
    amount_cents: number;
    filled_cents: number;
    units: number;
    price: number | null;
    status: string;
    placed_by: string;
    note: string | null;
  }[];
  for (const o of orders) {
    const name = getProduct(o.product_id)?.name ?? o.product_id;
    rows.push([
      o.created_on,
      "Trade",
      `${o.side === "buy" ? "Buy" : "Sell"} ${name}`,
      o.product_id,
      o.side,
      usd(o.filled_cents > 0 ? o.filled_cents : o.amount_cents),
      o.units > 0 ? o.units.toFixed(6) : null,
      o.price !== null ? o.price.toFixed(4) : null,
      o.status,
      o.placed_by,
      o.note,
    ]);
  }

  const cash = db
    .prepare(
      "SELECT created_on, kind, amount_cents, status FROM cash_movements WHERE investor_id = ?",
    )
    .all(investorId) as { created_on: string; kind: string; amount_cents: number; status: string }[];
  for (const c of cash) {
    const deposit = c.kind === "deposit";
    rows.push([
      c.created_on,
      deposit ? "Deposit" : "Withdrawal",
      deposit ? "Deposit from bank" : "Withdrawal to bank",
      null,
      null,
      usd(deposit ? c.amount_cents : -c.amount_cents),
      null,
      null,
      c.status,
      "user",
      null,
    ]);
  }

  const payments = db
    .prepare(
      "SELECT created_at, merchant_id, amount_cents, channel, status, initiated_by, description, reason FROM payments WHERE investor_id = ?",
    )
    .all(investorId) as {
    created_at: string;
    merchant_id: string;
    amount_cents: number;
    channel: string;
    status: string;
    initiated_by: string;
    description: string;
    reason: string | null;
  }[];
  for (const p of payments) {
    rows.push([
      p.created_at.slice(0, 10),
      p.channel === "x402" ? "Agent payment (x402)" : "Agent payment",
      `${getMerchant(p.merchant_id)?.name ?? p.merchant_id}: ${p.description}`,
      null,
      null,
      usd(-p.amount_cents),
      null,
      null,
      p.status,
      p.initiated_by,
      p.reason,
    ]);
  }

  const wallet = db
    .prepare("SELECT created_at, kind, amount_cents FROM wallet_ledger WHERE investor_id = ?")
    .all(investorId) as { created_at: string; kind: string; amount_cents: number }[];
  for (const w of wallet) {
    if (w.kind !== "fund" && w.kind !== "defund") continue; // payments are listed above
    rows.push([
      w.created_at.slice(0, 10),
      "Agent wallet",
      w.kind === "fund" ? "Cash moved into the agent wallet" : "Agent wallet moved back to cash",
      null,
      null,
      usd(w.kind === "fund" ? -Math.abs(w.amount_cents) : Math.abs(w.amount_cents)),
      null,
      null,
      "settled",
      "user",
      null,
    ]);
  }

  return rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
}

export function statementCsv(db: Db, investorId: string): string {
  return toCsv(HEADER, statementRows(db, investorId));
}
