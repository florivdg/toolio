#!/bin/sh

# Startup script for Toolio with cron support

# Create necessary directories
mkdir -p /var/log
mkdir -p /root/.cache
mkdir -p /var/spool/cron/crontabs

# Initialize cron log file
touch /var/log/cron.log

# Set up the crontab
crontab /app/scripts/crontab

# Make the cron script executable
chmod +x /app/scripts/update-prices-cron.sh

# cron runs jobs with an almost empty environment, so hand the price job its
# settings in root-only files instead of the crontab, which anyone can list.
CRON_ENV_DIR=/run/toolio-cron
rm -rf "$CRON_ENV_DIR"
(
  umask 077
  mkdir -p "$CRON_ENV_DIR"
  if [ -n "${SERVER_URL:-}" ]; then
    printf '%s' "$SERVER_URL" >"$CRON_ENV_DIR/server-url"
  fi
  if [ -n "${PRICE_UPDATE_CRON_SECRET:-}" ]; then
    printf '%s' "$PRICE_UPDATE_CRON_SECRET" >"$CRON_ENV_DIR/price-update-secret"
  else
    echo "$(date): WARNING: PRICE_UPDATE_CRON_SECRET is not set; scheduled price updates will fail"
  fi
)

# Start crond in the background (cronie version)
crond -n -s -m off &

# Log that cron has started
echo "$(date): Cron daemon (cronie) started"

# Wait a moment for cron to initialize
sleep 2

# Run database migrations in production (unless explicitly disabled)
if [ "$NODE_ENV" = "production" ] && [ "$DISABLE_AUTO_MIGRATIONS" != "true" ]; then
  echo "$(date): Running database migrations..."
  if bun run scripts/migrate.ts; then
    echo "$(date): Database migrations completed successfully"
  else
    echo "$(date): ERROR: Database migrations failed"
    exit 1
  fi
else
  if [ "$DISABLE_AUTO_MIGRATIONS" = "true" ]; then
    echo "$(date): Auto-migrations disabled by DISABLE_AUTO_MIGRATIONS flag"
  else
    echo "$(date): Skipping auto-migrations (NODE_ENV=$NODE_ENV)"
  fi
fi

# Start the main application
echo "$(date): Starting Toolio application..."
exec bun run ./dist/server/entry.mjs
