/**
 * Pre-deploy script: resolves any failed migrations by marking them as rolled-back.
 *
 * Strategy: read the migrations directory and attempt to resolve each one.
 * Prisma will only actually resolve migrations that are in "failed" state —
 * for all others, the resolve command is a no-op or harmless error.
 *
 * Safe for production: only changes metadata in _prisma_migrations table.
 * All our migration SQL uses IF NOT EXISTS / WHERE NOT EXISTS guards.
 */
import { readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'prisma', 'migrations')

function main() {
  console.log('[resolve-failed-migrations] Scanning migrations directory...')

  let entries
  try {
    entries = readdirSync(migrationsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name !== 'migration_lock.toml')
      .map(e => e.name)
  } catch (err) {
    console.log('[resolve-failed-migrations] Could not read migrations directory:', err.message)
    return
  }

  console.log(`[resolve-failed-migrations] Found ${entries.length} migration directories`)

  let resolved = 0
  for (const name of entries) {
    try {
      execSync(`npx prisma migrate resolve --rolled-back ${name}`, {
        encoding: 'utf-8',
        stdio: 'pipe', // Suppress output — most will fail with "not failed" which is expected
      })
      resolved++
      console.log(`[resolve-failed-migrations] Resolved: ${name}`)
    } catch {
      // Expected — migration is not in failed state, skip silently
    }
  }

  if (resolved === 0) {
    console.log('[resolve-failed-migrations] No failed migrations to resolve.')
  } else {
    console.log(`[resolve-failed-migrations] Resolved ${resolved} failed migration(s).`)
  }
}

main()
