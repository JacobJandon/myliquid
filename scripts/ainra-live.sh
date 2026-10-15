#!/usr/bin/env bash
# Runs a live AINRA registrar (AINRA's own registrar-box) for MyLiquid, accredited by a TEST-ROOT, on the real
# clock. MyLiquid then issues its hosted traders real passports, verifies them at the real time and can revoke them.
#
#   scripts/ainra-live.sh                 # clones AINRA into .data/ainra-src if AINRA_DIR isn't set
#   AINRA_DIR=/path/to/ainra scripts/ainra-live.sh
#
# Needs git and a Rust toolchain (rustup.rs). It prints the variables to put in .env.local, then keeps the
# registrar running in the foreground (Ctrl-C stops it; its data stays in .data/ainra/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/.data/ainra"
PORT="${AINRA_REGISTRAR_PORT:-4950}"
REG="${AINRA_REGISTRAR_ID:-registrar-07}"
mkdir -p "$STATE"

if [ -z "${AINRA_DIR:-}" ]; then
  AINRA_DIR="$ROOT/.data/ainra-src"
  [ -d "$AINRA_DIR/.git" ] || git clone --depth 1 https://github.com/JacobJandon/ainra.git "$AINRA_DIR"
fi
echo "Building registrar-box and accredit from $AINRA_DIR (first time: a few minutes)…"
(cd "$AINRA_DIR" && cargo build --release -q -p ainra-services --bin registrar-box -p ainra-ceremony --bin accredit)
BIN="$AINRA_DIR/target/release"

# The registrar's write token: generated once, kept with its data.
[ -s "$STATE/token" ] || (umask 077 && head -c 24 /dev/urandom | base64 | tr -d '/+=' > "$STATE/token")
TOKEN="$(cat "$STATE/token")"

AINRA_STAGE_ISSUE_TOKEN="$TOKEN" "$BIN/registrar-box" "127.0.0.1:$PORT" "$REG" "$STATE/registrar" &
RB=$!
trap 'kill $RB 2>/dev/null || true' EXIT
for _ in $(seq 1 120); do curl -sf "http://127.0.0.1:$PORT/health" > /dev/null && break; sleep 0.5; done

# Accredit it once: a TEST-ROOT signs a directory naming this registrar. MyLiquid trusts exactly these files.
if [ ! -s "$STATE/directory.json" ]; then
  curl -sf "http://127.0.0.1:$PORT/accreditation" > "$STATE/accreditation.json"
  "$BIN/accredit" "$STATE" "$STATE/accreditation.json" > /dev/null
fi

cat <<ENV

AINRA registrar $REG is live on http://127.0.0.1:$PORT (console: http://127.0.0.1:$PORT/console).
Add these to .env.local and restart MyLiquid:

AINRA_REGISTRAR_URL=http://127.0.0.1:$PORT
AINRA_REGISTRAR_TOKEN=$TOKEN
AINRA_ROOTS_FILE=$STATE/roots.json
AINRA_DIRECTORY_FILE=$STATE/directory.json

To run MyLiquid's live end-to-end test against it:
AINRA_TEST_REGISTRAR_URL=http://127.0.0.1:$PORT AINRA_TEST_REGISTRAR_TOKEN=$TOKEN AINRA_TEST_ROOTS_FILE=$STATE/roots.json AINRA_TEST_DIRECTORY_FILE=$STATE/directory.json npx vitest run ainra-live
ENV
wait $RB
