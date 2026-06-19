import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const databaseUrl = env('DATABASE_URL') ?? ''
const separator = databaseUrl.includes('?') ? '&' : '?'
const pooledUrl = `${databaseUrl}${separator}connection_limit=20&pool_timeout=10`

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
