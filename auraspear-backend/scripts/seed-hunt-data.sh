#!/bin/bash
# =============================================================================
# AuraSpear SOC — Seed Hunt Sessions & Events (500+ per tenant)
# =============================================================================
# Seeds: HuntSession, HuntEvent
# Tenants: aura-finance, aura-health, aura-enterprise
#
# Usage:
#   bash scripts/seed-hunt-data.sh
#
# Prerequisites:
#   - PostgreSQL running with auraspear_soc database
#   - Tenants seeded (aura-finance, aura-health, aura-enterprise)
#   - At least one user per tenant (for startedBy field)
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

header "Seeding Hunt Sessions & Events (500+ events per tenant)"

cd "$PROJECT_DIR" && node -e "
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const prisma = new PrismaClient()

const TENANT_SLUGS = ['aura-finance', 'aura-health', 'aura-enterprise']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const uuid = () => crypto.randomUUID()
const daysAgo = (d) => new Date(Date.now() - d * 86400000 - rand(0, 86400) * 1000)
const hoursAgo = (h) => new Date(Date.now() - h * 3600000 - rand(0, 3600) * 1000)

// ─── Hunt Queries ───────────────────────────────────────────────────────────

const HUNT_QUERIES = [
  'source.ip:203.0.113.* AND event.action:login_failed',
  'process.name:powershell.exe AND process.args:*-enc*',
  'dns.question.name:*.onion OR dns.question.name:*.bit',
  'event.action:file_created AND file.extension:(exe OR dll OR scr)',
  'network.bytes_out:>1000000 AND destination.geo.country_name:!internal',
  'process.parent.name:winword.exe AND process.name:(cmd.exe OR powershell.exe)',
  'registry.path:*\\\\Run\\\\* AND event.action:registry_modified',
  'event.action:ssh_login AND source.geo.country_name:(!US AND !UK AND !DE)',
  'file.hash.sha256:* AND event.action:file_quarantined',
  'destination.port:(4444 OR 5555 OR 8888) AND network.direction:outbound',
  'user.name:admin AND event.action:privilege_escalation',
  'event.module:suricata AND alert.severity:1',
  'process.name:certutil.exe AND process.args:*urlcache*',
  'event.action:service_installed AND service.type:kernel_driver',
  'source.ip:10.0.0.* AND destination.ip:!10.0.0.* AND network.bytes_out:>500000',
  'process.name:mshta.exe OR process.name:wscript.exe OR process.name:cscript.exe',
  'event.action:ldap_query AND user.name:!svc_* AND event.count:>100',
  'dns.question.type:TXT AND dns.response.data:*==',
  'event.action:firewall_deny AND source.ip:192.168.* AND destination.port:445',
  'process.command_line:*base64* AND process.parent.name:explorer.exe',
]

const TIME_RANGES = ['1h', '6h', '12h', '24h', '7d', '30d']
const STATUSES = ['completed', 'completed', 'completed', 'completed', 'running', 'error']
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const SOURCE_TYPES = ['wazuh', 'wazuh', 'wazuh', 'graylog']

const MITRE_TACTICS = [
  'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
  'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
  'Collection', 'Command and Control', 'Exfiltration', 'Impact',
]
const MITRE_TECHNIQUES = [
  'T1190', 'T1059', 'T1053', 'T1078', 'T1562', 'T1003', 'T1087',
  'T1021', 'T1074', 'T1071', 'T1048', 'T1486', 'T1566', 'T1055',
  'T1547', 'T1036', 'T1110', 'T1069', 'T1570', 'T1005', 'T1572',
  'T1499', 'T1027', 'T1056', 'T1082', 'T1102', 'T1041', 'T1489',
]

