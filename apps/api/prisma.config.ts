import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Read DATABASE_URL via process.env (not prisma's `env()`, which THROWS when the
// var is unset). `prisma generate` runs in `postinstall` and does not connect,
// so it must not fail when DATABASE_URL is absent (CI install, fresh clone,
// Docker build). The NestJS app still validates DATABASE_URL at boot
// (apps/api/src/config/env.validation.ts), and migrate/seed fail loudly on an
// empty URL — so this does not weaken any runtime guarantee.
const databaseUrl = process.env['DATABASE_URL'] ?? ''
const separator = databaseUrl.includes('?') ? '&' : '?'
const pooledUrl = databaseUrl ? `${databaseUrl}${separator}connection_limit=20&pool_timeout=10` : ''

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: pooledUrl,
  },
})
