#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# Check if backend port is free, find next available if not
while ss -tlnp | grep -q ":${BACKEND_PORT} "; do
  echo "Port ${BACKEND_PORT} is busy, trying $((BACKEND_PORT + 1))..."
  BACKEND_PORT=$((BACKEND_PORT + 1))
done

cleanup() {
  echo ""
  echo "Stopping services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Done."
}
trap cleanup INT TERM

echo "Starting backend on port ${BACKEND_PORT}..."
cd "$SCRIPT_DIR"
GIN_MODE=debug PORT="${BACKEND_PORT}" go run main.go &
BACKEND_PID=$!

# Sync frontend .env with actual backend port
ENV_FILE="$SCRIPT_DIR/web/.env"
if [ -f "$ENV_FILE" ]; then
  sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}|" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}" > "$ENV_FILE"
fi

echo "Starting frontend on port ${FRONTEND_PORT}..."
cd "$SCRIPT_DIR/web"
PORT="${FRONTEND_PORT}" npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Press Ctrl+C to stop both services."

wait
