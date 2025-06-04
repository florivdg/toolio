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

# Start the main application
echo "$(date): Starting Toolio application..."
exec bun run ./dist/server/entry.mjs
