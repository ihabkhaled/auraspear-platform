#!/bin/bash
# =============================================================================
# AuraSpear SOC — Seed All Explorer DB Tables (100-200 per tenant)
# =============================================================================
# Seeds: GrafanaDashboard, VelociraptorEndpoint, VelociraptorHunt,
#         ShuffleWorkflow, LogstashPipelineLog
# Tenants: aura-finance, aura-health, aura-enterprise
#
# Usage:
#   bash scripts/seed-explorer-data.sh
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

header "Seeding All Explorer Data (5 tables x 3 tenants)"

cd "$PROJECT_DIR" && node -e "
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const prisma = new PrismaClient()

const TENANT_SLUGS = ['aura-finance', 'aura-health', 'aura-enterprise']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const uuid = () => crypto.randomUUID()
const daysAgo = (d) => new Date(Date.now() - d * 86400000 - rand(0, 86400) * 1000)

// ─── Grafana Dashboards ──────────────────────────────────────────────────────

const GRAFANA_TITLES = [
  'SOC Overview', 'Network Traffic Analysis', 'Endpoint Health Monitor',
  'Threat Intelligence Feed', 'Incident Response Timeline', 'SIEM Event Correlator',
  'Firewall Rule Audit', 'VPN Connection Stats', 'DNS Query Analytics',
  'Malware Detection Rate', 'Authentication Failures', 'API Gateway Metrics',
  'Container Security', 'Cloud Resource Usage', 'Database Performance',
  'SSL Certificate Monitor', 'IDS/IPS Alert Summary', 'Compliance Dashboard',
  'User Activity Tracker', 'Vulnerability Scanner Results', 'Patch Management Status',
  'Email Security Gateway', 'Web Application Firewall', 'DLP Policy Violations',
  'Privileged Access Monitor', 'Backup Status Overview', 'Log Ingestion Rate',
  'Alert Fatigue Analysis', 'SOAR Playbook Metrics', 'Dark Web Monitoring',
  'Phishing Campaign Tracker', 'Ransomware Indicators', 'Zero Trust Scorecard',
  'Asset Inventory Dashboard', 'Risk Heat Map', 'Third-Party Risk Assessment',
  'Security Awareness Training', 'Incident SLA Tracker', 'Change Management Audit',
  'Data Classification Overview',
]

const GRAFANA_FOLDERS = [
  'SOC', 'Infrastructure', 'Compliance', 'Threat Intel', 'Network',
  'Endpoints', 'Cloud', 'Applications', 'General', null,
]

const GRAFANA_TAGS_POOL = [
  'production', 'staging', 'critical', 'monitoring', 'security',
  'network', 'compliance', 'performance', 'alerting', 'soc',
  'incident-response', 'threat-hunting', 'vulnerability', 'audit',
]

async function seedGrafanaDashboards(tenantId, slug) {
  const count = rand(120, 180)
  const records = []

  for (let i = 0; i < count; i++) {
    const uid = slug + '-dash-' + String(i).padStart(4, '0')
    const tagCount = rand(0, 4)
    const tags = []
    for (let t = 0; t < tagCount; t++) {
      const tag = pick(GRAFANA_TAGS_POOL)
      if (!tags.includes(tag)) tags.push(tag)
    }

    records.push({
      id: uuid(),
      tenantId,
      uid,
      title: pick(GRAFANA_TITLES) + ' ' + (i + 1),
      folderTitle: pick(GRAFANA_FOLDERS),
      url: '/d/' + uid + '/' + slug + '-dashboard-' + i,
      tags,
      type: i % 15 === 0 ? 'dash-folder' : 'dash-db',
      isStarred: Math.random() < 0.2,
      syncedAt: daysAgo(rand(0, 5)),
    })
  }

  // Batch insert
  const CHUNK = 50
  let inserted = 0
  for (let c = 0; c < records.length; c += CHUNK) {
    const chunk = records.slice(c, c + CHUNK)
    const result = await prisma.grafanaDashboard.createMany({ data: chunk, skipDuplicates: true })
    inserted += result.count
  }
  return inserted
}

