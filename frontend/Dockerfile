# ============================================================
# Stage 1: Build React App with Node.js
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install --no-audit

# Copy sources and build
COPY . .
RUN npm run build

# ============================================================
# Stage 2: Serve with Nginx
# ============================================================
FROM nginx:alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
