/**
 * SQLite schema. Product definitions live in code (`domain/catalog.ts`); the
 * database holds everything that changes: prices, lots, orders, agent activity.
 * Money is stored as integer cents.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  risk_profile TEXT NOT NULL,
  kyc_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mandates (
  investor_id TEXT PRIMARY KEY REFERENCES investors(id),
  autonomy TEXT NOT NULL,
  auto_execute_limit_cents INTEGER NOT NULL,
  agent_budget_cents INTEGER NOT NULL,
  per_order_cap_cents INTEGER NOT NULL,
  daily_cap_cents INTEGER NOT NULL,
  max_orders_per_day INTEGER NOT NULL,
  allowed_sleeves TEXT NOT NULL,
  read_only INTEGER NOT NULL DEFAULT 0,
  kill_switch INTEGER NOT NULL DEFAULT 0,
  kill_reason TEXT,
  circuit_breaker_pct REAL NOT NULL,
  disabled_agents TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS accounts (
  investor_id TEXT PRIMARY KEY REFERENCES investors(id),
  cash_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  product_id TEXT NOT NULL,
  date TEXT NOT NULL,
  price REAL NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (product_id, date)
);

CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  product_id TEXT NOT NULL,
  units REAL NOT NULL,
  cost_cents INTEGER NOT NULL,
  acquired_on TEXT NOT NULL,
  locked_until TEXT
);
CREATE INDEX IF NOT EXISTS lots_investor ON lots(investor_id, product_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  product_id TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  filled_cents INTEGER NOT NULL DEFAULT 0,
  units REAL NOT NULL DEFAULT 0,
  price REAL,
  status TEXT NOT NULL,
  placed_by TEXT NOT NULL,
  autonomous INTEGER NOT NULL DEFAULT 0,
  proposal_id TEXT,
  created_on TEXT NOT NULL,
  settle_on TEXT,
  window_on TEXT,
  note TEXT,
  checks TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_investor ON orders(investor_id, created_on);

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_on TEXT NOT NULL,
  settle_on TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  agent TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  orders TEXT NOT NULL,
  checks TEXT NOT NULL,
  status TEXT NOT NULL,
  created_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  result TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  agent TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  product_id TEXT,
  created_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS deal_reviews (
  product_id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  flags TEXT NOT NULL,
  memo TEXT NOT NULL,
  reviewed_on TEXT NOT NULL,
  reviewed_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold REAL NOT NULL,
  action TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_triggered_on TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  trigger TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  error TEXT,
  sim_date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT,
  agent TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT,
  sim_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_events_created ON agent_events(created_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nav_history (
  investor_id TEXT NOT NULL REFERENCES investors(id),
  date TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  PRIMARY KEY (investor_id, date)
);
`;
