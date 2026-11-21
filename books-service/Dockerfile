# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit

# ---- Production stage ----
FROM node:20-alpine

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package*.json ./
COPY src ./src
COPY seed.js ./

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