// ─── Velociraptor Endpoints ──────────────────────────────────────────────────

const HOSTNAMES_PREFIX = [
  'dc', 'ws', 'srv', 'db', 'web', 'app', 'mail', 'fw', 'vpn', 'proxy',
  'monitor', 'backup', 'ci', 'dev', 'staging', 'prod', 'edge', 'node',
  'kube', 'docker', 'nas', 'san', 'lb', 'dns', 'ntp',
]

const OS_LIST = ['Windows 10', 'Windows 11', 'Windows Server 2022', 'Ubuntu 22.04', 'Ubuntu 24.04',
  'CentOS 8', 'RHEL 9', 'Debian 12', 'macOS Sonoma', 'macOS Ventura']

const LABELS_POOL = ['production', 'staging', 'development', 'critical', 'dmz',
  'internal', 'external', 'pci-scope', 'hipaa', 'soc2', 'monitored']

async function seedVelociraptorEndpoints(tenantId, slug) {
  const count = rand(100, 160)
  const records = []

  for (let i = 0; i < count; i++) {
    const prefix = pick(HOSTNAMES_PREFIX)
    const hostname = prefix + '-' + slug.replace('aura-', '') + '-' + String(i).padStart(3, '0')
    const clientId = 'C.' + crypto.randomBytes(8).toString('hex')
    const os = pick(OS_LIST)
    const labelCount = rand(0, 3)
    const labels = []
    for (let l = 0; l < labelCount; l++) {
      const label = pick(LABELS_POOL)
      if (!labels.includes(label)) labels.push(label)
    }

    records.push({
      id: uuid(),
      tenantId,
      clientId,
      hostname,
      os: os.split(' ')[0],
      osVersion: os,
      lastSeenAt: daysAgo(rand(0, 14)),
      labels,
      ipAddress: '10.' + rand(0, 255) + '.' + rand(0, 255) + '.' + rand(1, 254),
      syncedAt: daysAgo(rand(0, 3)),
    })
  }

  const CHUNK = 50
  let inserted = 0
  for (let c = 0; c < records.length; c += CHUNK) {
    const result = await prisma.velociraptorEndpoint.createMany({ data: records.slice(c, c + CHUNK), skipDuplicates: true })
    inserted += result.count
  }
  return inserted
}

// ─── Velociraptor Hunts ──────────────────────────────────────────────────────

const HUNT_DESCRIPTIONS = [
  'Collect Windows Event Logs from all endpoints',
  'Search for IOC file hashes across the fleet',
  'Memory forensics scan for fileless malware',
  'Registry persistence mechanism enumeration',
  'Scheduled task analysis for suspicious entries',
  'DNS cache collection for C2 detection',
  'Browser history analysis for phishing indicators',
  'USB device connection history audit',
  'PowerShell script block logging collection',
  'Network connection enumeration for lateral movement',
  'Autoruns analysis for persistence mechanisms',
  'Process memory strings extraction',
  'Windows Defender exclusion audit',
  'SSH key inventory across Linux endpoints',
  'Crontab analysis for suspicious jobs',
  'SUID binary enumeration on Linux hosts',
  'Docker container security audit',
  'Certificate store analysis',
  'WMI subscription persistence check',
  'Prefetch file analysis for execution evidence',
]

const HUNT_STATES = ['RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED', 'COMPLETED', 'COMPLETED']

const ARTIFACTS = [
  'Windows.System.Pslist', 'Windows.EventLogs.Evtx', 'Windows.Registry.NTUser',
  'Windows.System.Services', 'Linux.Sys.Users', 'Windows.Forensics.Prefetch',
  'Windows.Network.Netstat', 'Generic.Client.Info', 'Windows.System.Amcache',
  'Linux.Sys.Crontab', 'Windows.System.TaskScheduler', 'Windows.Forensics.SRUM',
]

