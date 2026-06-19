#!/usr/bin/env node
/**
 * `pnpm doctor` — environment preflight for the AuraSpear platform.
 * Zero dependencies. Checks tool versions and reports clear next steps.
 * Exit code is non-zero if any REQUIRED check fails.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ok = m => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const warn = m => console.log(`  \x1b[33m!\x1b[0m ${m}`)
const bad = m => console.log(`  \x1b[31m✗\x1b[0m ${m}`)

function ver(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function major(v) {
  const m = (v || '').match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

let failures = 0

console.log('\nAuraSpear doctor — checking your environment\n')

// --- Node ---
const node = process.versions.node
if (major(node) >= 22 && major(node) < 25) ok(`Node ${node}`)
else {
  bad(`Node ${node} — require >=22 <25 (Node 22 LTS recommended)`)
  failures++
}

// --- pnpm ---
const pnpm = ver('pnpm --version')
if (pnpm && major(pnpm) >= 10) ok(`pnpm ${pnpm}`)
else {
  bad(
    `pnpm ${pnpm ?? 'not found'} — require >=10. Run: corepack enable && corepack prepare pnpm@latest --activate`
  )
  failures++
}

// --- corepack (recommended) ---
const corepack = ver('corepack --version')
corepack ? ok(`corepack ${corepack}`) : warn('corepack not found (optional — used to pin pnpm)')

// --- git ---
const git = ver('git --version')
git ? ok(git) : (bad('git not found'), failures++)

// --- Docker (optional but recommended) ---
const docker = ver('docker --version')
const compose = ver('docker compose version')
if (docker) {
  ok(docker)
  compose
    ? ok(compose.split('\n')[0])
    : warn('docker compose v2 not found (needed for pnpm docker:*)')
} else {
  warn('Docker not found (optional — only needed for the containerized stack)')
}

// --- OpenSSL (for secret generation) ---
const openssl = ver('openssl version')
openssl
  ? ok(openssl)
  : warn('openssl not found (Node crypto is used as a fallback for secret generation)')

// --- Workspace state ---
console.log('\nWorkspace:')
existsSync(join(ROOT, 'node_modules'))
  ? ok('dependencies installed (node_modules present)')
  : warn('dependencies not installed — run: pnpm install')

const envChecks = [
  ['.env', 'root (docker compose)'],
  ['apps/api/.env', 'api (local dev)'],
  ['apps/web/.env', 'web (local dev)'],
]
for (const [f, label] of envChecks) {
  existsSync(join(ROOT, f))
    ? ok(`${f} present (${label})`)
    : warn(`${f} missing (${label}) — run: pnpm setup:env`)
}

console.log('')
if (failures > 0) {
  bad(`${failures} required check(s) failed. Fix the items above and re-run \`pnpm doctor\`.`)
  process.exit(1)
}
ok('All required checks passed. Next: pnpm install → pnpm setup:env → pnpm typecheck → pnpm dev')
console.log('')
