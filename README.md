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
- `INTERNAL_API_URL`: internal backend URL used by Next.js rewrites (default `http://backend:8080`)
- `FRONTEND_PORT` (optional): host port to expose frontend (default `3000`)
- `EDUS_HOST` (optional): Traefik host for frontend routing (default `edus.r4nol.dev`)
- AI pipeline (optional, for `/api/v1/ai/pipeline`):
  - `AI_PROVIDER_ORDER`: provider fallback order, comma-separated (`openai,gemini,deepseek,openrouter,local`)
  - `AI_HTTP_TIMEOUT_SEC`: timeout per provider request in seconds (default `90`)
  - `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
  - `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.0-flash`), `GEMINI_BASE_URL` (default `https://generativelanguage.googleapis.com`)
  - `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` (default `deepseek-chat`), `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com`)
  - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`), `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`)
  - `LOCAL_AI_MODEL` (default `llama3.1:8b-instruct`), `LOCAL_AI_BASE_URL` (default `http://localhost:11434/v1`), `LOCAL_AI_API_KEY` (optional for local gateways)
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

### Traefik (optional)
- The `frontend` service includes Traefik labels for `edus.r4nol.dev` (or `EDUS_HOST`).
- For domain deployment, recommended:
  - `NEXT_PUBLIC_API_URL=https://edus.r4nol.dev`
  - `INTERNAL_API_URL=http://backend:8080`
- Ensure external Docker network `global_network` exists:
  ```bash
  docker network create global_network
  ```

## AI 4-layer pipeline (teacher assistant)

New authenticated endpoints:
- `GET /api/v1/ai/providers` — list available providers and configured models.
- `POST /api/v1/ai/pipeline` — run 4 layers:
  1. Plan creation from methodical material.
  2. Draft generation (test variants, notes, practice test).
  3. Validation against the source material.
  4. Final refinement and teacher-ready package.

Minimal request example:
```json
{
  "material": {
    "title": "Linear Algebra: Matrices",
    "text": "Your methodical material text here..."
  },
  "generation_config": {
    "variants_count": 3,
    "questions_per_variant": 15,
    "difficulty": "medium",
    "audience": "first-year students",
    "output_language": "ru"
  },
  "provider": {
    "order": ["openai", "gemini", "deepseek", "openrouter", "local"],
    "layer_order": {
      "validate": ["gemini", "openai", "local"]
    }
  }
}
```
