import { DEMO_INVESTOR_ID, newId, nowIso, simDate, type Db } from "@/lib/db";
import { getProduct } from "@/lib/domain/catalog";
import { diffDays } from "@/lib/domain/dates";
import {
  RULE_COOLDOWN_DAYS,
  describeRule,
  momentumSignal,
  ruleTriggered,
  type AutopilotRule,
  type RuleCondition,
} from "@/lib/domain/signals";
import { logEvent } from "./audit";
import { getSnapshot } from "./portfolio";
import { agentTrade, type AgentTradeResult } from "./proposals";
import { priceHistory } from "./repo";
import { addDays } from "@/lib/domain/dates";

/** Autopilot rules: plain-language strategies compiled into triggers that Quant watches daily. */

function mapRule(r: Record<string, unknown>): AutopilotRule & { createdBy: string } {
  return {
    id: r.id as string,
    name: r.name as string,
    productId: r.product_id as string,
    condition: r.condition as RuleCondition,
    threshold: r.threshold as number,
    action: r.action as "buy" | "sell",
    amountCents: r.amount_cents as number,
    status: r.status as "active" | "paused",
    lastTriggeredOn: (r.last_triggered_on as string | null) ?? null,
    createdBy: r.created_by as string,
  };
}

export function listRules(db: Db): (AutopilotRule & { createdBy: string })[] {
  const rows = db
    .prepare("SELECT * FROM rules WHERE investor_id = ? ORDER BY created_at DESC")
    .all(DEMO_INVESTOR_ID) as Record<string, unknown>[];
  return rows.map(mapRule);
}

export interface NewRule {
  productId: string;
  condition: RuleCondition;
  threshold: number;
  action: "buy" | "sell";
  amountCents: number;
  name?: string;
}

export function createRule(db: Db, input: NewRule, createdBy: string): AutopilotRule {
  const product = getProduct(input.productId);
  if (!product) throw new Error(`Unknown product ${input.productId}`);
  if (product.liquidity.redemption !== "daily" && product.liquidity.redemption !== "instant") {
    throw new Error("Autopilot rules can only trade daily-liquid products");
  }
  if (!Number.isFinite(input.threshold)) throw new Error("Threshold must be a number");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0)
    throw new Error("Amount must be positive");
  const id = newId("rule");
  const name = input.name?.trim() || describeRule(input);
  db.prepare(
    `INSERT INTO rules (id, investor_id, name, product_id, condition, threshold, action, amount_cents, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(
    id,
    DEMO_INVESTOR_ID,
    name,
    input.productId,
    input.condition,
    input.threshold,
    input.action,
    input.amountCents,
    createdBy,
    nowIso(),
  );
  logEvent(db, { agent: createdBy, kind: "system", title: `Autopilot rule created: ${name}` });
  return listRules(db).find((r) => r.id === id)!;
}

export function setRuleStatus(db: Db, id: string, status: "active" | "paused"): void {
  db.prepare("UPDATE rules SET status = ? WHERE id = ? AND investor_id = ?").run(
    status,
    id,
    DEMO_INVESTOR_ID,
  );
}

export function deleteRule(db: Db, id: string): void {
  db.prepare("DELETE FROM rules WHERE id = ? AND investor_id = ?").run(id, DEMO_INVESTOR_ID);
}

/** Quant evaluates every active rule against today's prices. Triggered rules go through `agentTrade`. */
export function evaluateRules(
  db: Db,
  runId?: string | null,
): { rule: AutopilotRule; result: AgentTradeResult }[] {
  const today = simDate(db);
  const snapshot = getSnapshot(db, today);
  const fired: { rule: AutopilotRule; result: AgentTradeResult }[] = [];
  for (const rule of listRules(db)) {
    if (rule.status !== "active") continue;
    if (rule.lastTriggeredOn && diffDays(rule.lastTriggeredOn, today) < RULE_COOLDOWN_DAYS)
      continue;
    const history = priceHistory(db, rule.productId, addDays(today, -365));
    if (history.length === 0) continue;
    const signal = momentumSignal(history);
    const weight = snapshot.holdings.find((h) => h.product.id === rule.productId)?.weight ?? 0;
    if (
      !ruleTriggered(rule, {
        price: signal.last,
        drawdownFromHigh: signal.drawdownFromHigh,
        weight,
      })
    )
      continue;

    db.prepare("UPDATE rules SET last_triggered_on = ? WHERE id = ?").run(today, rule.id);
    const result = agentTrade(
      db,
      "quant",
      { productId: rule.productId, side: rule.action, amountCents: rule.amountCents },
      `Autopilot rule triggered: ${rule.name}`,
      runId,
    );
    fired.push({ rule, result });
  }
  return fired;
}