const EVENT_DESCRIPTIONS = [
  'Brute force login attempt detected from external IP',
  'Encoded PowerShell command executed by non-admin user',
  'DNS resolution to known dark web domain',
  'Suspicious executable created in temp directory',
  'Large outbound data transfer to external host',
  'Child process spawned from Office application',
  'Registry Run key modified for persistence',
  'SSH login from unexpected geographic location',
  'File quarantined by endpoint protection',
  'Outbound connection on known C2 port',
  'Privilege escalation attempt by admin account',
  'Suricata IDS alert — high severity network anomaly',
  'Certutil used to download remote payload',
  'Kernel driver service installed unexpectedly',
  'Lateral movement detected from internal subnet',
  'Suspicious script interpreter process launched',
  'Excessive LDAP queries from non-service account',
  'DNS TXT record with base64 encoded data (possible exfiltration)',
  'SMB access denied — potential worm propagation attempt',
  'Base64-encoded command launched from Explorer shell',
  'Failed authentication from multiple source IPs within 5 minutes',
  'Unusual process tree: svchost.exe spawning cmd.exe',
  'Outbound HTTPS traffic to newly registered domain',
  'Multiple file rename operations detected (possible ransomware)',
  'Windows event log cleared by non-SYSTEM account',
  'USB device insertion detected on critical server',
  'Network scan pattern detected from internal host',
  'Scheduled task created with suspicious command',
  'Process injection detected via WriteProcessMemory',
  'Anomalous DNS query volume spike from single host',
]

const USERS = [
  'analyst@auraspear.io', 'hunter@auraspear.io', 'soc-lead@auraspear.io',
  'admin@auraspear.io', 'responder@auraspear.io', 'tier2@auraspear.io',
]

const IP_PREFIXES = [
  '203.0.113.', '198.51.100.', '192.0.2.', '10.0.1.', '10.0.2.',
  '172.16.5.', '192.168.1.', '192.168.10.', '45.33.32.', '91.189.89.',
]

const EVENT_USERS = [
  'jdoe', 'admin', 'root', 'svc_backup', 'contractor01', 'devops',
  'marketing_intern', 'ciso', 'db_admin', 'web_server', null, null,
]

function randomIp() {
  return pick(IP_PREFIXES) + rand(1, 254)
}

