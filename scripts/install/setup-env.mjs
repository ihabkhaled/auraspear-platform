#!/usr/bin/env node
/**
 * `pnpm setup:env` — create local .env files from the *.example templates and
 * fill in strong generated secrets where they are empty. Idempotent: never
 * overwrites an existing .env (use --force to regenerate secrets in place).
 * Zero dependencies.
 */
import { randomBytes } from 'node:crypto'
import { constants, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const force = process.argv.includes('--force')
const hex32 = () => randomBytes(32).toString('hex') // 64 hex chars

// Secrets we auto-fill when the value is empty. Keyed by env var name.
const GENERATORS = {
  JWT_SECRET: hex32, // >= 64 hex
  CONFIG_ENCRYPTION_KEY: hex32, // exactly 64 hex
  SEED_DEFAULT_PASSWORD: () => `Aura-${randomBytes(9).toString('base64url')}!1`,
  POSTGRES_PASSWORD: () => randomBytes(12).toString('base64url'),
  PGADMIN_PASSWORD: () => randomBytes(9).toString('base64url'),
  REDIS_PASSWORD: () => randomBytes(16).toString('base64url'), // >= 16 chars
}

const TARGETS = [
  { example: '.env.example', env: '.env' },
  { example: 'apps/api/.env.example', env: 'apps/api/.env' },
  { example: 'apps/web/.env.example', env: 'apps/web/.env' },
]

function fillSecrets(contents) {
  let filled = 0
  const lines = contents.split(/\r?\n/).map(line => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) return line
    const [, key, value] = m
    if (Object.prototype.hasOwnProperty.call(GENERATORS, key) && (value.trim() === '' || force)) {
      filled++
      const gen = Object.getOwnPropertyDescriptor(GENERATORS, key)?.value
      return `${key}=${gen()}`
    }
    return line
  })
  return { text: lines.join('\n'), filled }
}

console.log('\nAuraSpear setup:env\n')
let created = 0
for (const { example, env } of TARGETS) {
  const examplePath = join(ROOT, example)
  const envPath = join(ROOT, env)
  // Atomically copy the template only when .env does not yet exist (COPYFILE_EXCL
  // fails with EEXIST instead of overwriting), avoiding a check-then-act race.
  // If it already exists: without --force we leave it untouched; with --force we
  // keep the existing file and regenerate secrets in place via fillSecrets below.
  try {
    copyFileSync(examplePath, envPath, constants.COPYFILE_EXCL)
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  \x1b[33m!\x1b[0m skip ${env} — missing template ${example}`)
      continue
    }
    if (err.code === 'EEXIST' && !force) {
      console.log(`  \x1b[32m✓\x1b[0m ${env} already exists (use --force to regenerate secrets)`)
      continue
    }
    if (err.code !== 'EEXIST') throw err
  }
  const { text, filled } = fillSecrets(readFileSync(envPath, 'utf8'))
  writeFileSync(envPath, text)
  created++
  console.log(
    `  \x1b[32m✓\x1b[0m wrote ${env}${filled ? ` (generated ${filled} secret${filled > 1 ? 's' : ''})` : ''}`
  )
}

console.log(
  `\n${created ? `Done. Review the generated .env files and set any provider keys (AWS/OIDC).` : 'Nothing to do — all .env files already exist.'}\n` +
    'Secrets are random and gitignored. Never commit .env files.\n'
)
