#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
SEED_DB_PATH="${SEED_DB_PATH:-demo/demo.db}"

# Check if backend port is free, find next available if not
while ss -tlnp | grep -q ":${BACKEND_PORT} "; do
  echo "Port ${BACKEND_PORT} is busy, trying $((BACKEND_PORT + 1))..."
  BACKEND_PORT=$((BACKEND_PORT + 1))
done

cleanup() {
  echo ""
  echo "Stopping services..."
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
  echo "Done."
}
trap cleanup INT TERM

cd "$SCRIPT_DIR"
echo "Seeding demo database..."
go run ./cmd/seed

echo "Starting backend on port ${BACKEND_PORT} with DB_PATH=${SEED_DB_PATH}..."
GIN_MODE=debug PORT="${BACKEND_PORT}" DB_PATH="${SEED_DB_PATH}" go run main.go &
BACKEND_PID=$!

# Sync frontend .env with actual backend port
ENV_FILE="$SCRIPT_DIR/web/.env"
if [ -f "$ENV_FILE" ]; then
  sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}|" "$ENV_FILE"
  if grep -q '^INTERNAL_API_URL=' "$ENV_FILE"; then
    sed -i "s|INTERNAL_API_URL=.*|INTERNAL_API_URL=http://localhost:${BACKEND_PORT}|" "$ENV_FILE"
  else
    echo "INTERNAL_API_URL=http://localhost:${BACKEND_PORT}" >> "$ENV_FILE"
  fi
else
  {
    echo "NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}"
    echo "INTERNAL_API_URL=http://localhost:${BACKEND_PORT}"
    echo "PORT=3000"
    echo "HOST=0.0.0.0"
  } > "$ENV_FILE"
fi

echo "Starting frontend on port ${FRONTEND_PORT}..."
cd "$SCRIPT_DIR/web"
PORT="${FRONTEND_PORT}" npm run dev &
FRONTEND_PID=$!

echo ""
echo "Seed DB : ${SEED_DB_PATH}"
echo "Backend : http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Demo credentials:"
echo "  Email   : demo@edu.kz"
echo "  Password: Demo1234!"
echo ""
echo "Press Ctrl+C to stop both services."

wait
