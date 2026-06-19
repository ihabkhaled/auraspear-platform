#!/usr/bin/env node
/**
 * `pnpm audit:env` — cross-check environment variables referenced in code
 * against what the *.example templates document. Reports:
 *   - vars used in code but NOT in any .env.example (undocumented)
 *   - vars in .env.example but never referenced in code (possibly stale)
 * Read-only; never prints values. Advisory (always exits 0).
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function grepEnvVars() {
  const found = new Set()
  try {
    // process.env.FOO  |  process.env['FOO']  across the two apps' src
    const out = execSync(
      `git grep -hoE "process\\.env(\\.[A-Z0-9_]+|\\[['\\"][A-Z0-9_]+['\\"]\\])" -- "apps/*/src" || true`,
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString()
    for (const m of out.matchAll(/[A-Z0-9_]{2,}/g)) {
      const v = m[0]
      if (v !== 'NEXT' && v !== 'PUBLIC') found.add(v)
    }
  } catch {
    /* ignore */
  }
  return found
}

function exampleVars() {
  const vars = new Set()
  for (const f of ['.env.example', 'apps/api/.env.example', 'apps/web/.env.example']) {
    const p = join(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^#?\s*([A-Z0-9_]+)=/)
      if (m) vars.add(m[1])
    }
  }
  return vars
}

const used = grepEnvVars()
const documented = exampleVars()

const undocumented = [...used].filter(v => !documented.has(v)).sort()
const stale = [...documented].filter(v => !used.has(v)).sort()

console.log('\nAuraSpear env audit (advisory)\n')
console.log(`Referenced in code: ${used.size}   Documented in *.example: ${documented.size}\n`)
if (undocumented.length) {
  console.log('Used in code but NOT in any .env.example (consider documenting):')
  for (const v of undocumented) console.log(`  - ${v}`)
} else console.log('All code-referenced env vars are documented. ✓')
console.log('')
if (stale.length) {
  console.log('In .env.example but not referenced in app src (verify still needed):')
  for (const v of stale) console.log(`  - ${v}`)
  console.log('  (note: some are consumed by docker-compose / prisma / seed, not app src)')
}
console.log('\nSee docs/ENVIRONMENT.md for the authoritative matrix.\n')