async function seedVelociraptorHunts(tenantId, slug) {
  const count = rand(100, 150)
  const records = []

  for (let i = 0; i < count; i++) {
    const huntId = 'H.' + crypto.randomBytes(4).toString('hex')
    const state = pick(HUNT_STATES)
    const totalClients = rand(10, 500)
    const finishedClients = state === 'COMPLETED' ? totalClients : rand(0, totalClients)
    const artifactCount = rand(1, 4)
    const artifacts = []
    for (let a = 0; a < artifactCount; a++) {
      const art = pick(ARTIFACTS)
      if (!artifacts.includes(art)) artifacts.push(art)
    }

    records.push({
      id: uuid(),
      tenantId,
      huntId,
      description: pick(HUNT_DESCRIPTIONS),
      creator: pick(['admin', 'soc-analyst', 'threat-hunter', 'automation']),
      state,
      artifacts,
      totalClients,
      finishedClients,
      startedAt: daysAgo(rand(0, 30)),
      syncedAt: daysAgo(rand(0, 3)),
    })
  }

  const CHUNK = 50
  let inserted = 0
  for (let c = 0; c < records.length; c += CHUNK) {
    const result = await prisma.velociraptorHunt.createMany({ data: records.slice(c, c + CHUNK), skipDuplicates: true })
    inserted += result.count
  }
  return inserted
}

// ─── Shuffle Workflows ──────────────────────────────────────────────────────

const WORKFLOW_NAMES = [
  'Alert Enrichment Pipeline', 'Phishing Email Analysis', 'IOC Extraction & Lookup',
  'Incident Auto-Triage', 'Malware Sandbox Submission', 'Threat Intel Feed Ingestion',
  'Vulnerability Scan Trigger', 'Case Creation from Alert', 'Email Notification Dispatcher',
  'Slack Alert Forwarder', 'SIEM Log Forwarding', 'Endpoint Isolation Workflow',
  'User Account Lockout', 'Password Reset Automation', 'Firewall Rule Update',
  'DNS Sinkhole Management', 'Certificate Renewal Check', 'Compliance Report Generator',
  'Backup Verification', 'Asset Discovery Scan', 'Decommission Workflow',
  'Onboarding Security Check', 'Access Review Automation', 'Data Loss Prevention Alert',
  'Cloud Security Posture Check', 'Container Image Scan', 'API Key Rotation',
  'Log Retention Policy Enforcer', 'Darknet Monitoring Alert', 'Brand Protection Scanner',
  'Third-Party Risk Assessment', 'Insider Threat Detection', 'Geo-fence Alert Handler',
  'MFA Enforcement Check', 'Privileged Session Recording', 'Network Segmentation Audit',
  'WAF Rule Tuning', 'Bot Detection Response', 'Rate Limiting Enforcer',
  'Crypto Mining Detection',
]

const WORKFLOW_TAGS_POOL = [
  'alerting', 'automation', 'enrichment', 'response', 'notification',
  'compliance', 'scanning', 'forensics', 'integration', 'monitoring',
  'triage', 'remediation', 'threat-intel', 'soc',
]

async function seedShuffleWorkflows(tenantId, slug) {
  const count = rand(100, 150)
  const records = []

  for (let i = 0; i < count; i++) {
    const workflowId = slug + '-wf-' + crypto.randomBytes(6).toString('hex')
    const tagCount = rand(0, 4)
    const tags = []
    for (let t = 0; t < tagCount; t++) {
      const tag = pick(WORKFLOW_TAGS_POOL)
      if (!tags.includes(tag)) tags.push(tag)
    }

    records.push({
      id: uuid(),
      tenantId,
      workflowId,
      name: pick(WORKFLOW_NAMES) + (i > WORKFLOW_NAMES.length ? ' v' + rand(2, 5) : ''),
      description: 'Automated workflow for ' + pick(WORKFLOW_NAMES).toLowerCase() + ' operations',
      isValid: Math.random() < 0.75,
      triggerCount: rand(0, 5000),
      tags,
      syncedAt: daysAgo(rand(0, 5)),
    })
  }

  const CHUNK = 50
  let inserted = 0
  for (let c = 0; c < records.length; c += CHUNK) {
    const result = await prisma.shuffleWorkflow.createMany({ data: records.slice(c, c + CHUNK), skipDuplicates: true })
    inserted += result.count
  }
  return inserted
}

