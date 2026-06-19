# AuraSpear Frontend — Deployment

> Backend must be running first — see backend `DEPLOYMENT.md`

## Step 1 — Pull Image

```bash
docker pull ihabkhaled94/auraspear-frontend:latest
```

## Step 2 — Create Working Directory

```bash
mkdir auraspear-frontend && cd auraspear-frontend
```

## Step 3 — Create `docker-compose.yml`

```yaml
services:
  frontend:
    image: ihabkhaled94/auraspear-frontend:latest
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      BACKEND_API_URL: http://YOUR_BACKEND_HOST:4000/api/v1
```

Replace `YOUR_BACKEND_HOST` with:

- `host.docker.internal` — backend on same machine
- `192.168.x.x` or your domain — backend on another machine

## Step 4 — Start

```bash
docker compose up -d
```

## Step 5 — Verify

```bash
docker ps
```

Open **http://YOUR_SERVER_IP:3000**

Login:

- Email: `admin@auraspear.io`
- Password: the `SEED_DEFAULT_PASSWORD` from backend `.env`

## Database Migrations Required

- `user_memories` table with embedding storage
- `search_vector` tsvector column on `ai_execution_findings` with GIN index
- `pg_trgm` PostgreSQL extension for fuzzy search
- `memory_extraction` added to `JobType` enum
- New permissions: `AI_CHAT_ACCESS`, `AI_MEMORY_VIEW`, `AI_MEMORY_EDIT`

## Commands

| Action      | Command                                              |
| ----------- | ---------------------------------------------------- |
| Start       | `docker compose up -d`                               |
| Stop        | `docker compose down`                                |
| Logs        | `docker logs auraspear-frontend -f`                  |
| Pull latest | `docker pull ihabkhaled94/auraspear-frontend:latest` |
| Update      | `docker compose pull && docker compose up -d`        |
| Restart     | `docker compose restart`                             |
