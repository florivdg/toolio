#!/bin/sh

# Cron script to update iTunes prices
# This script calls the update prices endpoint every 6 hours
#
# cron starts jobs with an almost empty environment, so startup.sh hands the
# container's settings over in root-only files under CRON_ENV_DIR. Variables
# already set in the environment win, which keeps manual runs simple.

set -u

CRON_ENV_DIR=${CRON_ENV_DIR:-/run/toolio-cron}

# Prints a handed-over setting, or nothing if startup.sh did not write it.
setting() {
  if [ -r "$CRON_ENV_DIR/$1" ]; then cat "$CRON_ENV_DIR/$1"; fi
}

: "${PRICE_UPDATE_CRON_SECRET:=$(setting price-update-secret)}"
: "${SERVER_URL:=$(setting server-url)}"
: "${SERVER_URL:=http://localhost:4321}"

if [ -z "${PRICE_UPDATE_CRON_SECRET:-}" ]; then
  echo "$(date): PRICE_UPDATE_CRON_SECRET is not set; refusing to update iTunes prices"
  exit 1
fi

RESPONSE_FILE=$(mktemp) || exit 1
trap 'rm -f "$RESPONSE_FILE"' EXIT

# Log the attempt
echo "$(date): Attempting to update iTunes prices..."

# The header is passed on stdin so the secret never shows up in the process
# list, and nothing below echoes the request. Astro refuses a cross-site POST
# without a content type before the route runs, so the call says it is JSON;
# the bearer secret is what authenticates it.
# A price update is not idempotent, so a failed or timed-out call is not
# retried: the next scheduled run tries again.
HTTP_STATUS=$(
  printf 'Authorization: Bearer %s\n' "$PRICE_UPDATE_CRON_SECRET" |
    curl -sS -X POST "${SERVER_URL}/api/itunes/update-prices" \
      -H @- \
      -H "Content-Type: application/json" \
      -H "User-Agent: toolio-cron/1.0" \
      --data '{}' \
      --max-time 300 \
      --fail-with-body \
      --output "$RESPONSE_FILE" \
      --write-out '%{http_code}'
)
CURL_EXIT=$?

if [ "$CURL_EXIT" -eq 0 ]; then
  echo "$(date): iTunes prices update completed successfully (HTTP ${HTTP_STATUS})"
else
  echo "$(date): Failed to update iTunes prices (curl exit ${CURL_EXIT}, HTTP ${HTTP_STATUS:-none})"
fi

# Log the start of the response either way; it never contains the secret.
if [ -s "$RESPONSE_FILE" ]; then
  head -c 500 "$RESPONSE_FILE"
  echo ""
fi

exit "$CURL_EXIT"
