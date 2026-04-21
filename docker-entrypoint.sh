#!/bin/sh
set -e

# Start Python FastAPI backend in background
python3 -m uvicorn backend.api.main:app \
  --host 0.0.0.0 \
  --port "${REVIT_API_PORT:-8001}" \
  --log-level info &

# Start Node Express server (serves frontend + API)
node server/dist/index.js
