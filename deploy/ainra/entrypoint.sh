#!/bin/sh
# Starts the AINRA registrar and, the first time, accredits it: a TEST-ROOT signs a directory naming this registrar
# and writes roots.json + directory.json to /anchors, which MyLiquid mounts read-only as its trust anchors.
set -eu
: "${AINRA_STAGE_ISSUE_TOKEN:?set AINRA_REGISTRAR_TOKEN (the registrar's write token)}"
REG="${AINRA_REGISTRAR_ID:-registrar-07}"
registrar-box 0.0.0.0:4950 "$REG" /data/registrar &
RB=$!
trap 'kill "$RB" 2>/dev/null || true' TERM INT
i=0
until curl -fsS http://127.0.0.1:4950/health > /dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -gt 120 ] && { echo "registrar-box didn't start" >&2; exit 1; }
  sleep 0.5
done
if [ ! -s /anchors/directory.json ]; then
  curl -fsS http://127.0.0.1:4950/accreditation > /anchors/accreditation.json
  accredit /anchors /anchors/accreditation.json
fi
echo "AINRA registrar $REG ready; trust anchors in /anchors"
wait "$RB"