// ─── Logstash Pipeline Logs ─────────────────────────────────────────────────

const PIPELINES = [
  'main', 'syslog-input', 'beats-input', 'http-input', 'filebeat-pipeline',
  'winlogbeat-pipeline', 'metricbeat-pipeline', 'auditbeat-pipeline',
  'packetbeat-pipeline', 'heartbeat-pipeline',
]

const SOURCES = ['logstash-node-01', 'logstash-node-02', 'logstash-node-03', 'logstash-cluster', 'logstash-edge-01']

const LOG_MESSAGES = {
  info: [
    'Pipeline processing events normally', 'Filter plugin grok matched pattern',
    'Output to Elasticsearch successful', 'Input received batch of events',
    'Worker thread processing events', 'Queue depth within limits',
    'Connection to output host established', 'Pipeline reloaded configuration',
    'GeoIP lookup completed for batch', 'Date filter parsed timestamp',
    'Event routing to conditional output', 'JSON parse completed for incoming events',
    'Elasticsearch bulk indexing completed', 'Pipeline warm-up complete',
  ],
  warn: [
    'Slow pipeline detected, throughput below threshold', 'Backpressure detected from output',
    'Memory pressure detected, slowing intake', 'Queue approaching capacity limit',
    'Retry attempt for failed batch', 'Input buffer utilization above 80%',
    'Stale connection detected, reconnecting', 'Pipeline throughput degraded',
  ],
  error: [
    'Failed to connect to output, retrying', 'Dead letter queue entry created',
    'Elasticsearch bulk request rejected', 'Pipeline crash detected, restarting worker',
    'Malformed event dropped from pipeline', 'TLS handshake failed with output host',
    'Out of memory in filter stage', 'Grok pattern match timeout exceeded',
  ],
  debug: [
    'Detailed event trace for debugging', 'Plugin configuration dump',
    'Thread pool state snapshot', 'Internal queue metrics collected',
    'Codec decode timing captured',
  ],
}

function weightedLevel() {
  const r = Math.random()
  if (r < 0.55) return 'info'
  if (r < 0.78) return 'warn'
  if (r < 0.93) return 'error'
  return 'debug'
}

