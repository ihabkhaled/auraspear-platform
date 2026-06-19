#!/bin/bash
# =============================================================================
# AuraSpear SOC — Seed AI Audit Log Data (500+ per tenant)
# =============================================================================
# Seeds: AiAuditLog entries for ai_hunt, ai_investigate, ai_explain actions
# Tenants: aura-finance, aura-health, aura-enterprise
#
# Usage:
#   bash scripts/seed-ai-audit-data.sh
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

header "Seeding AI Audit Log Data (500+ entries per tenant)"

cd "$PROJECT_DIR" && node -e "
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const prisma = new PrismaClient()

const TENANT_SLUGS = ['aura-finance', 'aura-health', 'aura-enterprise']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const uuid = () => crypto.randomUUID()
const daysAgo = (d) => new Date(Date.now() - d * 86400000 - rand(0, 86400) * 1000)

// ─── Actors (emails) ─────────────────────────────────────────────────────────

const ACTORS = [
  'analyst@auraspear.io',
  'hunter@auraspear.io',
  'soc-lead@auraspear.io',
  'admin@auraspear.io',
  'responder@auraspear.io',
  'tier2@auraspear.io',
  'tier3@auraspear.io',
  'incident@auraspear.io',
]

const ACTIONS = ['ai_hunt', 'ai_hunt', 'ai_hunt', 'ai_investigate', 'ai_investigate', 'ai_explain']
const MODELS = [
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-3-haiku-20240307-v1:0',
  'rule-based',
]

// ─── Hunt Prompts ────────────────────────────────────────────────────────────

const HUNT_PROMPTS = [
  'Look for brute force login attempts from external IPs in the last 24 hours',
  'Find evidence of lateral movement using SMB and WMI across internal subnets',
  'Detect DNS tunneling or suspicious TXT record queries to newly registered domains',
  'Hunt for PowerShell encoded commands executed by non-admin users',
  'Search for C2 beacon activity with regular interval outbound connections',
  'Identify privilege escalation attempts via service account abuse',
  'Look for data exfiltration over HTTPS to uncommon destinations',
  'Find evidence of persistence via scheduled tasks or registry Run keys',
  'Detect suspicious process injection using WriteProcessMemory or NtMapViewOfSection',
  'Hunt for credential harvesting tools like Mimikatz or LaZagne',
  'Search for ransomware precursors: shadow copy deletion and mass file renaming',
  'Identify rogue DHCP or ARP spoofing in the corporate network',
  'Look for anomalous SSH login patterns from unexpected geolocations',
  'Detect web shell activity on public-facing web servers',
  'Hunt for supply chain attack indicators in recently updated packages',
  'Search for Kerberoasting or AS-REP roasting activity in Active Directory',
  'Find evidence of NTLM relay attacks in the authentication logs',
  'Detect living-off-the-land binary (LOLBin) execution chains',
  'Hunt for email-based initial access vectors via macro-enabled documents',
  'Look for unusual outbound traffic on non-standard ports from servers',
  'Detect unauthorized VPN connections from new device fingerprints',
  'Search for MFA bypass attempts or session token theft',
  'Hunt for cloud infrastructure reconnaissance via API enumeration',
  'Find evidence of container escape attempts in Kubernetes clusters',
  'Detect insider threat indicators via abnormal data access patterns',
]

// ─── Hunt Responses ──────────────────────────────────────────────────────────

