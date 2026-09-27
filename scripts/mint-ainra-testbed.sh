#!/usr/bin/env bash
# Mints MyLiquid's AINRA testbed: a TEST-ROOT, an accredited registrar and passports for sample trading
# agents, all with AINRA's own registrar-box and accredit tools (real hybrid Ed25519 + ML-DSA-65 crypto).
# The output replaces src/lib/ainra/testbed/. It follows AINRA's tools/testbed.sh.
#
#   AINRA_DIR=/path/to/ainra scripts/mint-ainra-testbed.sh
#
# Needs a checkout of https://github.com/JacobJandon/ainra and a Rust toolchain. The clock is pinned to
# AINRA's demo instant, so the passports verify at that time (MyLiquid's testbed mode does the same).
set -euo pipefail
AINRA_DIR="${AINRA_DIR:?set AINRA_DIR to an AINRA checkout}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/lib/ainra/testbed"
PORT="${AINRA_TESTBED_PORT:-4911}"
NOW=$((1775865600 + 10 * 24 * 3600)) # 2026-04-21, inside AINRA's demo delegate-cert window
REG=registrar-07
WORK="$(mktemp -d)"
trap 'kill "${RB_PID:-0}" 2>/dev/null || true; rm -rf "$WORK"' EXIT

export AINRA_CLOCK=pinned AINRA_OPEN_WRITES=1
(cd "$AINRA_DIR" && cargo build --release -q -p ainra-services --bin registrar-box -p ainra-ceremony --bin accredit)
"$AINRA_DIR/target/release/registrar-box" "127.0.0.1:$PORT" "$REG" "$WORK/data" >"$WORK/rb.log" 2>&1 &
RB_PID=$!
for _ in $(seq 1 120); do curl -sf "http://127.0.0.1:$PORT/accreditation" >/dev/null && break; sleep 0.5; done
curl -sf "http://127.0.0.1:$PORT/accreditation" >"$WORK/acc.json"
"$AINRA_DIR/target/release/accredit" "$WORK" "$WORK/acc.json" >/dev/null

# issue <operator> <lineage> <tier> <capabilities JSON array>
issue() {
  local audit=""
  case "$3" in L3 | L4) audit=",\"audit\":{\"reference\":\"audit-$1-$2\",\"expires\":1900000000}" ;; esac
  curl -sf -X POST "http://127.0.0.1:$PORT/issue" -d "{\"operator\":\"$1\",\"lineage\":\"$2\",\"version\":\"1.0.0\",\"tier\":\"$3\",\"auth_class\":\"A2\",\"principal_proof\":\"myliquid-testbed-$1\",\"capabilities\":$4,\"scope_ceiling\":$4$audit,\"hops\":[]}" >/dev/null
}
present() { curl -sf "http://127.0.0.1:$PORT/present?sub=ainra:$REG:$1&now=$NOW" >"$OUT/$2.json"; }

issue northwind momentum-trader L2 '["myliquid:read","myliquid:trade"]'
issue northwind research-analyst L1 '["myliquid:read"]'
issue harbor treasury-agent L3 '["myliquid:read","myliquid:trade","myliquid:pay"]'
issue quickfox yield-hunter L2 '["myliquid:read","myliquid:trade"]'

mkdir -p "$OUT"
rm -f "$OUT"/bundle-*.json "$OUT"/agent-*.json
cp "$WORK/roots.json" "$WORK/directory.json" "$OUT/"
present northwind:momentum-trader@1.0.0 agent-momentum-trader
present northwind:research-analyst@1.0.0 agent-research-analyst
present harbor:treasury-agent@1.0.0 agent-treasury-agent
present quickfox:yield-hunter@1.0.0 agent-yield-hunter
# The registrar revokes the yield hunter: a fresh presentation now says so.
curl -sf -X POST "http://127.0.0.1:$PORT/revoke" -d "{\"sub\":\"ainra:$REG:quickfox:yield-hunter@1.0.0\",\"now\":$NOW}" >/dev/null
present quickfox:yield-hunter@1.0.0 agent-yield-hunter-revoked
printf '{\n  "now": %s,\n  "note": "the pinned unix time these passports were presented at; a live deployment uses real time"\n}\n' "$NOW" >"$OUT/meta.json"
echo "minted the AINRA testbed into $OUT"
