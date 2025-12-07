# Edu System

## Production-style Docker setup

- Backend (Go) runs on port `8080` inside the compose network and is **not** published to the host.
- Frontend (Next.js) is served on port `3000` and proxies `/api` to the backend via `NEXT_PUBLIC_API_URL`.
### Requirements
- Docker & Docker Compose v2

### Environment variables (required, no defaults)
- `PORT`: backend port inside the compose network (e.g. `8080`)
- `DB_PATH`: SQLite file path inside backend container (e.g. `/data/database.db`)
- `JWT_SECRET`: strong random secret
- `NEXT_PUBLIC_API_URL`: frontend API target, usually `http://backend:8080`
- `FRONTEND_PORT` (optional): host port to expose frontend (default `3000`)

### Quick start (compose)
1. Set env vars (example):
   ```bash
   export PORT=8080
   export DB_PATH=/data/database.db
   export JWT_SECRET=$(openssl rand -hex 32)
   export NEXT_PUBLIC_API_URL=http://backend:8080
   ```
2. Build and start:
   ```bash
   docker compose up --build -d
   ```
3. Open frontend: http://localhost:3000  
   Backend is only reachable inside the compose network at `http://backend:8080`.

### Stop
```bash
docker compose down
```