const HUNT_RESPONSES = [
  \`## Threat Hunt Analysis: Brute Force Activity

**Hypothesis:** An external threat actor is conducting credential-based attacks against authentication services.

**Suggested Queries:**
1. \\\`event.id:4625 AND agent.name:dc-01 | stats count by data.srcip\\\` - Group failed logins by source IP
2. \\\`event.id:4625 AND data.srcip:198.51.100.* | timechart span=1m count\\\` - Time distribution
3. \\\`event.id:4624 AND data.srcip:198.51.100.22\\\` - Check for successful logins from attacker IP

**MITRE ATT&CK Coverage:** T1110.001 (Password Guessing), T1110.003 (Password Spraying)

**Recommended Actions:**
- Block source IP 198.51.100.22 at the perimeter firewall
- Enable account lockout policies if not already configured
- Monitor for successful authentications from the same IP range\`,

  \`## Threat Hunt Analysis: Lateral Movement

**Hypothesis:** Compromised credentials are being used for lateral movement via SMB/WMI.

**Suggested Queries:**
1. \\\`event.action:logon AND logon.type:3 AND source.ip:10.0.0.0/8\\\` - Network logons
2. \\\`process.name:wmic.exe AND process.args:*process*call*create*\\\` - WMI process creation
3. \\\`event.action:share_access AND share.name:ADMIN$ OR C$\\\` - Admin share access

**MITRE ATT&CK Coverage:** T1021.002 (SMB/Windows Admin Shares), T1047 (WMI)

**Risk Assessment:**
- 12 unique source IPs performing lateral movement
- 3 service accounts with anomalous login patterns
- Recommend immediate credential rotation\`,

  \`## Threat Hunt Analysis: DNS Tunneling

**Hypothesis:** A compromised host is exfiltrating data via DNS tunneling using encoded subdomain queries.

**Suggested Queries:**
1. \\\`dns.question.name:*.xyz AND dns.question.subdomain.length:>50\\\` - Long subdomain queries
2. \\\`dns.question.type:TXT AND dns.response.data:*==\\\` - Base64 in TXT responses
3. \\\`dns.query.count:>1000 AND agent.name:workstation-*\\\` - High DNS query volume

**MITRE ATT&CK Coverage:** T1071.004 (DNS), T1048 (Exfiltration Over Alternative Protocol)

**Indicators Found:**
- Beaconing detected from workstation-17 (60-second intervals)
- Domain update-service.xyz registered 3 days ago (DGA indicator)
- Average query length 3x above baseline\`,

  \`## Threat Hunt Analysis: PowerShell Abuse

**Hypothesis:** Adversary is using encoded PowerShell commands for defense evasion and execution.

**Suggested Queries:**
1. \\\`process.name:powershell.exe AND process.args:*-enc*\\\` - Encoded commands
2. \\\`process.parent.name:winword.exe AND process.name:powershell.exe\\\` - Office spawning PS
3. \\\`powershell.scriptblock:*IEX*downloadstring*\\\` - Download cradles

**MITRE ATT&CK Coverage:** T1059.001 (PowerShell), T1027 (Obfuscated Files)

**Key Findings:**
- 23 encoded PowerShell executions in the last 12 hours
- 5 originated from Office macro execution
- 2 unique download URLs identified in decoded payloads\`,

  \`## Threat Hunt Analysis: C2 Beacon Detection

**Hypothesis:** A compromised endpoint is communicating with external C2 infrastructure via regular HTTP/S beacons.

**Suggested Queries:**
1. \\\`network.direction:outbound AND destination.port:443 | stats count by source.ip, destination.ip\\\`
2. \\\`network.bytes_out:>100000 AND connection.interval:~60s\\\` - Regular interval connections
3. \\\`destination.geo.country_name:(!US AND !UK AND !DE) AND destination.as.org:*hosting*\\\`

**MITRE ATT&CK Coverage:** T1071 (Application Layer Protocol), T1573 (Encrypted Channel)

**Risk Assessment:**
- 2 endpoints showing beaconing behavior (60s ± 5s jitter)
- Destination IPs hosted on known bulletproof hosting providers
- Recommend network isolation pending investigation\`,
]

// ─── Investigate Prompts ─────────────────────────────────────────────────────

const INVESTIGATE_PROMPTS = [
  'alert-001-brute-force-ssh',
  'alert-002-malware-detected',
  'alert-003-privilege-escalation',
  'alert-004-data-exfiltration',
  'alert-005-ransomware-indicator',
  'alert-006-phishing-email',
  'alert-007-suspicious-process',
  'alert-008-network-scan',
  'alert-009-credential-dump',
  'alert-010-web-shell-detected',
]

const INVESTIGATE_RESPONSES = [
  \`## AI Investigation Report

**Verdict:** True Positive (Confidence: 87%)

**Summary:**
Brute force SSH attack detected from IP 203.0.113.45. 847 failed login attempts in 15 minutes followed by successful authentication. Post-exploitation activity includes privilege escalation via sudo misconfiguration.

**Key Findings:**
1. Source IP 203.0.113.45 — known scanner (Shodan/Censys)
2. Target: root account on production server web-prod-03
3. Successful auth at 14:23:07 UTC after 847 failures
4. Post-auth: sudo privilege escalation within 30 seconds
5. Outbound connection to 45.33.32.156:4444 (reverse shell)

**Risk Assessment:**
- Immediate Risk: CRITICAL
- Lateral Movement: HIGH — root access obtained
- Data Exposure: HIGH — database credentials in environment variables

**Recommended Actions:**
1. Isolate web-prod-03 immediately
2. Rotate all credentials on the compromised host
3. Block 203.0.113.45 and 45.33.32.156 at perimeter
4. Forensic image of the affected system
5. Review all SSH access logs for the past 30 days\`,

  \`## AI Investigation Report

**Verdict:** Suspicious — Requires Further Investigation (Confidence: 72%)

**Summary:**
Endpoint detection triggered on process certutil.exe downloading a remote payload. The file was written to the user's temp directory and subsequently executed. Behavior is consistent with a download cradle technique.

**Key Findings:**
1. certutil.exe used with -urlcache -split -f flags
2. Downloaded file: update-service.exe (SHA256: a1b2c3d4...)
3. File executed 12 seconds after download
4. Parent process: cmd.exe spawned from explorer.exe
5. No prior history of certutil usage on this endpoint

**MITRE ATT&CK Mapping:**
- T1105 — Ingress Tool Transfer
- T1059.003 — Windows Command Shell
- T1204 — User Execution

**Recommended Actions:**
1. Quarantine the downloaded executable
2. Submit SHA256 hash to VirusTotal and internal sandbox
3. Interview the user about recent email attachments or downloads
4. Check for persistence mechanisms created by the executable\`,
]

// ─── Explain Prompts ─────────────────────────────────────────────────────────

const EXPLAIN_PROMPTS = [
  'Explain MITRE ATT&CK technique T1059.001 PowerShell',
  'What is a golden ticket attack in Active Directory?',
  'Explain the difference between IDS and IPS',
  'What is MITRE T1110 Brute Force and how to detect it?',
  'Explain DNS over HTTPS (DoH) security implications',
  'What is a SIEM and how does it correlate events?',
  'Explain the concept of lateral movement in cybersecurity',
  'What are indicators of compromise (IOCs) vs indicators of attack (IOAs)?',
  'Explain Kerberoasting and how to defend against it',
  'What is the MITRE ATT&CK framework and why is it important?',
  'Explain zero-day vulnerabilities and responsible disclosure',
  'What is a supply chain attack and recent examples?',
  'Explain the concept of defense in depth',
  'What is endpoint detection and response (EDR)?',
  'Explain the OWASP Top 10 web application security risks',
]

const EXPLAIN_RESPONSES = [
  \`## Explainable AI Analysis

**Topic:** PowerShell Abuse (T1059.001)

**Explanation:**
PowerShell is a legitimate system administration tool that adversaries frequently abuse for execution, defense evasion, and data collection. It provides direct access to .NET framework, WMI, and COM objects.

**Detection Strategies:**
1. Monitor for encoded commands (-enc, -EncodedCommand flags)
2. Enable PowerShell Script Block Logging (Event ID 4104)
3. Track PowerShell processes spawned from unusual parents (Office apps, browsers)
4. Alert on download cradles (IEX, Invoke-WebRequest, DownloadString)

**MITRE ATT&CK Context:**
- Tactic: Execution
- Sub-techniques: T1059.001
- Common in: APT29, FIN7, Lazarus Group campaigns

**Remediation:**
- Enable Constrained Language Mode where possible
- Implement Application Control (WDAC/AppLocker)
- Monitor PowerShell transcription logs centrally\`,

  \`## Explainable AI Analysis

**Topic:** Golden Ticket Attack

**Explanation:**
A Golden Ticket attack occurs when an adversary compromises the KRBTGT account hash in Active Directory. With this hash, they can forge Ticket Granting Tickets (TGTs) for any account, effectively giving them unrestricted access to any resource in the domain.

**How It Works:**
1. Attacker obtains KRBTGT password hash (via DCSync, ntds.dit extraction)
2. Uses tools like Mimikatz to forge a TGT with arbitrary privileges
3. The forged ticket is valid for the default 10-year TGT lifetime
4. Can impersonate any user, including Domain Admins

**Detection:**
- Monitor for TGT requests with abnormally long lifetimes
- Detect KRBTGT password hash extraction attempts
- Alert on Event IDs 4768/4769 with anomalous ticket options
- Compare ticket encryption types against domain policy

**Remediation:**
- Rotate KRBTGT password twice (immediately + after replication)
- Implement Privileged Access Workstations (PAWs)
- Enable Advanced Audit Policy for Kerberos events\`,
]

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

  let totalRecords = 0

  for (const tenant of tenants) {
    console.log('\\nSeeding AI audit data for: ' + tenant.slug)

    const records = []
    const targetCount = rand(500, 600)

    for (let i = 0; i < targetCount; i++) {
      const action = pick(ACTIONS)
      const model = pick(MODELS)
      const actor = pick(ACTORS)
      const createdAt = daysAgo(rand(0, 60))

      let prompt, response, inputTokens, outputTokens, durationMs

      if (action === 'ai_hunt') {
        prompt = pick(HUNT_PROMPTS)
        response = pick(HUNT_RESPONSES)
        inputTokens = rand(200, 1200)
        outputTokens = rand(400, 2000)
        durationMs = model === 'rule-based' ? rand(50, 300) : rand(800, 4500)
      } else if (action === 'ai_investigate') {
        prompt = pick(INVESTIGATE_PROMPTS)
        response = pick(INVESTIGATE_RESPONSES)
        inputTokens = rand(500, 2000)
        outputTokens = rand(600, 2500)
        durationMs = model === 'rule-based' ? rand(100, 500) : rand(1200, 6000)
      } else {
        prompt = pick(EXPLAIN_PROMPTS)
        response = pick(EXPLAIN_RESPONSES)
        inputTokens = rand(100, 900)
        outputTokens = rand(300, 1800)
        durationMs = model === 'rule-based' ? rand(50, 200) : rand(600, 3000)
      }

      // If rule-based, tokens are 0
      if (model === 'rule-based') {
        inputTokens = 0
        outputTokens = 0
      }

      records.push({
        id: uuid(),
        tenantId: tenant.id,
        actor,
        action,
        model,
        inputTokens,
        outputTokens,
        prompt,
        response,
        durationMs,
        createdAt,
      })
    }

    // Batch insert in chunks of 100
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100)
      await prisma.aiAuditLog.createMany({ data: chunk })
    }

    totalRecords += records.length
    console.log('  Records: ' + records.length)
  }

  console.log('\\n=== Summary ===')
  console.log('Total AI audit records: ' + totalRecords)

  // Verify counts
  const dbTotal = await prisma.aiAuditLog.count()
  console.log('DB ai_audit_logs: ' + dbTotal)

  // Per-tenant breakdown
  for (const tenant of tenants) {
    const count = await prisma.aiAuditLog.count({ where: { tenantId: tenant.id } })
    const byAction = await prisma.\$queryRawUnsafe(
      'SELECT action, COUNT(*)::int as count FROM ai_audit_logs WHERE tenant_id = \$1 GROUP BY action ORDER BY action',
      tenant.id
    )
    console.log(tenant.slug + ': ' + count + ' records — ' + JSON.stringify(byAction))
  }

  await prisma.\$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
"

if [ $? -eq 0 ]; then
  success "AI audit data seeded successfully!"
else
  fail "AI audit seed failed!"
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
    const count = await prisma.aiAuditLog.count({ where: { tenantId: t.id } })
    console.log(t.slug + ': ' + count + ' AI audit records')
    if (count < 500) {
      console.error('WARNING: ' + t.slug + ' has < 500 records!')
    }
  }

  // Sample a few records
  const sample = await prisma.aiAuditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { action: true, model: true, actor: true, inputTokens: true, outputTokens: true, durationMs: true },
  })
  console.log('\\nSample record:', JSON.stringify(sample, null, 2))

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