function generateReasoning(status, eventsFound, query) {
  const steps = [
    'Initializing hunt session...',
    'Parsing query: ' + query.substring(0, 60) + '...',
    'Connecting to Wazuh indexer...',
    'Executing Elasticsearch DSL query...',
  ]
  if (status === 'error') {
    steps.push('Error: Connection timeout to Wazuh indexer')
    return steps
  }
  steps.push('Found ' + eventsFound + ' matching events')
  steps.push('Extracting unique source IPs...')
  steps.push('Computing threat score based on severity distribution...')
  steps.push('Mapping events to MITRE ATT&CK framework...')
  if (status === 'completed') {
    steps.push('Analysis complete — hunt session finished')
  }
  return steps
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { slug: { in: TENANT_SLUGS } },
    select: { id: true, slug: true },
  })
  if (tenants.length === 0) {
    console.error('No tenants found! Run prisma seed first.')
    process.exit(1)
  }
  console.log('Found tenants:', tenants.map(t => t.slug).join(', '))

  let totalSessions = 0
  let totalEvents = 0

  for (const tenant of tenants) {
    console.log('\\nSeeding hunt data for: ' + tenant.slug)

    // Create 25-35 sessions per tenant, each with 15-30 events
    const sessionCount = rand(25, 35)
    let tenantEvents = 0

    for (let s = 0; s < sessionCount; s++) {
      const status = pick(STATUSES)
      const query = pick(HUNT_QUERIES)
      const eventsCount = status === 'error' ? rand(0, 3) : rand(15, 30)
      const uniqueIps = status === 'error' ? 0 : rand(3, Math.min(eventsCount, 20))
      const threatScore = status === 'error' ? 0 : rand(10, 95)
      const startedAt = daysAgo(rand(0, 30))
      const completedAt = status === 'running' ? null : new Date(startedAt.getTime() + rand(5000, 120000))
      const startedBy = pick(USERS)

      // Pick random MITRE tactics/techniques
      const tacticCount = rand(1, 4)
      const techCount = rand(1, 6)
      const tactics = []
      const techniques = []
      for (let i = 0; i < tacticCount; i++) {
        const t = pick(MITRE_TACTICS)
        if (!tactics.includes(t)) tactics.push(t)
      }
      for (let i = 0; i < techCount; i++) {
        const t = pick(MITRE_TECHNIQUES)
        if (!techniques.includes(t)) techniques.push(t)
      }

      const reasoning = generateReasoning(status, eventsCount, query)

      const session = await prisma.huntSession.create({
        data: {
          id: uuid(),
          tenantId: tenant.id,
          query,
          status,
          startedAt,
          completedAt,
          startedBy,
          eventsFound: eventsCount,
          reasoning,
          uniqueIps,
          threatScore,
          mitreTactics: status === 'error' ? [] : tactics,
          mitreTechniques: status === 'error' ? [] : techniques,
          aiAnalysis: status === 'completed' ? 'Automated analysis: The hunt identified ' + eventsCount + ' events matching the query pattern. Threat score of ' + threatScore + '/100 based on severity distribution and MITRE coverage. ' + (threatScore > 70 ? 'Recommend immediate incident escalation.' : threatScore > 40 ? 'Recommend further investigation.' : 'Low risk — monitor for recurrence.') : null,
          sourceType: pick(SOURCE_TYPES),
          timeRange: pick(TIME_RANGES),
          executedQuery: { query: { bool: { must: [{ query_string: { query } }] } } },
        },
      })

      // Create events for this session
      const events = []
      for (let e = 0; e < eventsCount; e++) {
        events.push({
          id: uuid(),
          huntSessionId: session.id,
          timestamp: new Date(startedAt.getTime() - rand(0, 86400000 * 7)),
          severity: pick(SEVERITIES),
          eventId: 'wazuh-' + rand(100000, 999999),
          sourceIp: Math.random() > 0.1 ? randomIp() : null,
          user: pick(EVENT_USERS),
          description: pick(EVENT_DESCRIPTIONS),
        })
      }

      if (events.length > 0) {
        await prisma.huntEvent.createMany({ data: events })
      }

      tenantEvents += eventsCount
      totalSessions++
    }

    totalEvents += tenantEvents
    console.log('  Sessions: ' + sessionCount + ', Events: ' + tenantEvents)
  }

  console.log('\\n=== Summary ===')
  console.log('Total sessions: ' + totalSessions)
  console.log('Total events: ' + totalEvents)

  // Verify counts
  const sessionTotal = await prisma.huntSession.count()
  const eventTotal = await prisma.huntEvent.count()
  console.log('DB hunt_sessions: ' + sessionTotal)
  console.log('DB hunt_events: ' + eventTotal)

  await prisma.\$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
"

if [ $? -eq 0 ]; then
  success "Hunt data seeded successfully!"
else
  fail "Hunt seed failed!"
  exit 1
fi

header "Verification"

cd "$PROJECT_DIR" && node -e "
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verify() {
  const tenants = await prisma.tenant.findMany({
    where: { slug: { in: ['aura-finance', 'aura-health', 'aura-enterprise'] } },
    select: { id: true, slug: true },
  })

  for (const t of tenants) {
    const sessions = await prisma.huntSession.count({ where: { tenantId: t.id } })
    const events = await prisma.huntEvent.count({
      where: { huntSession: { tenantId: t.id } },
    })
    console.log(t.slug + ': ' + sessions + ' sessions, ' + events + ' events')
    if (events < 500) {
      console.error('WARNING: ' + t.slug + ' has < 500 events!')
    }
  }

  await prisma.\$disconnect()
}
verify().catch(e => { console.error(e); process.exit(1) })
"

if [ $? -eq 0 ]; then
  success "Verification complete!"
else
  fail "Verification failed!"
  exit 1
fi
