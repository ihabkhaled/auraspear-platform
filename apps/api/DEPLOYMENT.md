# AuraSpear Backend — Deployment

## Step 1 — Pull Image

```bash
docker pull ihabkhaled94/auraspear-backend:latest
```

## Step 2 — Create Working Directory

```bash
mkdir auraspear-backend && cd auraspear-backend
```

## Step 3 — Create `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ihabkhaled94/auraspear-backend:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - '4000:4000'
    env_file: .env
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      REDIS_HOST: redis
      REDIS_PORT: 6379

volumes:
  pgdata:
```

## Step 4 — Create `.env`

Generate secrets first:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # use for JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # use for CONFIG_ENCRYPTION_KEY
```

Then create the `.env` file:

```env
# Database
POSTGRES_DB=auraspear_soc
POSTGRES_USER=auraspear
POSTGRES_PASSWORD=          # strong password here

# App
PORT=4000
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000

# JWT (required)
JWT_SECRET=                 # paste 64 hex chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption (required)
CONFIG_ENCRYPTION_KEY=      # paste 64 hex chars

# Seed admin account (required)
SEED_DEFAULT_PASSWORD=      # 12+ character password

# AI (optional — configure a Bedrock, LLM APIs, or OpenClaw Gateway connector)
```

## Step 5 — Start

```bash
docker compose up -d
```

## Step 6 — Verify

```bash
docker ps
curl http://localhost:4000/api/v1/health
```

## Commands

| Action       | Command                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| Start        | `docker compose up -d`                                                            |
| Stop         | `docker compose down`                                                             |
| Logs         | `docker logs auraspear-backend -f`                                                |
| Pull latest  | `docker pull ihabkhaled94/auraspear-backend:latest`                               |
| Update       | `docker compose pull && docker compose up -d`                                     |
| DB shell     | `docker exec -it auraspear-backend-postgres-1 psql -U auraspear -d auraspear_soc` |
| Destroy data | `docker compose down -v`                                                          |
