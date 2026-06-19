# Install — AuraSpear Platform

## Prerequisites

- **Node.js 22 LTS** (the repo requires `>=22 <25`)
- **pnpm 10** (via `corepack enable`, or `npm i -g pnpm`)
- **Docker + Docker Compose v2** (optional — only for the containerized stack)
- **git**

Run `pnpm doctor` at any time to check your environment.

## One-command quick start

```bash
git clone https://github.com/ihabkhaled/auraspear-platform.git
cd auraspear-platform

# Linux / macOS / WSL
bash scripts/install/install.sh

# Windows (PowerShell)
pwsh -File scripts/install/install.ps1
```

The installer checks prerequisites, runs `pnpm install`, generates `.env` files
with strong secrets (`pnpm setup:env`), and runs `pnpm doctor`.

## Manual setup (any OS)

```bash
corepack enable                 # or: npm i -g pnpm
pnpm install
pnpm setup:env                  # creates .env, apps/api/.env, apps/web/.env with generated secrets
pnpm typecheck                  # validate the workspace (web + api)
```

### Windows note (corepack EPERM)

`corepack enable` can fail writing shims into `C:\Program Files\nodejs` (needs
admin). If so, either run the shell as Administrator, or install pnpm directly:
`npm i -g pnpm`. The standalone pnpm works fine. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Run it

### Option A — Docker (full stack)

```bash
cp .env.example .env            # or: pnpm setup:env  (review the values)
pnpm docker:dev                 # web + api + postgres + redis + pgadmin
pnpm docker:healthcheck         # verify service health
# web → http://localhost:3000   api → http://localhost:4000/api/v1   pgAdmin → http://localhost:5050
pnpm docker:down
```

### Option B — Local apps + Docker infra

```bash
pnpm docker:infra               # just Postgres + Redis + pgAdmin
pnpm dev:api                    # NestJS API (runs prisma migrate + seed first)
pnpm dev                        # Next.js web app
```

### Option C — Fully local (you provide Postgres + Redis)

Set `DATABASE_URL`, `REDIS_HOST`/`REDIS_PORT` in `apps/api/.env`, then:

```bash
pnpm --filter @auraspear/api prisma:migrate
pnpm --filter @auraspear/api prisma:seed     # needs SEED_DEFAULT_PASSWORD
pnpm dev:api
pnpm dev
```

## Environment

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the full variable matrix. The
backend validates env at boot (Zod) — it will refuse to start with weak/missing
`JWT_SECRET`, `CONFIG_ENCRYPTION_KEY`, `SEED_DEFAULT_PASSWORD`, or (in production)
`REDIS_PASSWORD` / localhost `CORS_ORIGINS`.

## Reset

```bash
pnpm docker:clean               # stop stack + remove volumes (DB data!)
rm -rf node_modules && pnpm install
```

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (pnpm/corepack, Prisma, env
validation, the `@hookform/resolvers` zod peer note, Docker health waits).
