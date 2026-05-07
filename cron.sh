#!/bin/bash
if [ -s "$HOME/.nvm/nvm.sh" ]; then
	source "$HOME/.nvm/nvm.sh"
fi

NODE_BIN="${NODE_BIN:-node}"
if command -v nvm >/dev/null 2>&1; then
	NODE_BIN="$(nvm which node)"
fi

DB_HOST="${DB_HOST:-127.0.0.1}"

if command -v xvfb-run >/dev/null 2>&1; then
	DB_HOST="$DB_HOST" STEAMGIFTS_PLAYWRIGHT_HEADLESS=false xvfb-run -a "$NODE_BIN" "$@" >> ./cron.log 2>&1
else
	DB_HOST="$DB_HOST" "$NODE_BIN" "$@" >> ./cron.log 2>&1
fi
