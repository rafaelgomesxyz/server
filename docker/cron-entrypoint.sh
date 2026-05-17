#!/usr/bin/env bash
set -euo pipefail

: "${DB_HOST:=mysql}"
: "${CRON_TZ:=UTC}"

CRON_FILE="/etc/cron.d/server"

if [ -n "${CONTAINER_CRONTAB:-}" ]; then
	printf "%s\n" "SHELL=/bin/bash" > "$CRON_FILE"
	printf "%s\n" "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" >> "$CRON_FILE"
	printf "%s\n" "CRON_TZ=$CRON_TZ" >> "$CRON_FILE"
	printf "%s\n" "DB_HOST=$DB_HOST" >> "$CRON_FILE"
	printf "%s\n" "PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}" >> "$CRON_FILE"
	printf "%s\n" "STEAMGIFTS_PLAYWRIGHT_HEADLESS=${STEAMGIFTS_PLAYWRIGHT_HEADLESS:-false}" >> "$CRON_FILE"
	printf "%s\n" "STEAMGIFTS_PLAYWRIGHT_USER_DATA_DIR=${STEAMGIFTS_PLAYWRIGHT_USER_DATA_DIR:-/app/.cache/steamgifts-playwright-chrome}" >> "$CRON_FILE"
	printf "%s\n" "$CONTAINER_CRONTAB" >> "$CRON_FILE"
else
	cp /app/docker/crontab "$CRON_FILE"
fi

chmod 0644 "$CRON_FILE"
crontab "$CRON_FILE"

touch /app/cron.log
exec cron -f
