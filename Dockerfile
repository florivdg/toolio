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

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["bun", "run", "./dist/server/entry.mjs"]