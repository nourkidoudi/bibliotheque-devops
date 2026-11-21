# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit

# ---- Production Stage ----
FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package*.json ./
COPY src ./src

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

CMD ["node", "src/server.js"]
