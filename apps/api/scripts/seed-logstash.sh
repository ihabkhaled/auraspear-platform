#!/bin/bash
# =============================================================================
# AuraSpear SOC — Seed Logstash Pipeline Logs (500 per tenant)
# =============================================================================
# Usage:
#   bash scripts/seed-logstash.sh
#
# Prerequisites:
#   - PostgreSQL running with auraspear_soc database
#   - Tenants seeded (aura-finance, aura-health, aura-enterprise)
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; }
header()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

header "Seeding 500 Logstash Pipeline Logs per tenant (3 tenants = 1500 total)"

cd "$PROJECT_DIR" && node -e "
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TENANT_SLUGS = ['aura-finance', 'aura-health', 'aura-enterprise']

const PIPELINES = [
  'main',
  'syslog-input',
  'beats-input',
  'http-input',
  'filebeat-pipeline',
  'winlogbeat-pipeline',
  'metricbeat-pipeline',
  'auditbeat-pipeline',
  'packetbeat-pipeline',
  'heartbeat-pipeline',
]

const SOURCES = [
  'logstash-node-01',
  'logstash-node-02',
  'logstash-node-03',
  'logstash-cluster',
  'logstash-edge-01',
]

const INFO_MESSAGES = [
  'Pipeline processing events normally',
  'Filter plugin grok matched pattern',
  'Output to Elasticsearch successful',
  'Input received batch of events',
  'Worker thread processing events',
  'Queue depth within limits',
  'Connection to output host established',
  'Filter mutate renamed field successfully',
  'Pipeline reloaded configuration',
  'GeoIP lookup completed for batch',
  'Date filter parsed timestamp',
  'Event routing to conditional output',
  'Ruby filter execution completed',
  'JSON parse completed for incoming events',
  'CSV filter processed batch',
  'Multiline codec merged lines',
  'Persistent queue checkpoint written',
  'Pipeline warm-up complete',
  'Config reload triggered by file change',
  'Elasticsearch bulk indexing completed',
]

const WARN_MESSAGES = [
  'Slow pipeline detected, throughput below threshold',
  'Backpressure detected from output',
  'Memory pressure detected, slowing intake',
  'Queue approaching capacity limit',
  'Retry attempt for failed batch',
  'Input buffer utilization above 80%',
  'Stale connection detected, reconnecting',
  'Pipeline throughput degraded for 5 minutes',
  'Event serialization fallback triggered',
  'Timestamp parsing fell back to default format',
]

const ERROR_MESSAGES = [
  'Failed to connect to output, retrying',
  'Dead letter queue entry created',
  'Elasticsearch bulk request rejected',
  'Pipeline crash detected, restarting worker',
  'Malformed event dropped from pipeline',
  'TLS handshake failed with output host',
  'Disk write error on persistent queue',
  'Out of memory in filter stage',
  'Connection pool exhausted for output',
  'Grok pattern match timeout exceeded',
]

const DEBUG_MESSAGES = [
  'Detailed event trace for debugging',
  'Plugin configuration dump',
  'Thread pool state snapshot',
  'Internal queue metrics collected',
  'Codec decode timing captured',
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function weightedLevel() {
  const r = Math.random()
  if (r < 0.55) return 'info'
  if (r < 0.78) return 'warn'
  if (r < 0.93) return 'error'
  return 'debug'
}

function messageForLevel(level) {
  switch (level) {
    case 'info':  return pick(INFO_MESSAGES)
    case 'warn':  return pick(WARN_MESSAGES)
    case 'error': return pick(ERROR_MESSAGES)
    case 'debug': return pick(DEBUG_MESSAGES)
    default:      return pick(INFO_MESSAGES)
  }
}

async function seedTenant(tenantId, tenantSlug, count) {
  const records = []

  for (let i = 0; i < count; i++) {
    const pipeline = pick(PIPELINES)
    const source = pick(SOURCES)
    const level = weightedLevel()
    const message = messageForLevel(level)
    const eventsIn = rand(100, 5000)
    const eventsOut = Math.max(0, eventsIn - rand(0, 50))
    const eventsFiltered = rand(0, 200)
    const durationMs = level === 'error' ? rand(2000, 10000) : rand(10, 3000)

    // Spread timestamps across last 30 days
    const daysAgo = rand(0, 29)
    const msAgo = daysAgo * 86400000 + rand(0, 86400) * 1000
    const timestamp = new Date(Date.now() - msAgo)

    records.push({
      tenantId,
      pipelineId: pipeline,
      timestamp,
      level,
      message: message + ' [batch ' + (i + 1) + ']',
      source,
      eventsIn,
      eventsOut,
      eventsFiltered,
      durationMs,
      metadata: {
        batchId: i + 1,
        pipeline,
        host: source,
        tenant: tenantSlug,
      },
      syncedAt: new Date(),
    })
  }

  // Insert in chunks of 50 to avoid overwhelming Prisma
  const CHUNK_SIZE = 50
  let inserted = 0
  for (let c = 0; c < records.length; c += CHUNK_SIZE) {
    const chunk = records.slice(c, c + CHUNK_SIZE)
    await prisma.logstashPipelineLog.createMany({
      data: chunk,
      skipDuplicates: true,
    })
    inserted += chunk.length
  }

  return inserted
}

async function main() {
  // Look up all 3 tenants by slug
  const tenants = await prisma.tenant.findMany({
    where: { slug: { in: TENANT_SLUGS } },
    select: { id: true, slug: true, name: true },
  })

  if (tenants.length === 0) {
    console.error('No tenants found. Run prisma:seed first.')
    process.exit(1)
  }

  console.log('Found ' + tenants.length + ' tenants:')
  for (const t of tenants) {
    console.log('  - ' + t.name + ' (' + t.slug + ')')
  }

  let grandTotal = 0
  for (const tenant of tenants) {
    const count = await seedTenant(tenant.id, tenant.slug, 500)
    console.log('[OK] ' + tenant.name + ': seeded ' + count + ' pipeline logs')
    grandTotal += count
  }

  // Verify counts
  console.log('')
  console.log('Verification:')
  for (const tenant of tenants) {
    const total = await prisma.logstashPipelineLog.count({
      where: { tenantId: tenant.id },
    })
    console.log('  ' + tenant.name + ': ' + total + ' total logs')
  }

  console.log('')
  console.log('Grand total seeded this run: ' + grandTotal)
  await prisma.\$disconnect()
  process.exit(0)
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
" 2>&1

RESULT=$?

if [ $RESULT -eq 0 ]; then
  success "Seeded 1500 Logstash pipeline logs (500 per tenant)"
else
  fail "Failed to seed Logstash pipeline logs"
  exit 1
fi

echo ""
success "Logstash seed complete!"
