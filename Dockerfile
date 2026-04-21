# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Build Node backend ───────────────────────────────────────────────
FROM node:20-alpine AS build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# ── Stage 3: Python backend base ──────────────────────────────────────────────
FROM python:3.11-slim AS python-deps
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 4: Production image ─────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Node runtime for the existing Express server
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend build
COPY --from=build-frontend /app/dist ./dist

# Copy Node server build + production deps
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-server /app/server/node_modules ./server/node_modules

# Copy Python packages
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy Python backend source
COPY backend/ ./backend/

# Data volume mount point
RUN mkdir -p /app/data

ENV PORT=3000
ENV REVIT_API_PORT=8001
ENV DATA_DIR=/app/data
ENV FRONTEND_DIR=/app/dist

EXPOSE 3000 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start both servers
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
CMD ["/docker-entrypoint.sh"]
