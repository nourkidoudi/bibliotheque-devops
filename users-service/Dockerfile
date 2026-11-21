# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit

# ─── Production stage ────────────────────────────────────────────────────────
FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/
COPY seed.js ./seed.js

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
