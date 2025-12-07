# Edu System

## Docker setup

- Backend (Go) runs on port `8080` inside the compose network and is **not** published to the host.
- Frontend (Next.js) is served on port `3000` and proxies `/api` to the backend via `NEXT_PUBLIC_API_URL`.
### Requirements
- Docker & Docker Compose v2

### Environment variables (required, no defaults)
- `PORT`: backend port inside the compose network (e.g. `8080`)
- `DB_DRIVER`: `postgres` (default) or `sqlite`
- `DB_DSN`: Postgres DSN (e.g. `postgresql://user:pass@postgres:5432/edu_db?sslmode=disable`)
- `DB_PATH`: SQLite path (used only if `DB_DRIVER=sqlite`, e.g. `/data/database.db`)
- `JWT_SECRET`: strong random secret
- `NEXT_PUBLIC_API_URL`: frontend API target, usually `http://backend:8080`
- `FRONTEND_PORT` (optional): host port to expose frontend (default `3000`)
- Postgres service (if using the bundled DB container):
  - `POSTGRES_DB` (default `edu_db`)
  - `POSTGRES_USER` (default `edu_user`)
  - `POSTGRES_PASSWORD` (required)

### Quick start (compose)
1. Set env vars (example):
   ```bash
   export PORT=8080
   export DB_DRIVER=postgres
   export POSTGRES_PASSWORD=$(openssl rand -hex 16)
   export DB_DSN=postgresql://edu_user:${POSTGRES_PASSWORD}@postgres:5432/edu_db?sslmode=disable
   export JWT_SECRET=$(openssl rand -hex 32)
   export NEXT_PUBLIC_API_URL=http://backend:8080
   export FRONTEND_PORT=3000
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
