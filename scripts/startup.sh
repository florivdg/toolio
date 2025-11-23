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

# Start crond in the background (cronie version)
crond -n -s -m off &

# Log that cron has started
echo "$(date): Cron daemon (cronie) started"

# Wait a moment for cron to initialize
sleep 2

# Run database migrations in production (unless explicitly disabled)
if [ "$NODE_ENV" = "production" ] && [ "$DISABLE_AUTO_MIGRATIONS" != "true" ]; then
  echo "$(date): Running database migrations..."
  bun run scripts/migrate.ts
  if [ $? -eq 0 ]; then
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
