/**
 * SQLite schema. Product definitions live in code (`domain/catalog.ts`); the
 * database holds everything that changes: prices, lots, orders, agent activity.
 * Money is stored as integer cents. Everything except prices and deal reviews
 * (the shared market) is scoped to an investor.
 */
export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investors (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'user',
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT,
  risk_profile TEXT NOT NULL,
  kyc_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS investors_email ON investors(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_investor ON sessions(investor_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS api_keys_investor ON api_keys(investor_id);

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
  investor_id TEXT NOT NULL REFERENCES investors(id),
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
  investor_id TEXT NOT NULL REFERENCES investors(id),
  run_id TEXT,
  agent TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT,
  sim_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_events_investor ON agent_events(investor_id, id);
CREATE INDEX IF NOT EXISTS agent_runs_investor ON agent_runs(investor_id, started_at);

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

-- The investor's living agent (a "Liquid"). Vitals decay in real time.
CREATE TABLE IF NOT EXISTS companions (
  investor_id TEXT PRIMARY KEY REFERENCES investors(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  born_at TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  fullness REAL NOT NULL,
  fullness_at TEXT NOT NULL,
  energy REAL NOT NULL,
  energy_at TEXT NOT NULL,
  joy REAL NOT NULL,
  joy_at TEXT NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_day TEXT,
  last_level INTEGER NOT NULL DEFAULT 1
);

-- One row per XP award, so daily caps and quests can be computed.
CREATE TABLE IF NOT EXISTS companion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  action TEXT NOT NULL,
  xp INTEGER NOT NULL,
  note TEXT,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS companion_log_investor ON companion_log(investor_id, day);

-- AINRA agent identity pinned to an API key: the connected agent's permanent AINRA Number, what its last
-- verified passport said, and until when its last presentation lets it act (unix seconds).
CREATE TABLE IF NOT EXISTS api_key_identities (
  key_id TEXT PRIMARY KEY REFERENCES api_keys(id),
  investor_id TEXT NOT NULL REFERENCES investors(id),
  ainra_number TEXT NOT NULL,
  ainra_name TEXT NOT NULL,
  tier TEXT,
  capabilities TEXT NOT NULL,
  require_passport INTEGER NOT NULL DEFAULT 1,
  verified_until INTEGER,
  last_verdict TEXT,
  last_presented_at TEXT,
  bound_at TEXT NOT NULL
);

-- Recurring investments: buy a fixed amount of a product on a schedule.
CREATE TABLE IF NOT EXISTS recurring_plans (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  product_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  cadence TEXT NOT NULL,
  status TEXT NOT NULL,
  next_run_on TEXT NOT NULL,
  last_run_on TEXT,
  last_result TEXT,
  runs INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recurring_plans_due ON recurring_plans(status, next_run_on);

-- Limit orders: buy or sell once the daily price reaches a level (good till cancelled, 90 days).
CREATE TABLE IF NOT EXISTS limit_orders (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  product_id TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  limit_price REAL NOT NULL,
  status TEXT NOT NULL,
  created_on TEXT NOT NULL,
  expires_on TEXT NOT NULL,
  closed_on TEXT,
  order_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS limit_orders_open ON limit_orders(status, investor_id);

-- Agent Pay: the agent's own funded wallet (the hard ceiling on agent spending).
CREATE TABLE IF NOT EXISTS wallets (
  investor_id TEXT PRIMARY KEY REFERENCES investors(id),
  balance_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  ref TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS wallet_ledger_investor ON wallet_ledger(investor_id, created_at);

-- A tokenized agent card with its spending policy.
CREATE TABLE IF NOT EXISTS agent_cards (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL UNIQUE REFERENCES investors(id),
  last4 TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL,
  per_payment_limit_cents INTEGER NOT NULL,
  approval_threshold_cents INTEGER NOT NULL,
  daily_limit_cents INTEGER NOT NULL,
  monthly_limit_cents INTEGER NOT NULL,
  allowed_categories TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Payment requests created by merchant terminals. Anyone's agent can tap to pay one.
CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  merchant_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  investor_id TEXT REFERENCES investors(id),
  payment_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(id),
  card_id TEXT,
  merchant_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  initiated_by TEXT NOT NULL,
  request_id TEXT,
  description TEXT NOT NULL,
  checks TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS payments_investor ON payments(investor_id, created_at);
`;
