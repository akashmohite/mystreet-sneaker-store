#!/usr/bin/env bash
# Builds nothing: expects `npm run build` already done in ../../mystreet-ui. Starts mock API + preview server, runs scenarios, cleans up.
set -u
cd "$(dirname "$0")"
node mock-api.mjs > /tmp/mock.log 2>&1 < /dev/null &
MOCK=$!
(cd ../../mystreet-ui && exec npx vite preview --port 4173 --strictPort) > /tmp/preview.log 2>&1 < /dev/null &
PREV=$!
sleep 4
node e2e.mjs
CODE=$?
kill $MOCK $PREV 2>/dev/null
pkill -f "vite preview" 2>/dev/null
exit $CODE
