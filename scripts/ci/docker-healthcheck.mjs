#!/usr/bin/env node
/**
 * `pnpm docker:healthcheck` — report health of the running compose stack.
 * Exits non-zero if any service is unhealthy or not running.
 */
import { execSync } from 'node:child_process'

const FILES = ['-f', 'infra/docker/docker-compose.yml', '-f', 'infra/docker/docker-compose.dev.yml']

function ps() {
  try {
    const out = execSync(`docker compose ${FILES.join(' ')} ps --format json`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .toString()
      .trim()
    if (!out) return []
    // compose may emit either a JSON array or newline-delimited JSON objects
    return out.startsWith('[') ? JSON.parse(out) : out.split(/\r?\n/).map(l => JSON.parse(l))
  } catch (error) {
    console.error('Could not query docker compose. Is the stack up? (pnpm docker:dev)')
    console.error(String(error.message || error))
    process.exit(2)
  }
}

const services = ps()
if (services.length === 0) {
  console.error('No services found. Start the stack with: pnpm docker:dev')
  process.exit(1)
}

let unhealthy = 0
console.log('\nAuraSpear docker healthcheck\n')
for (const s of services) {
  const name = s.Service || s.Name
  const state = s.State || s.Status || 'unknown'
  const health = s.Health || ''
  const healthy = /running|up/i.test(state) && (!health || /healthy/i.test(health))
  const mark = healthy ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
  if (!healthy) unhealthy++
  console.log(`  ${mark} ${name.padEnd(20)} ${state}${health ? ` (${health})` : ''}`)
}
console.log('')
process.exit(unhealthy > 0 ? 1 : 0)
