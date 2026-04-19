# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────────────────
FROM node:20-alpine AS build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy frontend build
COPY --from=build-frontend /app/dist ./dist

# Copy server build + production deps
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-server /app/server/node_modules ./server/node_modules

# Data volume mount point
RUN mkdir -p /app/data

ENV PORT=3000
ENV DATA_DIR=/app/data
ENV FRONTEND_DIR=/app/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/dist/index.js"]
