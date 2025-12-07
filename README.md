# Edu System

## Docker setup

- Backend (Go) runs on port `8080` inside the compose network and is **not** published to the host.
- Frontend (Next.js) is served on port `3000` and proxies `/api` to the backend via `NEXT_PUBLIC_API_URL`.
### Requirements
- Docker & Docker Compose v2

### Clone & prepare
1. Clone the repo and enter it:
   ```bash
   git clone https://github.com/0xWire/edu-system.git
   cd edu-system
   ```
2. Ensure Docker/Compose are installed.
3. Prepare environment variables (see below).

### Environment variables (required, no defaults)
- `PORT`: backend port inside the compose network (e.g. `8080`)
- `DB_DRIVER`: `sqlite` (default) or `postgres`
- `DB_DSN`: Postgres DSN (required if `DB_DRIVER=postgres`; default in compose points to the bundled Postgres: `postgresql://edu_user:change-me@postgres:5432/edu_db?sslmode=disable`)
- `DB_PATH`: SQLite path (used only if `DB_DRIVER=sqlite`, e.g. `/data/database.db`)
- `JWT_SECRET`: strong random secret
- `NEXT_PUBLIC_API_URL`: frontend API target, usually `http://backend:8080`
- `FRONTEND_PORT` (optional): host port to expose frontend (default `3000`)
- Postgres service (if using the bundled DB container with profile `postgres`):
  - `POSTGRES_DB` (default `edu_db`)
  - `POSTGRES_USER` (default `edu_user`)
  - `POSTGRES_PASSWORD` (default `change-me`, override in prod)

### Quick start (compose)
#### SQLite (default)
1. Set env vars (example):
   ```bash
   export PORT=8080
   export DB_DRIVER=sqlite
   export DB_PATH=/data/database.db
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

#### Postgres (use profile)
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
2. Build and start with postgres profile:
   ```bash
   docker compose --profile postgres up --build -d
   ```

### Stop
```bash
docker compose down
```
