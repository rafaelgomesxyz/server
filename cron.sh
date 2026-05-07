#!/bin/bash
if [ -s "$HOME/.nvm/nvm.sh" ]; then
	source "$HOME/.nvm/nvm.sh"
fi

NODE_BIN="${NODE_BIN:-node}"
if command -v nvm >/dev/null 2>&1; then
	NODE_BIN="$(nvm which node)"
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
CRON_LOCK_FILE="${CRON_LOCK_FILE:-./.cache/cron-browser.lock}"
CRON_LOCK_TIMEOUT="${CRON_LOCK_TIMEOUT:-7200}"
STEAMGIFTS_PLAYWRIGHT_USER_DATA_DIR="${STEAMGIFTS_PLAYWRIGHT_USER_DATA_DIR:-./.cache/steamgifts-playwright-chrome}"

run_job() {
	rm -f "$STEAMGIFTS_PLAYWRIGHT_USER_DATA_DIR"/Singleton*
	if command -v xvfb-run >/dev/null 2>&1; then
		DB_HOST="$DB_HOST" STEAMGIFTS_PLAYWRIGHT_HEADLESS=false xvfb-run -a "$NODE_BIN" "$@"
	else
		DB_HOST="$DB_HOST" "$NODE_BIN" "$@"
	fi
}

mkdir -p "$(dirname "$CRON_LOCK_FILE")"

if command -v flock >/dev/null 2>&1; then
	(
		flock -w "$CRON_LOCK_TIMEOUT" 9 || {
			echo "Could not acquire cron browser lock within ${CRON_LOCK_TIMEOUT}s"
			exit 1
		}
		run_job "$@"
	) 9>"$CRON_LOCK_FILE" >> ./cron.log 2>&1
else
	run_job "$@" >> ./cron.log 2>&1
fi
