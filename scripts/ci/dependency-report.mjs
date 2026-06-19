#!/usr/bin/env node
/**
 * `pnpm audit:deps` — print an outdated + vulnerability report across the
 * workspace. Advisory: always exits 0 (informational).
 */
import { execSync } from 'node:child_process'

function run(label, cmd) {
  console.log(`\n\x1b[1m# ${label}\x1b[0m\n$ ${cmd}`)
  try {
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim()
    console.log(out || '(nothing to report)')
  } catch (error) {
    // pnpm outdated/audit exit non-zero when findings exist — that's expected
    const out = (error.stdout?.toString() || '') + (error.stderr?.toString() || '')
    console.log(out.trim() || '(no output)')
  }
}

console.log('AuraSpear dependency report (advisory)')
run('Outdated dependencies (recursive)', 'pnpm -r outdated')
run('Security audit (high+)', 'pnpm audit --audit-level high')
console.log(
  '\nReview before upgrading: majors need ADRs (docs/decisions). See docs/audit/05-dependency-report.md.\n'
)
