#!/bin/sh

# Cron script to update iTunes prices
# This script calls the update prices endpoint every 6 hours

# Get the server URL from environment variable or use localhost
SERVER_URL=${SERVER_URL:-"http://localhost:4321"}

# Log the attempt
echo "$(date): Attempting to update iTunes prices..."

# Call the update prices endpoint
curl -s -X GET "${SERVER_URL}/api/itunes/update-prices" \
  -H "Content-Type: application/json" \
  -H "User-Agent: toolio-cron/1.0" \
  --max-time 300 \
  --retry 3 \
  --retry-delay 5 \
  --output /tmp/update-prices-response.json

# Check if the request was successful
if [ $? -eq 0 ]; then
  echo "$(date): iTunes prices update completed successfully"
  # Optionally log the response
  if [ -f /tmp/update-prices-response.json ]; then
    cat /tmp/update-prices-response.json | head -c 500
    echo ""
  fi
else
  echo "$(date): Failed to update iTunes prices"
fi

# Clean up temporary file
rm -f /tmp/update-prices-response.json
