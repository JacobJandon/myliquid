#!/bin/bash
# Double-click on a Mac: installs what's needed and shows a QR code. Scan it with your iPhone camera to open
# MyLiquid in Expo Go (free on the App Store). Needs Node.js from nodejs.org. Close this window to stop.
cd "$(dirname "$0")" || exit 1
if ! command -v npm > /dev/null; then
  echo "Node.js isn't installed. Get it from https://nodejs.org, then double-click this file again."
  read -r -p "Press Return to close."
  exit 1
fi
npm install --no-audit --no-fund && npx expo start --tunnel --go
