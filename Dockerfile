# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY . .

RUN bun install
RUN bun run build

# Bundle add user script
RUN bun build scripts/add-user.ts --outdir . --target bun

# Runtime stage
FROM oven/bun:1-alpine

WORKDIR /app

# Install cronie for scheduled tasks
RUN apk add --no-cache cronie curl

# Add label for the image description for GitHub's container registry
LABEL org.opencontainers.image.description="Helpers n stuff."

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy built output from builder stage
COPY --from=builder /app/dist /app/dist

# Copy drizzle schema and scripts
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/
COPY scripts/migrate.ts ./scripts/
COPY --from=builder /app/add-user.js /app/scripts/
COPY scripts/update-prices-cron.sh /app/scripts/
COPY scripts/crontab /app/scripts/
COPY scripts/startup.sh /app/scripts/

# Make scripts executable
RUN chmod +x /app/scripts/startup.sh /app/scripts/update-prices-cron.sh

ENV HOST=0.0.0.0
ENV PORT=4321
ENV SERVER_URL=http://localhost:4321

EXPOSE 4321

CMD ["/app/scripts/startup.sh"]