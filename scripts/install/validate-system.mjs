#!/usr/bin/env node
/**
 * `node scripts/install/validate-system.mjs` — run the platform's hard
 * validation gates in order and stop on the first failure. Mirrors CI's
 * `validate` job (typecheck + build); add --full to also run tests.
 */
import { execSync } from 'node:child_process'

const full = process.argv.includes('--full')
const steps = [
  ['Install (frozen lockfile)', 'pnpm install --frozen-lockfile'],
  ['Prisma generate (api)', 'pnpm --filter @auraspear/api prisma:generate'],
  ['Typecheck (web + api)', 'pnpm typecheck'],
  ['Build (web + api)', 'pnpm build'],
]
if (full) steps.push(['Tests (web + api)', 'pnpm test'])

console.log('\nAuraSpear system validation\n')
for (const [label, cmd] of steps) {
  process.stdout.write(`→ ${label} ... `)
  try {
    execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
    console.log('\x1b[32mOK\x1b[0m')
  } catch (error) {
    console.log('\x1b[31mFAILED\x1b[0m')
    console.error(`\nCommand failed: ${cmd}\n`)
    console.error((error.stdout?.toString() || '') + (error.stderr?.toString() || ''))
    process.exit(1)
  }
}
console.log('\n\x1b[32mAll validation gates passed.\x1b[0m\n')