async function seedLogstashLogs(tenantId, slug) {
  const count = rand(150, 200)
  const records = []

  for (let i = 0; i < count; i++) {
    const level = weightedLevel()
    const eventsIn = rand(100, 5000)

    records.push({
      tenantId,
      pipelineId: pick(PIPELINES),
      timestamp: daysAgo(rand(0, 29)),
      level,
      message: pick(LOG_MESSAGES[level]) + ' [batch ' + (i + 1) + ']',
      source: pick(SOURCES),
      eventsIn,
      eventsOut: Math.max(0, eventsIn - rand(0, 50)),
      eventsFiltered: rand(0, 200),
      durationMs: level === 'error' ? rand(2000, 10000) : rand(10, 3000),
      metadata: { batchId: i + 1, tenant: slug },
      syncedAt: new Date(),
    })
  }

  const CHUNK = 50
  let inserted = 0
  for (let c = 0; c < records.length; c += CHUNK) {
    const result = await prisma.logstashPipelineLog.createMany({ data: records.slice(c, c + CHUNK), skipDuplicates: true })
    inserted += result.count
  }
  return inserted
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
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

  const results = {}

  for (const tenant of tenants) {
    console.log('')
    console.log('Seeding ' + tenant.name + ' (' + tenant.slug + ')...')

    const grafana = await seedGrafanaDashboards(tenant.id, tenant.slug)
    console.log('  [OK] Grafana dashboards: ' + grafana)

    const endpoints = await seedVelociraptorEndpoints(tenant.id, tenant.slug)
    console.log('  [OK] Velociraptor endpoints: ' + endpoints)

    const hunts = await seedVelociraptorHunts(tenant.id, tenant.slug)
    console.log('  [OK] Velociraptor hunts: ' + hunts)

    const shuffle = await seedShuffleWorkflows(tenant.id, tenant.slug)
    console.log('  [OK] Shuffle workflows: ' + shuffle)

    const logstash = await seedLogstashLogs(tenant.id, tenant.slug)
    console.log('  [OK] Logstash pipeline logs: ' + logstash)

    results[tenant.slug] = { grafana, endpoints, hunts, shuffle, logstash }
  }

  // ─── Verification ──────────────────────────────────────────────────────────

  console.log('')
  console.log('━━━ Verification ━━━')

  for (const tenant of tenants) {
    const grafanaCount = await prisma.grafanaDashboard.count({ where: { tenantId: tenant.id } })
    const endpointCount = await prisma.velociraptorEndpoint.count({ where: { tenantId: tenant.id } })
    const huntCount = await prisma.velociraptorHunt.count({ where: { tenantId: tenant.id } })
    const shuffleCount = await prisma.shuffleWorkflow.count({ where: { tenantId: tenant.id } })
    const logstashCount = await prisma.logstashPipelineLog.count({ where: { tenantId: tenant.id } })

    console.log('')
    console.log(tenant.name + ' (' + tenant.slug + '):')
    console.log('  Grafana dashboards:      ' + grafanaCount)
    console.log('  Velociraptor endpoints:   ' + endpointCount)
    console.log('  Velociraptor hunts:       ' + huntCount)
    console.log('  Shuffle workflows:        ' + shuffleCount)
    console.log('  Logstash pipeline logs:   ' + logstashCount)

    const total = grafanaCount + endpointCount + huntCount + shuffleCount + logstashCount
    console.log('  TOTAL:                    ' + total)

    // Validate minimums
    if (grafanaCount < 100) console.log('  [WARN] Grafana below 100!')
    if (endpointCount < 100) console.log('  [WARN] Endpoints below 100!')
    if (huntCount < 100) console.log('  [WARN] Hunts below 100!')
    if (shuffleCount < 100) console.log('  [WARN] Shuffle below 100!')
    if (logstashCount < 100) console.log('  [WARN] Logstash below 100!')
  }

  const grandTotals = {
    grafana: await prisma.grafanaDashboard.count(),
    endpoints: await prisma.velociraptorEndpoint.count(),
    hunts: await prisma.velociraptorHunt.count(),
    shuffle: await prisma.shuffleWorkflow.count(),
    logstash: await prisma.logstashPipelineLog.count(),
  }

  const grand = Object.values(grandTotals).reduce((a, b) => a + b, 0)
  console.log('')
  console.log('━━━ Grand Totals ━━━')
  console.log('  Grafana dashboards:      ' + grandTotals.grafana)
  console.log('  Velociraptor endpoints:   ' + grandTotals.endpoints)
  console.log('  Velociraptor hunts:       ' + grandTotals.hunts)
  console.log('  Shuffle workflows:        ' + grandTotals.shuffle)
  console.log('  Logstash pipeline logs:   ' + grandTotals.logstash)
  console.log('  GRAND TOTAL:              ' + grand)

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
  success "All explorer data seeded successfully!"
else
  fail "Failed to seed explorer data"
  exit 1
fi

echo ""
success "Explorer seed complete!"
