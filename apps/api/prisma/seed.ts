import { PrismaPg } from '@prisma/adapter-pg'
import {
  Prisma,
  PrismaClient,
  UserRole,
  ConnectorType,
  AuthType,
  IncidentSeverity,
  IncidentStatus,
  IncidentCategory,
  IncidentActorType,
  RuleSource,
  RuleSeverity,
  RuleStatus,
  VulnerabilitySeverity,
  PatchStatus,
  AiAgentTier,
  AiAgentStatus,
  AiAgentSessionStatus,
  UebaEntityType,
  UebaRiskLevel,
  MlModelType,
  MlModelStatus,
  AttackPathSeverity,
  AttackPathStatus,
  SoarPlaybookStatus,
  SoarTriggerType,
  SoarExecutionStatus,
  ComplianceStandard,
  ComplianceControlStatus,
  DashboardDensity,
  DashboardPanelKey,
  UserSessionClientType,
  UserSessionOsFamily,
  UserSessionStatus,
  ReportType,
  ReportFormat,
  ReportModule,
  ReportStatus,
  ReportTemplateKey,
  ServiceType,
  ServiceStatus,
  MetricType,
  NormalizationSourceType,
  NormalizationPipelineStatus,
  DetectionRuleType,
  DetectionRuleSeverity,
  DetectionRuleStatus,
  CloudProvider,
  CloudAccountStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
  type AlertSeverity,
  type AlertStatus,
  type CaseCycleStatus,
  type CaseSeverity,
  type CaseStatus,
  type HuntSessionStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import {
  DEFAULT_PERMISSIONS,
  CONFIGURABLE_ROLES,
} from '../src/modules/role-settings/constants/default-permissions'
import { PERMISSION_DEFINITIONS } from '../src/modules/role-settings/constants/permission-definitions'
import { createHash, randomUUID } from 'node:crypto'
import pino from 'pino'
import { encrypt } from '../src/common/utils/encryption.utility'
import {
  addDuration,
  getYear,
  nowDate,
  subtractDuration,
  toIso,
} from '../src/common/utils/date-time.utility'

const logger = pino({
  transport: { target: 'pino-pretty' },
  level: 'info',
})

const adapter = new PrismaPg(process.env['DATABASE_URL'] ?? '')
const prisma = new PrismaClient({ adapter })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} environment variable is required. Set a strong password (12+ chars) before seeding.`
    )
  }
  return value
}

const DEFAULT_PASSWORD: string = requireEnv('SEED_DEFAULT_PASSWORD')
const BCRYPT_ROUNDS = 12
const DEFAULT_DASHBOARD_DENSITY = DashboardDensity.comfortable
const DEFAULT_COLLAPSED_DASHBOARD_PANELS = [
  DashboardPanelKey.mitre_techniques,
  DashboardPanelKey.targeted_assets,
]

function buildDeterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex')

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function buildDeterministicJtiHash(seed: string): string {
  return createHash('sha256').update(seed).digest('hex')
}

async function seedUserSession(
  userId: string,
  tenantId: string,
  userKey: string,
  sessionKey: string,
  osFamily: UserSessionOsFamily,
  clientType: UserSessionClientType,
  ipAddress: string,
  userAgent: string,
  lastLoginAt: Date,
  lastSeenAt: Date
): Promise<void> {
  const familyId = buildDeterministicUuid(`family:${tenantId}:${userId}:${sessionKey}`)
  const currentAccessJti = buildDeterministicUuid(`access:${tenantId}:${userKey}:${sessionKey}`)
  const currentAccessExpiresAt = addDuration(lastSeenAt, 15, 'minute')
  const refreshExpiresAt = addDuration(lastLoginAt, 7, 'day')
  const jtiHash = buildDeterministicJtiHash(`rotation:${tenantId}:${userKey}:${sessionKey}`)

  await prisma.refreshTokenFamily.upsert({
    where: { id: familyId },
    update: {
      userId,
      tenantId,
      currentGeneration: 0,
      status: 'active',
      revokedAt: null,
      revokedReason: null,
      expiresAt: refreshExpiresAt,
    },
    create: {
      id: familyId,
      userId,
      tenantId,
      currentGeneration: 0,
      expiresAt: refreshExpiresAt,
    },
  })

  await prisma.refreshTokenRotation.upsert({
    where: {
      familyId_generation: {
        familyId,
        generation: 0,
      },
    },
    update: {
      jtiHash,
      status: 'active',
      expiresAt: refreshExpiresAt,
      usedAt: null,
      replacedAt: null,
      replayedAt: null,
    },
    create: {
      familyId,
      generation: 0,
      jtiHash,
      expiresAt: refreshExpiresAt,
    },
  })

  await prisma.userSession.upsert({
    where: { familyId },
    update: {
      userId,
      tenantId,
      status: UserSessionStatus.active,
      osFamily,
      clientType,
      ipAddress,
      userAgent,
      currentAccessJti,
      currentAccessExpiresAt,
      lastLoginAt,
      lastSeenAt,
      revokedAt: null,
      revokedByUserId: null,
      revokeReason: null,
    },
    create: {
      familyId,
      userId,
      tenantId,
      status: UserSessionStatus.active,
      osFamily,
      clientType,
      ipAddress,
      userAgent,
      currentAccessJti,
      currentAccessExpiresAt,
      lastLoginAt,
      lastSeenAt,
    },
  })
}

// Connector credentials — read from environment variables with obviously-fake fallbacks.
// In production, always set real values via environment variables.
const SEED_WAZUH_PASSWORD = process.env['SEED_WAZUH_PASSWORD'] ?? 'CHANGE_ME_NOT_A_REAL_PASSWORD'
const SEED_WAZUH_INDEXER_PASSWORD =
  process.env['SEED_WAZUH_INDEXER_PASSWORD'] ?? 'CHANGE_ME_NOT_A_REAL_PASSWORD'
const SEED_GRAYLOG_PASSWORD =
  process.env['SEED_GRAYLOG_PASSWORD'] ?? 'CHANGE_ME_NOT_A_REAL_PASSWORD'
const SEED_VELOCIRAPTOR_PASSWORD =
  process.env['SEED_VELOCIRAPTOR_PASSWORD'] ?? 'CHANGE_ME_NOT_A_REAL_PASSWORD'
const SEED_GRAFANA_API_KEY = process.env['SEED_GRAFANA_API_KEY'] ?? 'CHANGE_ME_NOT_A_REAL_API_KEY'
const SEED_INFLUXDB_TOKEN = process.env['SEED_INFLUXDB_TOKEN'] ?? 'CHANGE_ME_NOT_A_REAL_TOKEN'
const SEED_MISP_AUTH_KEY = process.env['SEED_MISP_AUTH_KEY'] ?? 'CHANGE_ME_NOT_A_REAL_API_KEY'
const SEED_SHUFFLE_API_KEY = process.env['SEED_SHUFFLE_API_KEY'] ?? 'CHANGE_ME_NOT_A_REAL_API_KEY'

// Global case counter to ensure unique case numbers across tenants
let globalCaseCounter = 0

// ─── Tenant profiles ────────────────────────────────────────────
// Each tenant gets a different "personality" for its seed data

interface ConnectorSeed {
  type: ConnectorType
  name: string
  authType: AuthType
  enabled: boolean
  config: Record<string, unknown>
}

interface TenantProfile {
  id: string
  name: string
  slug: string
  alertCount: number
  alertStatusWeights: AlertStatus[]
  alertTemplateIndices: number[]
  agentPool: string[]
  caseTemplateIndices: number[]
  huntQueryIndices: number[]
  huntSessionStatuses: HuntSessionStatus[]
  iocIndices: number[]
  mispEventIndices: number[]
  connectors: ConnectorSeed[]
}

// ─── Connector configs matching docker-compose.connectors.yml ──
// All connectors share the same real configs so every tenant can
// query the local Docker stack.  Credentials come from SEED_* env vars.

const CONNECTOR_SEEDS: ConnectorSeed[] = [
  {
    type: ConnectorType.wazuh,
    name: 'Wazuh Manager',
    authType: AuthType.basic,
    enabled: true,
    config: {
      baseUrl: 'https://localhost:55000',
      indexerUrl: 'https://localhost:9200',
      username: 'wazuh-wui',
      password: SEED_WAZUH_PASSWORD,
      indexerUsername: 'admin',
      indexerPassword: SEED_WAZUH_INDEXER_PASSWORD,
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.graylog,
    name: 'Graylog SIEM',
    authType: AuthType.basic,
    enabled: true,
    config: {
      baseUrl: 'http://localhost:9000',
      username: 'admin',
      password: SEED_GRAYLOG_PASSWORD,
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.velociraptor,
    name: 'Velociraptor EDR',
    authType: AuthType.api_key,
    enabled: false,
    config: {
      baseUrl: 'https://localhost:8889',
      apiUrl: 'https://localhost:8001',
      username: 'admin',
      password: SEED_VELOCIRAPTOR_PASSWORD,
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.grafana,
    name: 'Grafana',
    authType: AuthType.api_key,
    enabled: true,
    config: {
      baseUrl: 'http://localhost:3001',
      apiKey: SEED_GRAFANA_API_KEY,
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.influxdb,
    name: 'InfluxDB',
    authType: AuthType.token,
    enabled: true,
    config: {
      baseUrl: 'http://localhost:8086',
      token: SEED_INFLUXDB_TOKEN,
      org: 'auraspear',
      bucket: 'soc-metrics',
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.misp,
    name: 'MISP Threat Intel',
    authType: AuthType.api_key,
    enabled: true,
    config: {
      baseUrl: 'https://localhost:8443',
      mispUrl: 'https://localhost:8443',
      mispAuthKey: SEED_MISP_AUTH_KEY,
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.shuffle,
    name: 'Shuffle SOAR',
    authType: AuthType.api_key,
    enabled: true,
    config: {
      baseUrl: 'http://localhost:3443',
      apiKey: SEED_SHUFFLE_API_KEY,
      verifyTls: false,
    },
  },
  {
    type: ConnectorType.bedrock,
    name: 'AWS Bedrock AI',
    authType: AuthType.iam,
    enabled: true,
    config: {
      region: 'us-east-1',
      modelId: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      nlHuntingEnabled: true,
      explainableAiEnabled: true,
      auditLoggingEnabled: true,
    },
  },
]

// Deterministic UUIDs for idempotent seeding (generated once, hardcoded)
const TENANT_PROFILES: TenantProfile[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    name: 'Aura Finance',
    slug: 'aura-finance',
    alertCount: 32,
    alertStatusWeights: [
      'new_alert',
      'new_alert',
      'acknowledged',
      'acknowledged',
      'in_progress',
      'in_progress',
      'resolved',
      'closed',
    ],
    alertTemplateIndices: [0, 1, 2, 5, 6, 10, 11, 12, 14, 17],
    agentPool: [
      'fin-web-01',
      'fin-web-02',
      'fin-db-01',
      'trading-server-01',
      'payment-gateway-01',
      'fin-dc-01',
      'treasury-ws-003',
      'compliance-app-01',
    ],
    caseTemplateIndices: [0, 1, 4, 6, 7],
    huntQueryIndices: [0, 1, 2, 3],
    huntSessionStatuses: ['completed', 'completed', 'completed', 'running'],
    iocIndices: [
      0, 1, 3, 7, 8, 11, 12, 14, 17, 20, 21, 23, 25, 29, 30, 34, 35, 38, 39, 43, 44, 48, 50, 53, 56,
      58, 60, 62, 64, 65, 66, 69, 70, 72, 74, 76, 78, 81, 83, 85, 87, 89, 91, 94, 96,
    ],
    mispEventIndices: [0, 1, 3, 5, 6, 9, 11, 13],
    connectors: CONNECTOR_SEEDS,
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    name: 'Aura Health',
    slug: 'aura-health',
    alertCount: 18,
    alertStatusWeights: [
      'new_alert',
      'new_alert',
      'new_alert',
      'acknowledged',
      'in_progress',
      'resolved',
      'closed',
      'closed',
    ],
    alertTemplateIndices: [0, 3, 4, 7, 8, 9, 13, 15, 18, 19],
    agentPool: [
      'ehr-server-01',
      'ehr-server-02',
      'lab-system-01',
      'imaging-ws-01',
      'nurse-station-12',
      'pharmacy-app-01',
      'health-dc-01',
      'telehealth-gw-01',
    ],
    caseTemplateIndices: [1, 2, 3, 5],
    huntQueryIndices: [1, 4, 5],
    huntSessionStatuses: ['completed', 'completed', 'error'],
    iocIndices: [
      2, 4, 5, 9, 10, 13, 15, 18, 22, 24, 26, 27, 31, 36, 40, 41, 45, 46, 49, 51, 54, 57, 59, 61,
      63, 67, 68, 71, 73, 75, 77, 79, 80, 82, 84, 86, 88, 90, 92, 93, 95, 97, 99,
    ],
    mispEventIndices: [2, 4, 7, 8, 10, 12],
    connectors: CONNECTOR_SEEDS,
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    name: 'Aura Enterprise',
    slug: 'aura-enterprise',
    alertCount: 45,
    alertStatusWeights: [
      'new_alert',
      'new_alert',
      'new_alert',
      'new_alert',
      'acknowledged',
      'in_progress',
      'false_positive',
      'resolved',
    ],
    alertTemplateIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    agentPool: [
      'ent-web-01',
      'ent-web-02',
      'ent-web-03',
      'ent-dc-01',
      'ent-dc-02',
      'ent-db-01',
      'ent-db-02',
      'erp-server-01',
      'crm-app-01',
      'vpn-gw-01',
      'workstation-101',
      'workstation-202',
      'mail-relay-01',
      'ci-runner-01',
    ],
    caseTemplateIndices: [0, 1, 2, 3, 4, 5, 6, 7],
    huntQueryIndices: [0, 2, 3, 4, 5, 6],
    huntSessionStatuses: ['completed', 'completed', 'completed', 'completed', 'running', 'error'],
    iocIndices: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
      49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
      72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94,
      95, 96, 97, 98, 99,
    ],
    mispEventIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    connectors: CONNECTOR_SEEDS,
  },
]

// ─── Alert seed data ──────────────────────────────────────────

const ALERT_TEMPLATES: Array<{
  title: string
  description: string
  severity: AlertSeverity
  source: string
  ruleName: string
  ruleId: string
  mitreTactics: string[]
  mitreTechniques: string[]
}> = [
  {
    title: 'Brute Force Attack Detected',
    description: 'Multiple failed SSH login attempts detected',
    severity: 'high',
    source: 'wazuh',
    ruleName: 'SSH brute force attack',
    ruleId: '5710',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1110.001'],
  },
  {
    title: 'Suspicious PowerShell Execution',
    description: 'Encoded PowerShell command with download cradle detected',
    severity: 'critical',
    source: 'wazuh',
    ruleName: 'Suspicious PowerShell activity',
    ruleId: '91816',
    mitreTactics: ['Execution'],
    mitreTechniques: ['T1059.001'],
  },
  {
    title: 'Data Exfiltration via DNS',
    description: 'Unusually high DNS query volume to suspicious domain',
    severity: 'critical',
    source: 'graylog',
    ruleName: 'DNS tunneling detected',
    ruleId: 'GL-DNS-001',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1048.003'],
  },
  {
    title: 'Privilege Escalation Attempt',
    description: 'Local privilege escalation via sudo misconfiguration',
    severity: 'high',
    source: 'wazuh',
    ruleName: 'Sudo privilege escalation',
    ruleId: '5401',
    mitreTactics: ['Privilege Escalation'],
    mitreTechniques: ['T1548.003'],
  },
  {
    title: 'Lateral Movement via RDP',
    description: 'RDP session from non-standard source to critical server',
    severity: 'medium',
    source: 'velociraptor',
    ruleName: 'Anomalous RDP connection',
    ruleId: 'VR-RDP-001',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.001'],
  },
  {
    title: 'Malware C2 Beacon',
    description: 'Periodic HTTP POST requests matching known C2 pattern',
    severity: 'critical',
    source: 'wazuh',
    ruleName: 'C2 beacon communication',
    ruleId: '100201',
    mitreTactics: ['Command and Control'],
    mitreTechniques: ['T1071.001'],
  },
  {
    title: 'SQL Injection Attempt',
    description: 'Union-based SQL injection detected on login endpoint',
    severity: 'high',
    source: 'graylog',
    ruleName: 'Web application attack',
    ruleId: 'GL-WAF-042',
    mitreTactics: ['Initial Access'],
    mitreTechniques: ['T1190'],
  },
  {
    title: 'Unauthorized File Access',
    description: 'Access to restricted /etc/shadow file detected',
    severity: 'medium',
    source: 'wazuh',
    ruleName: 'File integrity monitoring alert',
    ruleId: '550',
    mitreTactics: ['Collection'],
    mitreTechniques: ['T1005'],
  },
  {
    title: 'Suspicious Process Spawned',
    description: 'cmd.exe spawned by Word document',
    severity: 'high',
    source: 'velociraptor',
    ruleName: 'Office macro execution',
    ruleId: 'VR-PROC-005',
    mitreTactics: ['Execution'],
    mitreTechniques: ['T1204.002'],
  },
  {
    title: 'Port Scan Detected',
    description: 'Sequential port scanning activity from internal host',
    severity: 'low',
    source: 'wazuh',
    ruleName: 'Network reconnaissance',
    ruleId: '100100',
    mitreTactics: ['Discovery'],
    mitreTechniques: ['T1046'],
  },
  {
    title: 'Credential Dumping Attempt',
    description: 'LSASS memory access detected from non-system process',
    severity: 'critical',
    source: 'velociraptor',
    ruleName: 'LSASS credential dump',
    ruleId: 'VR-CRED-001',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1003.001'],
  },
  {
    title: 'Malicious File Download',
    description: 'Known malware hash detected in downloaded file',
    severity: 'high',
    source: 'wazuh',
    ruleName: 'Malware detection',
    ruleId: '87105',
    mitreTactics: ['Execution'],
    mitreTechniques: ['T1204.002'],
  },
  // ── Additional alert sources ──
  {
    title: 'Ransomware Encryption Activity',
    description: 'Rapid file rename operations consistent with ransomware encryption pattern',
    severity: 'critical',
    source: 'logstash',
    ruleName: 'Ransomware file activity pattern',
    ruleId: 'LS-RANSOM-001',
    mitreTactics: ['Impact'],
    mitreTechniques: ['T1486'],
  },
  {
    title: 'Anomalous Outbound Traffic Volume',
    description: 'Data transfer to external IP exceeds 95th percentile baseline',
    severity: 'high',
    source: 'logstash',
    ruleName: 'Outbound data anomaly',
    ruleId: 'LS-EXFIL-003',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1041'],
  },
  {
    title: 'Known C2 IP Communication',
    description: 'Network connection to IP flagged in ThreatFox C2 feed',
    severity: 'critical',
    source: 'misp',
    ruleName: 'Threat intel IOC match',
    ruleId: 'MISP-IOC-001',
    mitreTactics: ['Command and Control'],
    mitreTechniques: ['T1071.001'],
  },
  {
    title: 'Phishing Email Delivered',
    description: 'Email with known malicious attachment hash bypassed spam filter',
    severity: 'high',
    source: 'misp',
    ruleName: 'Phishing campaign indicator',
    ruleId: 'MISP-IOC-042',
    mitreTactics: ['Initial Access'],
    mitreTechniques: ['T1566.001'],
  },
  {
    title: 'DLL Side-Loading Attempt',
    description: 'Legitimate process loaded unsigned DLL from non-standard path',
    severity: 'high',
    source: 'velociraptor',
    ruleName: 'DLL hijack detection',
    ruleId: 'VR-DLL-002',
    mitreTactics: ['Persistence', 'Privilege Escalation'],
    mitreTechniques: ['T1574.002'],
  },
  {
    title: 'Kerberoasting Activity Detected',
    description: 'Service ticket requests for multiple SPNs from single account in short timeframe',
    severity: 'critical',
    source: 'wazuh',
    ruleName: 'Kerberoasting attack',
    ruleId: '92100',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1558.003'],
  },
  {
    title: 'Suspicious Cron Job Created',
    description: 'New cron entry added with base64-encoded command payload',
    severity: 'medium',
    source: 'wazuh',
    ruleName: 'Scheduled task persistence',
    ruleId: '2830',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1053.003'],
  },
  {
    title: 'DNS Over HTTPS Detected',
    description: 'Application bypassing local DNS resolver via DoH to external provider',
    severity: 'medium',
    source: 'graylog',
    ruleName: 'DNS over HTTPS evasion',
    ruleId: 'GL-DNS-005',
    mitreTactics: ['Command and Control'],
    mitreTechniques: ['T1071.004'],
  },
]

// ─── Case seed data ────────────────────────────────────────────

const CASE_TEMPLATES: Array<{
  title: string
  description: string
  severity: CaseSeverity
  status: CaseStatus
}> = [
  {
    title: 'Ransomware Investigation',
    description: 'Investigating potential ransomware deployment on finance workstations',
    severity: 'critical',
    status: 'in_progress',
  },
  {
    title: 'Phishing Campaign Response',
    description: 'Multiple employees reported suspicious emails with malicious links',
    severity: 'high',
    status: 'open',
  },
  {
    title: 'Insider Threat Review',
    description: 'Unusual data access patterns from departing employee',
    severity: 'high',
    status: 'in_progress',
  },
  {
    title: 'Network Intrusion Analysis',
    description: 'Suspicious traffic detected from compromised IoT device',
    severity: 'medium',
    status: 'open',
  },
  {
    title: 'Malware Containment',
    description: 'Trojan detected on endpoint-177, containment in progress',
    severity: 'critical',
    status: 'closed',
  },
  {
    title: 'DDoS Mitigation Review',
    description: 'Post-incident review of DDoS attack on web infrastructure',
    severity: 'medium',
    status: 'closed',
  },
  {
    title: 'Credential Leak Response',
    description: 'Employee credentials found on dark web marketplace',
    severity: 'high',
    status: 'open',
  },
  {
    title: 'Vulnerability Exploitation',
    description: 'Log4Shell exploitation attempt detected on Java applications',
    severity: 'critical',
    status: 'in_progress',
  },
]

// ─── Case Cycle seed data ──────────────────────────────────────

const CYCLE_TEMPLATES: Array<{
  name: string
  description: string
  status: CaseCycleStatus
  daysAgo: number
  durationDays: number
}> = [
  {
    name: 'Cycle 1 — January Ops',
    description: 'First operational cycle covering initial incident response and triage',
    status: 'closed',
    daysAgo: 60,
    durationDays: 14,
  },
  {
    name: 'Cycle 2 — February Ops',
    description:
      'Second operational cycle with focus on phishing campaigns and malware containment',
    status: 'closed',
    daysAgo: 30,
    durationDays: 14,
  },
  {
    name: 'Cycle 3 — March Ops',
    description: 'Current active cycle for ongoing threat monitoring and response',
    status: 'active',
    daysAgo: 7,
    durationDays: 14,
  },
]

// ─── Hunt query pool ────────────────────────────────────────────

const HUNT_QUERIES = [
  'source.ip:203.0.113.* AND event.action:login_failed',
  'process.name:powershell.exe AND process.args:*-enc*',
  'dns.question.name:*.onion OR dns.question.name:*.bit',
  'event.action:file_created AND file.extension:(exe OR dll OR scr)',
  'network.bytes_out:>1000000 AND destination.geo.country_name:!internal',
  'process.parent.name:winword.exe AND process.name:(cmd.exe OR powershell.exe)',
  'registry.path:*\\Run\\* AND event.action:registry_modified',
]

// ─── Intel seed data ────────────────────────────────────────────

const IOC_DATA: Array<{
  iocValue: string
  iocType: string
  source: string
  severity: string
}> = [
  // ── IP sources (ip-src) ──
  { iocValue: '203.0.113.42', iocType: 'ip-src', source: 'MISP-10001', severity: 'high' },
  { iocValue: '198.51.100.77', iocType: 'ip-src', source: 'MISP-10002', severity: 'critical' },
  { iocValue: '45.33.32.156', iocType: 'ip-src', source: 'MISP-10003', severity: 'high' },
  { iocValue: '185.220.101.1', iocType: 'ip-src', source: 'MISP-10004', severity: 'medium' },
  { iocValue: '91.219.236.222', iocType: 'ip-src', source: 'MISP-10006', severity: 'high' },
  { iocValue: '23.129.64.100', iocType: 'ip-src', source: 'MISP-10007', severity: 'critical' },
  { iocValue: '104.244.72.115', iocType: 'ip-src', source: 'MISP-10010', severity: 'high' },
  // ── IP destinations (ip-dst) ──
  { iocValue: '172.16.0.100', iocType: 'ip-dst', source: 'MISP-10001', severity: 'medium' },
  { iocValue: '10.20.30.40', iocType: 'ip-dst', source: 'MISP-10004', severity: 'low' },
  { iocValue: '192.168.1.200', iocType: 'ip-dst', source: 'MISP-10008', severity: 'medium' },
  { iocValue: '10.50.100.5', iocType: 'ip-dst', source: 'MISP-10009', severity: 'high' },
  // ── Domains ──
  { iocValue: 'evil-domain.xyz', iocType: 'domain', source: 'MISP-10002', severity: 'critical' },
  { iocValue: 'c2-server.onion', iocType: 'domain', source: 'MISP-10007', severity: 'critical' },
  { iocValue: 'phishing-site.com', iocType: 'domain', source: 'MISP-10003', severity: 'high' },
  { iocValue: 'data-exfil.net', iocType: 'domain', source: 'MISP-10006', severity: 'high' },
  { iocValue: 'malware-drop.ru', iocType: 'domain', source: 'MISP-10010', severity: 'critical' },
  { iocValue: 'crypto-mine.cc', iocType: 'domain', source: 'MISP-10005', severity: 'medium' },
  // ── Hostnames ──
  { iocValue: 'ns1.evil-domain.xyz', iocType: 'hostname', source: 'MISP-10002', severity: 'high' },
  {
    iocValue: 'mail.phishing-site.com',
    iocType: 'hostname',
    source: 'MISP-10003',
    severity: 'high',
  },
  {
    iocValue: 'cdn.malware-drop.ru',
    iocType: 'hostname',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: 'api.c2-server.onion',
    iocType: 'hostname',
    source: 'MISP-10007',
    severity: 'critical',
  },
  // ── MD5 hashes ──
  {
    iocValue: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    iocType: 'md5',
    source: 'MISP-10002',
    severity: 'high',
  },
  {
    iocValue: 'd41d8cd98f00b204e9800998ecf8427e',
    iocType: 'md5',
    source: 'MISP-10004',
    severity: 'critical',
  },
  {
    iocValue: '098f6bcd4621d373cade4e832627b4f6',
    iocType: 'md5',
    source: 'MISP-10007',
    severity: 'high',
  },
  {
    iocValue: 'e99a18c428cb38d5f260853678922e03',
    iocType: 'md5',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: '5d41402abc4b2a76b9719d911017c592',
    iocType: 'md5',
    source: 'MISP-10001',
    severity: 'medium',
  },
  // ── SHA1 hashes ──
  {
    iocValue: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    iocType: 'sha1',
    source: 'MISP-10002',
    severity: 'high',
  },
  {
    iocValue: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
    iocType: 'sha1',
    source: 'MISP-10004',
    severity: 'critical',
  },
  {
    iocValue: '356a192b7913b04c54574d18c28d46e6395428ab',
    iocType: 'sha1',
    source: 'MISP-10007',
    severity: 'high',
  },
  // ── SHA256 hashes ──
  {
    iocValue: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    iocType: 'sha256',
    source: 'MISP-10002',
    severity: 'critical',
  },
  {
    iocValue: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    iocType: 'sha256',
    source: 'MISP-10004',
    severity: 'high',
  },
  {
    iocValue: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    iocType: 'sha256',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    iocType: 'sha256',
    source: 'MISP-10001',
    severity: 'medium',
  },
  {
    iocValue: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    iocType: 'sha256',
    source: 'MISP-10006',
    severity: 'high',
  },
  {
    iocValue: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
    iocType: 'sha256',
    source: 'MISP-10009',
    severity: 'high',
  },
  // ── URLs ──
  {
    iocValue: 'https://evil-domain.xyz/payload.exe',
    iocType: 'url',
    source: 'MISP-10002',
    severity: 'critical',
  },
  {
    iocValue: 'http://phishing-site.com/login',
    iocType: 'url',
    source: 'MISP-10003',
    severity: 'high',
  },
  {
    iocValue: 'https://malware-drop.ru/stage2.dll',
    iocType: 'url',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: 'http://crypto-mine.cc/worker.js',
    iocType: 'url',
    source: 'MISP-10005',
    severity: 'medium',
  },
  // ── Filenames ──
  { iocValue: 'dropper.exe', iocType: 'filename', source: 'MISP-10002', severity: 'high' },
  {
    iocValue: 'ransomware-payload.dll',
    iocType: 'filename',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: 'suspicious-script.ps1',
    iocType: 'filename',
    source: 'MISP-10007',
    severity: 'high',
  },
  { iocValue: 'keylogger.sys', iocType: 'filename', source: 'MISP-10004', severity: 'critical' },
  {
    iocValue: 'backdoor-installer.msi',
    iocType: 'filename',
    source: 'MISP-10001',
    severity: 'high',
  },
  // ── CIDR ranges ──
  { iocValue: '203.0.113.0/24', iocType: 'cidr', source: 'MISP-10001', severity: 'medium' },
  { iocValue: '198.51.100.0/24', iocType: 'cidr', source: 'MISP-10002', severity: 'high' },
  { iocValue: '185.220.101.0/24', iocType: 'cidr', source: 'MISP-10004', severity: 'medium' },
  // ── Email addresses ──
  {
    iocValue: 'phishing@evil-domain.xyz',
    iocType: 'email',
    source: 'MISP-10003',
    severity: 'high',
  },
  {
    iocValue: 'c2-admin@malware-drop.ru',
    iocType: 'email',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: 'recruitment@fake-corp.com',
    iocType: 'email',
    source: 'MISP-10009',
    severity: 'medium',
  },
  {
    iocValue: 'support@phishing-site.com',
    iocType: 'email',
    source: 'MISP-10003',
    severity: 'high',
  },
  // ── ASN ──
  { iocValue: 'AS14061', iocType: 'asn', source: 'MISP-10001', severity: 'low' },
  { iocValue: 'AS9009', iocType: 'asn', source: 'MISP-10004', severity: 'medium' },
  { iocValue: 'AS16276', iocType: 'asn', source: 'MISP-10010', severity: 'medium' },
  // ── CVE ──
  { iocValue: 'CVE-2024-3094', iocType: 'cve', source: 'MISP-10006', severity: 'critical' },
  { iocValue: 'CVE-2023-44228', iocType: 'cve', source: 'MISP-10007', severity: 'critical' },
  { iocValue: 'CVE-2024-21887', iocType: 'cve', source: 'MISP-10014', severity: 'high' },
  { iocValue: 'CVE-2023-46805', iocType: 'cve', source: 'MISP-10012', severity: 'high' },
  // ── Registry keys ──
  {
    iocValue: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\MalwareKey',
    iocType: 'registry',
    source: 'MISP-10002',
    severity: 'high',
  },
  {
    iocValue: 'HKCU\\Software\\Classes\\CLSID\\{random-guid}\\InprocServer32',
    iocType: 'registry',
    source: 'MISP-10004',
    severity: 'critical',
  },
  {
    iocValue: 'HKLM\\System\\CurrentControlSet\\Services\\MalService',
    iocType: 'registry',
    source: 'MISP-10010',
    severity: 'high',
  },
  // ── File paths ──
  {
    iocValue: 'C:\\Windows\\Temp\\svchost_update.exe',
    iocType: 'filepath',
    source: 'MISP-10002',
    severity: 'high',
  },
  {
    iocValue: '/tmp/.hidden/backdoor',
    iocType: 'filepath',
    source: 'MISP-10007',
    severity: 'critical',
  },
  {
    iocValue: 'C:\\Users\\Public\\Documents\\stage2.dll',
    iocType: 'filepath',
    source: 'MISP-10010',
    severity: 'critical',
  },
  {
    iocValue: '/var/tmp/.cache/miner',
    iocType: 'filepath',
    source: 'MISP-10005',
    severity: 'medium',
  },
  // ── Wazuh-sourced IOCs ──
  { iocValue: '77.91.124.20', iocType: 'ip-src', source: 'wazuh', severity: 'critical' },
  { iocValue: '94.232.42.58', iocType: 'ip-src', source: 'wazuh', severity: 'high' },
  { iocValue: 'invoke-mimikatz.ps1', iocType: 'filename', source: 'wazuh', severity: 'critical' },
  {
    iocValue: 'HKLM\\System\\CurrentControlSet\\Control\\Lsa\\RunAsPPL',
    iocType: 'registry',
    source: 'wazuh',
    severity: 'high',
  },
  {
    iocValue: 'C:\\ProgramData\\svchost_task.exe',
    iocType: 'filepath',
    source: 'wazuh',
    severity: 'critical',
  },
  // ── Manual IOCs ──
  { iocValue: '5.188.86.10', iocType: 'ip-src', source: 'manual', severity: 'high' },
  { iocValue: 'suspicious-update.com', iocType: 'domain', source: 'manual', severity: 'medium' },
  { iocValue: 'CVE-2024-38063', iocType: 'cve', source: 'manual', severity: 'critical' },
  {
    iocValue: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    iocType: 'md5',
    source: 'manual',
    severity: 'high',
  },
  {
    iocValue: 'admin@suspicious-update.com',
    iocType: 'email',
    source: 'manual',
    severity: 'medium',
  },
  // ── ThreatFox IOCs ──
  { iocValue: '45.155.205.233', iocType: 'ip-src', source: 'threatfox', severity: 'critical' },
  { iocValue: '185.215.113.43', iocType: 'ip-src', source: 'threatfox', severity: 'critical' },
  {
    iocValue: 'redline-stealer-c2.top',
    iocType: 'domain',
    source: 'threatfox',
    severity: 'critical',
  },
  {
    iocValue: 'raccoon-stealer-drop.xyz',
    iocType: 'domain',
    source: 'threatfox',
    severity: 'high',
  },
  {
    iocValue: 'e99a18c428cb38d5f260853678922e03',
    iocType: 'md5',
    source: 'threatfox',
    severity: 'critical',
  },
  {
    iocValue: 'http://45.155.205.233:8080/loader.exe',
    iocType: 'url',
    source: 'threatfox',
    severity: 'critical',
  },
  { iocValue: 'AS44477', iocType: 'asn', source: 'threatfox', severity: 'high' },
  // ── OTX IOCs ──
  { iocValue: '103.224.182.250', iocType: 'ip-src', source: 'otx', severity: 'high' },
  { iocValue: '82.118.21.1', iocType: 'ip-src', source: 'otx', severity: 'medium' },
  { iocValue: 'apt-lazarus-c2.net', iocType: 'domain', source: 'otx', severity: 'critical' },
  { iocValue: 'cobalt-strike-beacon.cc', iocType: 'domain', source: 'otx', severity: 'critical' },
  {
    iocValue: 'dab758bf98d9b36fa057a66c0f5c45a5e03e9a52',
    iocType: 'sha1',
    source: 'otx',
    severity: 'high',
  },
  { iocValue: 'CVE-2023-36884', iocType: 'cve', source: 'otx', severity: 'critical' },
  { iocValue: '103.224.182.0/24', iocType: 'cidr', source: 'otx', severity: 'medium' },
  // ── VirusTotal IOCs ──
  {
    iocValue: '8b2e97f4d590f8b15dc8c82bfa8a1c2092eb3f37a4e3a86bc4e39c6ef8b7c1d0',
    iocType: 'sha256',
    source: 'virustotal',
    severity: 'critical',
  },
  {
    iocValue: 'f47c75614f3a67e5b2e5c2dbab2c46b2',
    iocType: 'md5',
    source: 'virustotal',
    severity: 'high',
  },
  { iocValue: 'trojan-agent.exe', iocType: 'filename', source: 'virustotal', severity: 'critical' },
  { iocValue: 'stealer-payload.dll', iocType: 'filename', source: 'virustotal', severity: 'high' },
  { iocValue: 'info-stealer-c2.ru', iocType: 'domain', source: 'virustotal', severity: 'critical' },
  { iocValue: 'AS62904', iocType: 'asn', source: 'virustotal', severity: 'medium' },
  // ── Logstash IOCs ──
  { iocValue: '146.70.87.199', iocType: 'ip-src', source: 'logstash', severity: 'high' },
  { iocValue: '62.102.148.68', iocType: 'ip-src', source: 'logstash', severity: 'critical' },
  { iocValue: 'ransomware-c2.top', iocType: 'domain', source: 'logstash', severity: 'critical' },
  { iocValue: 'exfil-staging.net', iocType: 'domain', source: 'logstash', severity: 'high' },
  {
    iocValue: 'http://62.102.148.68:443/beacon',
    iocType: 'url',
    source: 'logstash',
    severity: 'critical',
  },
  { iocValue: '146.70.87.0/24', iocType: 'cidr', source: 'logstash', severity: 'medium' },
]

const MISP_EVENTS = [
  {
    mispEventId: '10001',
    organization: 'CERT-EU',
    threatLevel: 'high',
    info: 'APT28 Campaign Targeting Financial Sector',
    attributeCount: 42,
  },
  {
    mispEventId: '10002',
    organization: 'US-CERT',
    threatLevel: 'critical',
    info: 'Ransomware IOCs - LockBit 3.0',
    attributeCount: 87,
  },
  {
    mispEventId: '10003',
    organization: 'CIRCL',
    threatLevel: 'medium',
    info: 'Phishing Kit Distribution Network',
    attributeCount: 23,
  },
  {
    mispEventId: '10004',
    organization: 'Kaspersky GReAT',
    threatLevel: 'high',
    info: 'Emotet Botnet Resurgence',
    attributeCount: 156,
  },
  {
    mispEventId: '10005',
    organization: 'FIRST',
    threatLevel: 'low',
    info: 'Cryptocurrency Mining Malware Indicators',
    attributeCount: 15,
  },
  {
    mispEventId: '10006',
    organization: 'MITRE',
    threatLevel: 'high',
    info: 'Supply Chain Attack via NPM Packages',
    attributeCount: 34,
  },
  {
    mispEventId: '10007',
    organization: 'CrowdStrike',
    threatLevel: 'critical',
    info: 'Zero-Day Exploit - CVE-2024-XXXX',
    attributeCount: 8,
  },
  {
    mispEventId: '10008',
    organization: 'ENISA',
    threatLevel: 'medium',
    info: 'DDoS-for-Hire Service Takedown IOCs',
    attributeCount: 67,
  },
  {
    mispEventId: '10009',
    organization: 'Mandiant',
    threatLevel: 'high',
    info: 'Spear Phishing Campaign Against Healthcare',
    attributeCount: 29,
  },
  {
    mispEventId: '10010',
    organization: 'FBI IC3',
    threatLevel: 'critical',
    info: 'State-Sponsored Espionage - Operation Shadow',
    attributeCount: 112,
  },
  {
    mispEventId: '10011',
    organization: 'Recorded Future',
    threatLevel: 'high',
    info: 'Magecart Skimming Infrastructure',
    attributeCount: 45,
  },
  {
    mispEventId: '10012',
    organization: 'Palo Alto Unit 42',
    threatLevel: 'critical',
    info: 'APT29 SolarWinds Follow-up Campaign',
    attributeCount: 93,
  },
  {
    mispEventId: '10013',
    organization: 'JPCERT/CC',
    threatLevel: 'medium',
    info: 'BlackTech Router Implant Indicators',
    attributeCount: 18,
  },
  {
    mispEventId: '10014',
    organization: 'NCSC-UK',
    threatLevel: 'high',
    info: 'Sandworm ICS Targeting Campaign',
    attributeCount: 37,
  },
]

// ─── Helpers ────────────────────────────────────────────────────

function randomIp(): string {
  return `${10 + Math.floor(Math.random() * 190)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

function randomDate(daysBack: number): Date {
  return subtractDuration(nowDate(), Math.floor(Math.random() * daysBack), 'day')
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

function pickByIndices<T>(arr: T[], indices: number[]): T[] {
  return indices.filter(i => i < arr.length).map(i => arr[i] as T)
}

// ─── Seed functions ─────────────────────────────────────────────

function buildRawEvent(
  template: (typeof ALERT_TEMPLATES)[number],
  agentName: string,
  srcIp: string,
  dstIp: string,
  ts: Date
): Record<string, unknown> {
  const base = {
    timestamp: ts.toISOString(),
    agent: { name: agentName, id: `agent-${Math.floor(Math.random() * 999)}` },
    rule: {
      id: template.ruleId,
      description: template.ruleName,
      level: Math.floor(Math.random() * 12) + 3,
    },
    source: { ip: srcIp, port: 1024 + Math.floor(Math.random() * 64000) },
    destination: { ip: dstIp, port: randomItem([22, 80, 443, 3389, 8080, 8443, 53]) },
  }

  if (template.source === 'wazuh') {
    return {
      ...base,
      manager: { name: 'wazuh-manager-01' },
      decoder: { name: randomItem(['sshd', 'syslog', 'windows', 'json', 'auditd']) },
      full_log: `${ts.toISOString()} ${agentName} ${template.ruleName}: src=${srcIp} dst=${dstIp}`,
      data: {
        srcip: srcIp,
        dstip: dstIp,
        srcuser: randomItem(['root', 'admin', 'svc-backup', 'www-data', 'nobody']),
        program_name: randomItem(['sshd', 'sudo', 'systemd', 'kernel', 'auditd']),
      },
    }
  }

  if (template.source === 'graylog') {
    return {
      ...base,
      gl2_source_input: `5f8c${Math.floor(Math.random() * 9999)}`,
      gl2_source_node: 'graylog-node-01',
      facility: randomItem(['auth', 'daemon', 'kern', 'local0', 'syslog']),
      message: `${template.description} [${srcIp} → ${dstIp}]`,
      streams: [`stream-${Math.floor(Math.random() * 99)}`],
      level: randomItem([3, 4, 5, 6]),
    }
  }

  if (template.source === 'velociraptor') {
    return {
      ...base,
      client_id: `C.${Math.random().toString(36).slice(2, 14)}`,
      flow_id: `F.${Math.random().toString(36).slice(2, 14)}`,
      artifact: randomItem([
        'Windows.System.ProcessCreation',
        'Windows.EventLogs.RDPNTLM',
        'Generic.Client.Info',
        'Windows.Detection.LSASS',
      ]),
      hostname: agentName,
      os_info: { system: 'windows', release: '10.0.19045', machine: 'AMD64' },
    }
  }

  return base
}

const RESOLUTION_TEXTS = [
  'Confirmed and mitigated — affected hosts isolated and patched',
  'False positive — triggered by scheduled maintenance script',
  'Contained — malicious process terminated, IOCs blocked at perimeter',
  'Escalated to IR team — ongoing investigation',
  'Remediated — user credentials rotated and MFA enforced',
  'No action required — benign scanning by vulnerability assessment tool',
]

async function seedAlerts(tenantId: string, profile: TenantProfile): Promise<void> {
  const templates = pickByIndices(ALERT_TEMPLATES, profile.alertTemplateIndices)

  // Use deterministic externalId for consistent alert identity across re-seeds
  // Seed a fixed set per tenant using the template index as part of the key
  for (let i = 0; i < profile.alertCount; i++) {
    const externalId = `seed-${profile.slug}-${i}`
    const templateIndex = i % templates.length
    const template = templates[templateIndex] as (typeof ALERT_TEMPLATES)[number]
    const statusIndex = i % profile.alertStatusWeights.length
    const status = profile.alertStatusWeights[statusIndex] as AlertStatus
    const timestamp = randomDate(30)
    const agentName = randomItem(profile.agentPool)
    const srcIp = randomIp()
    const dstIp = randomIp()

    // Randomly decide which optional fields to populate (variety per alert)
    const roll = i % 5 // 0-4 gives us 5 variation groups
    const hasRawEvent = roll !== 0 // ~80% have raw event
    const hasAcknowledged = status !== 'new_alert' && roll !== 1 // most non-new alerts
    const hasClosed = (status === 'closed' || status === 'resolved') && roll !== 2
    const hasResolution =
      (status === 'closed' || status === 'resolved' || status === 'false_positive') && roll !== 3

    await prisma.alert.upsert({
      where: { tenantId_externalId: { tenantId, externalId } },
      update: {
        title: template.title,
        description: template.description,
        severity: template.severity,
        status,
        source: template.source,
        ruleName: template.ruleName,
        ruleId: template.ruleId,
        agentName,
        sourceIp: srcIp,
        destinationIp: dstIp,
        mitreTactics: template.mitreTactics,
        mitreTechniques: template.mitreTechniques,
        timestamp,
        rawEvent: hasRawEvent
          ? (buildRawEvent(template, agentName, srcIp, dstIp, timestamp) as Prisma.InputJsonValue)
          : Prisma.DbNull,
        acknowledgedBy: hasAcknowledged ? `analyst@${profile.slug}.io` : null,
        acknowledgedAt: hasAcknowledged ? addDuration(timestamp, 5, 'minute') : null,
        closedBy: hasClosed ? `analyst@${profile.slug}.io` : null,
        closedAt: hasClosed ? addDuration(timestamp, 1, 'hour') : null,
        resolution: hasResolution ? randomItem(RESOLUTION_TEXTS) : null,
      },
      create: {
        tenantId,
        externalId,
        title: template.title,
        description: template.description,
        severity: template.severity,
        status,
        source: template.source,
        ruleName: template.ruleName,
        ruleId: template.ruleId,
        agentName,
        sourceIp: srcIp,
        destinationIp: dstIp,
        mitreTactics: template.mitreTactics,
        mitreTechniques: template.mitreTechniques,
        timestamp,
        rawEvent: hasRawEvent
          ? (buildRawEvent(template, agentName, srcIp, dstIp, timestamp) as Prisma.InputJsonValue)
          : undefined,
        acknowledgedBy: hasAcknowledged ? `analyst@${profile.slug}.io` : null,
        acknowledgedAt: hasAcknowledged ? addDuration(timestamp, 5, 'minute') : null,
        closedBy: hasClosed ? `analyst@${profile.slug}.io` : null,
        closedAt: hasClosed ? addDuration(timestamp, 1, 'hour') : null,
        resolution: hasResolution ? randomItem(RESOLUTION_TEXTS) : null,
      },
    })
  }
}

async function seedCases(
  tenantId: string,
  profile: TenantProfile,
  cycleIds: string[],
  assignableUserIds: string[]
): Promise<void> {
  const year = getYear()
  const templates = pickByIndices(CASE_TEMPLATES, profile.caseTemplateIndices)

  for (const [idx, template] of templates.entries()) {
    globalCaseCounter++
    const caseNumber = `SOC-${year}-${String(globalCaseCounter).padStart(3, '0')}`

    // Distribute cases across cycles: round-robin assignment
    const cycleId = cycleIds.length > 0 ? cycleIds[idx % cycleIds.length] : null

    // Distribute cases across assignable users: round-robin, leave every 3rd case unassigned
    const ownerUserId =
      assignableUserIds.length > 0 && idx % 3 !== 2
        ? assignableUserIds[idx % assignableUserIds.length]
        : null

    await prisma.case.upsert({
      where: { caseNumber },
      update: {
        tenantId,
        title: template.title,
        description: template.description,
        severity: template.severity,
        status: template.status,
        createdBy: `admin@${profile.slug}.io`,
        closedAt: template.status === 'closed' ? randomDate(5) : null,
        ...(cycleId ? { cycleId } : {}),
        ...(ownerUserId ? { ownerUserId } : {}),
      },
      create: {
        tenantId,
        caseNumber,
        title: template.title,
        description: template.description,
        severity: template.severity,
        status: template.status,
        createdBy: `admin@${profile.slug}.io`,
        closedAt: template.status === 'closed' ? randomDate(5) : null,
        ...(cycleId ? { cycleId } : {}),
        ...(ownerUserId ? { ownerUserId } : {}),
        timeline: {
          create: [
            {
              type: 'created',
              actor: `admin@${profile.slug}.io`,
              description: `Case ${caseNumber} created: ${template.title}`,
            },
            ...(template.status !== 'open'
              ? [
                  {
                    type: 'status_changed',
                    actor: `analyst.l2@${profile.slug}.io`,
                    description: `Status changed to ${template.status}`,
                  },
                ]
              : []),
          ],
        },
        notes: {
          create:
            template.status !== 'open'
              ? [
                  {
                    author: `analyst.l2@${profile.slug}.io`,
                    body: 'Initial triage completed. Escalating for further investigation.',
                  },
                ]
              : [],
        },
      },
    })
  }
}

async function seedHuntSessions(tenantId: string, profile: TenantProfile): Promise<void> {
  try {
    const existingSession = await prisma.huntSession.findFirst({ where: { tenantId } })
    if (existingSession) {
      logger.info({ tenant: profile.slug }, 'Hunt sessions already seeded — skipping')
      return
    }

    const queries = pickByIndices(HUNT_QUERIES, profile.huntQueryIndices)

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi] as string
      const status = (profile.huntSessionStatuses[qi] ?? 'completed') as HuntSessionStatus
      const eventsCount = status === 'error' ? 0 : 3 + Math.floor(Math.random() * 20)

      const session = await prisma.huntSession.create({
        data: {
          tenantId,
          query,
          status,
          startedBy: `hunter@${profile.slug}.io`,
          startedAt: randomDate(14),
          completedAt: status === 'running' ? null : randomDate(13),
          eventsFound: eventsCount,
          reasoning:
            status === 'error'
              ? ['Searching for matching patterns in Wazuh alerts index', 'Connection timeout']
              : status === 'running'
                ? ['Searching for matching patterns in Wazuh alerts index']
                : [
                    'Searching for matching patterns in Wazuh alerts index',
                    `Found ${eventsCount} events matching query criteria`,
                    'Analysis complete. Results stored.',
                  ],
        },
      })

      const events = []
      for (let i = 0; i < eventsCount; i++) {
        events.push({
          huntSessionId: session.id,
          timestamp: randomDate(14),
          severity: randomItem(['critical', 'high', 'medium', 'low', 'info']),
          eventId: `evt-${randomUUID().slice(0, 8)}`,
          sourceIp: randomIp(),
          user: randomItem(['john.doe', 'jane.smith', 'admin', 'svc-backup', null]),
          description: `Event matching hunt query: ${query.slice(0, 50)}...`,
        })
      }

      await prisma.huntEvent.createMany({ data: events, skipDuplicates: true })
    }
  } catch (error) {
    logger.warn({ tenant: profile.slug, error }, 'Failed to seed hunt sessions')
  }
}

async function seedIntel(tenantId: string, profile: TenantProfile): Promise<void> {
  const iocs = pickByIndices(IOC_DATA, profile.iocIndices)
  const mispEvents = pickByIndices(MISP_EVENTS, profile.mispEventIndices)

  for (const ioc of iocs) {
    await prisma.intelIOC.upsert({
      where: {
        tenantId_iocValue_iocType: { tenantId, iocValue: ioc.iocValue, iocType: ioc.iocType },
      },
      update: {
        source: ioc.source,
        severity: ioc.severity,
        hitCount: Math.floor(Math.random() * 50),
        firstSeen: randomDate(90),
        lastSeen: randomDate(7),
        tags: ['seed-data'],
        active: true,
      },
      create: {
        tenantId,
        ...ioc,
        hitCount: Math.floor(Math.random() * 50),
        firstSeen: randomDate(90),
        lastSeen: randomDate(7),
        tags: ['seed-data'],
        active: true,
      },
    })
  }

  for (const evt of mispEvents) {
    await prisma.intelMispEvent.upsert({
      where: {
        tenantId_mispEventId: { tenantId, mispEventId: evt.mispEventId },
      },
      update: {
        organization: evt.organization,
        threatLevel: evt.threatLevel,
        info: evt.info,
        date: randomDate(60),
        tags: JSON.parse('["seed-data"]'),
        attributeCount: evt.attributeCount,
        published: true,
      },
      create: {
        tenantId,
        mispEventId: evt.mispEventId,
        organization: evt.organization,
        threatLevel: evt.threatLevel,
        info: evt.info,
        date: randomDate(60),
        tags: JSON.parse('["seed-data"]'),
        attributeCount: evt.attributeCount,
        published: true,
      },
    })
  }
}

// ─── AI Audit Log seed data ─────────────────────────────────────

const AI_AUDIT_ACTORS = [
  'analyst@auraspear.io',
  'hunter@auraspear.io',
  'soc-lead@auraspear.io',
  'admin@auraspear.io',
  'responder@auraspear.io',
  'tier2@auraspear.io',
  'tier3@auraspear.io',
  'incident@auraspear.io',
]

const AI_AUDIT_ACTIONS = [
  'ai_hunt',
  'ai_hunt',
  'ai_hunt',
  'ai_investigate',
  'ai_investigate',
  'ai_explain',
]

const AI_AUDIT_MODELS = [
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-3-haiku-20240307-v1:0',
  'rule-based',
]

const AI_HUNT_PROMPTS = [
  'Look for brute force login attempts from external IPs in the last 24 hours',
  'Find evidence of lateral movement using SMB and WMI across internal subnets',
  'Detect DNS tunneling or suspicious TXT record queries to newly registered domains',
  'Hunt for PowerShell encoded commands executed by non-admin users',
  'Search for C2 beacon activity with regular interval outbound connections',
  'Identify privilege escalation attempts via service account abuse',
  'Look for data exfiltration over HTTPS to uncommon destinations',
  'Find evidence of persistence via scheduled tasks or registry Run keys',
  'Detect suspicious process injection using WriteProcessMemory',
  'Hunt for credential harvesting tools like Mimikatz or LaZagne',
  'Search for ransomware precursors: shadow copy deletion and mass file renaming',
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
  'Look for DNS over HTTPS (DoH) tunneling to bypass security controls',
]

const AI_HUNT_RESPONSES = [
  `## Threat Hunt Analysis: Brute Force Activity\n\n**Hypothesis:** An external threat actor is conducting credential-based attacks against authentication services.\n\n**Suggested Queries:**\n1. \`event.id:4625 AND agent.name:dc-01 | stats count by data.srcip\`\n2. \`event.id:4625 AND data.srcip:198.51.100.* | timechart span=1m count\`\n3. \`(event.id:4624) AND data.srcip:198.51.100.22\`\n\n**MITRE ATT&CK Coverage:** T1110.001, T1110.003`,
  `## Threat Hunt Analysis: Lateral Movement via SMB/WMI\n\n**Hypothesis:** Compromised credentials are being used for lateral movement.\n\n**Suggested Queries:**\n1. \`event.action:logon AND logon.type:3 AND source.ip:10.0.0.0/8\`\n2. \`process.name:wmic.exe AND process.args:*process*call*create*\`\n3. \`event.action:share_access AND share.name:(ADMIN$ OR C$)\`\n\n**MITRE ATT&CK Coverage:** T1021.002, T1047`,
  `## Threat Hunt Analysis: DNS Tunneling Detection\n\n**Hypothesis:** A compromised host is exfiltrating data via DNS tunneling.\n\n**Indicators Found:**\n- Beaconing pattern from workstation-17 (60s intervals)\n- Domain update-service.xyz registered 3 days ago\n- 47MB estimated exfiltrated via DNS\n\n**MITRE ATT&CK Coverage:** T1071.004, T1048`,
  `## Threat Hunt Analysis: PowerShell Abuse\n\n**Hypothesis:** Adversary is using encoded PowerShell for defense evasion.\n\n**Key Findings:**\n- 23 encoded PowerShell executions in last 12 hours\n- 5 originated from Office macro execution\n- Base64 decoded content reveals Cobalt Strike beacon stager\n\n**MITRE ATT&CK Coverage:** T1059.001, T1027, T1204.002`,
  `## Threat Hunt Analysis: Command & Control Detection\n\n**Hypothesis:** A compromised endpoint is communicating with external C2.\n\n**Indicators Found:**\n- 2 endpoints showing beaconing behavior (60s interval, 5s jitter)\n- Destination IPs on bulletproof hosting\n- Self-signed TLS certs with suspicious CN values\n\n**MITRE ATT&CK Coverage:** T1071, T1573, T1568`,
]

const AI_INVESTIGATE_PROMPTS = [
  'alert-brute-force-ssh-203.0.113.45',
  'alert-malware-certutil-download',
  'alert-privilege-escalation-sudo',
  'alert-data-exfiltration-large-upload',
  'alert-ransomware-shadow-delete',
  'alert-phishing-macro-execution',
  'alert-suspicious-process-injection',
  'alert-network-scan-nmap-detected',
  'alert-credential-dump-lsass',
  'alert-web-shell-aspx-detected',
  'alert-kerberos-golden-ticket',
  'alert-rdp-brute-force-internal',
  'alert-dns-exfil-high-entropy',
  'alert-service-account-abuse',
  'alert-unauthorized-usb-device',
]

const AI_INVESTIGATE_RESPONSES = [
  `## AI Investigation Report\n\n**Alert:** Brute Force SSH Attack from 203.0.113.45\n**Severity:** CRITICAL\n**Verdict:** True Positive (Confidence: 87%)\n\n**Summary:** 847 failed SSH login attempts targeting root on web-prod-03. Successful auth on attempt #848. Post-exploitation includes privilege escalation and reverse shell.\n\n**MITRE ATT&CK:** T1110.001, T1078, T1548.003, T1059.004`,
  `## AI Investigation Report\n\n**Alert:** Suspicious Download via certutil.exe\n**Severity:** HIGH\n**Verdict:** Suspicious (Confidence: 72%)\n\n**Summary:** certutil.exe used to download remote payload to temp directory. File executed 12 seconds post-download. Consistent with known download cradle techniques.\n\n**MITRE ATT&CK:** T1105, T1059.003, T1204.002`,
  `## AI Investigation Report\n\n**Alert:** Privilege Escalation via Service Account\n**Severity:** HIGH\n**Verdict:** Likely True Positive (Confidence: 81%)\n\n**Summary:** svc_deploy performed unauthorized privilege escalation on app-server-05. New local admin user created and added to Domain Admins within 2 minutes.\n\n**MITRE ATT&CK:** T1078.002, T1136.002, T1098`,
  `## AI Investigation Report\n\n**Alert:** Large Data Transfer to External Storage\n**Severity:** MEDIUM\n**Verdict:** Requires Investigation (Confidence: 65%)\n\n**Summary:** 2.3GB uploaded to Mega.nz from finance-workstation-12 outside business hours. User j.martinez from Finance department.\n\n**MITRE ATT&CK:** T1567, T1048`,
]

const AI_EXPLAIN_PROMPTS = [
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

const AI_EXPLAIN_RESPONSES = [
  `## Explainable AI: PowerShell Abuse (T1059.001)\n\nPowerShell is a legitimate system administration tool frequently abused for execution and defense evasion. It provides direct access to .NET framework, WMI, and COM objects.\n\n**Detection:** Monitor encoded commands, Script Block Logging (4104), PowerShell from unusual parents.\n\n**MITRE ATT&CK:** T1059.001 — Common in APT29, FIN7, Lazarus Group campaigns.`,
  `## Explainable AI: Golden Ticket Attack\n\nA Golden Ticket attack occurs when an adversary compromises the KRBTGT password hash, allowing them to forge TGTs for any account with unrestricted access.\n\n**Detection:** Monitor for TGTs with abnormal lifetimes, DCSync attempts (Event ID 4662), anomalous ticket options.\n\n**Remediation:** Rotate KRBTGT password twice, implement PAWs, enable Advanced Audit Policy.`,
  `## Explainable AI: IDS vs IPS\n\nIDS monitors traffic passively and alerts on threats. IPS sits inline and can actively block malicious traffic.\n\n**Key Differences:** IDS is out-of-band with no latency impact; IPS is inline with minimal latency but risk of blocking legitimate traffic.\n\n**Best Practice:** Deploy IPS at perimeter, IDS internally, combine both with SIEM.`,
]

const AI_AUDIT_TARGET_COUNT = 550

function deterministicRandom(seed: number): number {
  // Simple seeded PRNG for deterministic record generation
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function deterministicPick<T>(arr: T[], seed: number): T {
  const index = Math.floor(deterministicRandom(seed) * arr.length)
  return arr[index] as T
}

function deterministicDate(seed: number, maxDaysBack: number): Date {
  const daysBack = deterministicRandom(seed) * maxDaysBack
  const hoursOffset = deterministicRandom(seed + 1000) * 24
  return subtractDuration(subtractDuration(nowDate(), daysBack, 'day'), hoursOffset, 'hour')
}

function deterministicInt(seed: number, min: number, max: number): number {
  return min + Math.floor(deterministicRandom(seed) * (max - min + 1))
}

async function seedAiAuditLogs(tenantId: string, tenantSlug: string): Promise<void> {
  const existingCount = await prisma.aiAuditLog.count({ where: { tenantId } })
  if (existingCount > 0) {
    logger.info({ tenant: tenantSlug, existingCount }, 'AI audit logs already seeded — skipping')
    return
  }

  const records: Prisma.AiAuditLogCreateManyInput[] = []

  for (let i = 0; i < AI_AUDIT_TARGET_COUNT; i++) {
    const baseSeed = i * 7 + tenantSlug.length * 31
    const action = deterministicPick(AI_AUDIT_ACTIONS, baseSeed)
    const model = deterministicPick(AI_AUDIT_MODELS, baseSeed + 1)
    const actor = deterministicPick(AI_AUDIT_ACTORS, baseSeed + 2)
    const createdAt = deterministicDate(baseSeed + 3, 60)

    let prompt: string
    let response: string
    let inputTokens: number
    let outputTokens: number
    let durationMs: number

    if (action === 'ai_hunt') {
      prompt = deterministicPick(AI_HUNT_PROMPTS, baseSeed + 4)
      response = deterministicPick(AI_HUNT_RESPONSES, baseSeed + 5)
      inputTokens = deterministicInt(baseSeed + 6, 200, 1200)
      outputTokens = deterministicInt(baseSeed + 7, 400, 2000)
      durationMs =
        model === 'rule-based'
          ? deterministicInt(baseSeed + 8, 50, 300)
          : deterministicInt(baseSeed + 8, 800, 4500)
    } else if (action === 'ai_investigate') {
      prompt = deterministicPick(AI_INVESTIGATE_PROMPTS, baseSeed + 4)
      response = deterministicPick(AI_INVESTIGATE_RESPONSES, baseSeed + 5)
      inputTokens = deterministicInt(baseSeed + 6, 500, 2000)
      outputTokens = deterministicInt(baseSeed + 7, 600, 2500)
      durationMs =
        model === 'rule-based'
          ? deterministicInt(baseSeed + 8, 100, 500)
          : deterministicInt(baseSeed + 8, 1200, 6000)
    } else {
      prompt = deterministicPick(AI_EXPLAIN_PROMPTS, baseSeed + 4)
      response = deterministicPick(AI_EXPLAIN_RESPONSES, baseSeed + 5)
      inputTokens = deterministicInt(baseSeed + 6, 100, 900)
      outputTokens = deterministicInt(baseSeed + 7, 300, 1800)
      durationMs =
        model === 'rule-based'
          ? deterministicInt(baseSeed + 8, 50, 200)
          : deterministicInt(baseSeed + 8, 600, 3000)
    }

    if (model === 'rule-based') {
      inputTokens = 0
      outputTokens = 0
    }

    records.push({
      tenantId,
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

  // Batch insert in chunks of 50 (rule 35: batch in chunks)
  for (let i = 0; i < records.length; i += 50) {
    const chunk = records.slice(i, i + 50)
    await prisma.aiAuditLog.createMany({ data: chunk, skipDuplicates: true })
  }
}

// ─── Phase 1-4 Seed Functions ──────────────────────────────────

// Global counters for unique numbers across tenants
let globalIncidentCounter = 0
let globalCorrelationRuleCounter = 0
let globalAttackPathCounter = 0
let globalDetectionRuleCounter = 0

// ─── 1. Incidents ─────────────────────────────────────────────

async function seedIncidents(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const existingIncident = await prisma.incident.findFirst({ where: { tenantId } })
    if (existingIncident) {
      logger.info({ tenant: tenantSlug }, 'Incidents already seeded — skipping')
      return
    }

    const year = getYear()
    const incidents = [
      {
        title: 'Ransomware Outbreak on Finance Servers',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.contained,
        category: IncidentCategory.malware,
        tactics: ['Impact'],
        techniques: ['T1486'],
      },
      {
        title: 'Spear Phishing Campaign Targeting Executives',
        severity: IncidentSeverity.high,
        status: IncidentStatus.in_progress,
        category: IncidentCategory.phishing,
        tactics: ['Initial Access'],
        techniques: ['T1566.001'],
      },
      {
        title: 'Brute Force Attack on VPN Gateway',
        severity: IncidentSeverity.high,
        status: IncidentStatus.resolved,
        category: IncidentCategory.brute_force,
        tactics: ['Credential Access'],
        techniques: ['T1110.001'],
      },
      {
        title: 'Insider Data Exfiltration via USB',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.in_progress,
        category: IncidentCategory.insider,
        tactics: ['Exfiltration'],
        techniques: ['T1052.001'],
      },
      {
        title: 'SQL Injection on Public Web Application',
        severity: IncidentSeverity.high,
        status: IncidentStatus.resolved,
        category: IncidentCategory.intrusion,
        tactics: ['Initial Access'],
        techniques: ['T1190'],
      },
      {
        title: 'Cobalt Strike Beacon Detected on Workstation',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.contained,
        category: IncidentCategory.malware,
        tactics: ['Command and Control'],
        techniques: ['T1071.001'],
      },
      {
        title: 'Unauthorized Cloud Storage Access',
        severity: IncidentSeverity.medium,
        status: IncidentStatus.open,
        category: IncidentCategory.cloud,
        tactics: ['Collection'],
        techniques: ['T1530'],
      },
      {
        title: 'DDoS Attack on Customer Portal',
        severity: IncidentSeverity.high,
        status: IncidentStatus.resolved,
        category: IncidentCategory.dos,
        tactics: ['Impact'],
        techniques: ['T1498.001'],
      },
      {
        title: 'Credential Stuffing on Employee Portal',
        severity: IncidentSeverity.medium,
        status: IncidentStatus.closed,
        category: IncidentCategory.brute_force,
        tactics: ['Credential Access'],
        techniques: ['T1110.004'],
      },
      {
        title: 'Lateral Movement via Pass-the-Hash',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.in_progress,
        category: IncidentCategory.intrusion,
        tactics: ['Lateral Movement'],
        techniques: ['T1550.002'],
      },
      {
        title: 'Supply Chain Compromise via NPM Package',
        severity: IncidentSeverity.high,
        status: IncidentStatus.open,
        category: IncidentCategory.intrusion,
        tactics: ['Initial Access'],
        techniques: ['T1195.002'],
      },
      {
        title: 'Cryptominer Deployed on Build Servers',
        severity: IncidentSeverity.medium,
        status: IncidentStatus.resolved,
        category: IncidentCategory.malware,
        tactics: ['Impact'],
        techniques: ['T1496'],
      },
      {
        title: 'Phishing Email with Macro-Enabled Document',
        severity: IncidentSeverity.high,
        status: IncidentStatus.closed,
        category: IncidentCategory.phishing,
        tactics: ['Execution'],
        techniques: ['T1204.002'],
      },
      {
        title: 'Active Directory Golden Ticket Attack',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.contained,
        category: IncidentCategory.intrusion,
        tactics: ['Credential Access'],
        techniques: ['T1558.001'],
      },
      {
        title: 'Data Exfiltration via DNS Tunneling',
        severity: IncidentSeverity.high,
        status: IncidentStatus.in_progress,
        category: IncidentCategory.exfiltration,
        tactics: ['Exfiltration'],
        techniques: ['T1048.003'],
      },
      {
        title: 'Rogue Wireless Access Point Detected',
        severity: IncidentSeverity.medium,
        status: IncidentStatus.resolved,
        category: IncidentCategory.intrusion,
        tactics: ['Initial Access'],
        techniques: ['T1200'],
      },
      {
        title: 'Web Shell Deployed on IIS Server',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.contained,
        category: IncidentCategory.malware,
        tactics: ['Persistence'],
        techniques: ['T1505.003'],
      },
      {
        title: 'Privilege Escalation via Kernel Exploit',
        severity: IncidentSeverity.critical,
        status: IncidentStatus.in_progress,
        category: IncidentCategory.intrusion,
        tactics: ['Privilege Escalation'],
        techniques: ['T1068'],
      },
      {
        title: 'Suspicious PowerShell Empire Activity',
        severity: IncidentSeverity.high,
        status: IncidentStatus.open,
        category: IncidentCategory.malware,
        tactics: ['Execution'],
        techniques: ['T1059.001'],
      },
      {
        title: 'Unauthorized VPN Connection from Foreign IP',
        severity: IncidentSeverity.medium,
        status: IncidentStatus.closed,
        category: IncidentCategory.other,
        tactics: ['Initial Access'],
        techniques: ['T1133'],
      },
    ]

    const timelineTemplates = [
      {
        event: 'Incident created and assigned to SOC team',
        actorType: IncidentActorType.system,
        actorName: 'AuraSpear SIEM',
      },
      {
        event: 'Initial triage completed — confirmed as true positive',
        actorType: IncidentActorType.user,
        actorName: `analyst.l2@${tenantSlug}.io`,
      },
      {
        event: 'Containment actions initiated — affected hosts isolated',
        actorType: IncidentActorType.user,
        actorName: `analyst.l2@${tenantSlug}.io`,
      },
      {
        event: 'AI agent performed automated IOC enrichment',
        actorType: IncidentActorType.ai_agent,
        actorName: 'Sentinel AI Agent',
      },
      {
        event: 'Forensic evidence collected from affected endpoints',
        actorType: IncidentActorType.user,
        actorName: `hunter@${tenantSlug}.io`,
      },
      {
        event: 'Remediation steps applied — patches deployed',
        actorType: IncidentActorType.user,
        actorName: `admin@${tenantSlug}.io`,
      },
    ]

    for (let i = 0; i < incidents.length; i++) {
      globalIncidentCounter++
      const inc = incidents[i]!
      const incidentNumber = `INC-${year}-${String(globalIncidentCounter).padStart(4, '0')}`

      const createdAt = subtractDuration(nowDate(), (incidents.length - i) * 2, 'day')
      const timelineCount = 3 + (i % 4) // 3-6 entries

      await prisma.incident.upsert({
        where: { incidentNumber },
        update: {
          tenantId,
          title: inc.title,
          description: `Incident detected: ${inc.title}. Investigation and response procedures initiated per SOC playbook.`,
          severity: inc.severity,
          status: inc.status,
          category: inc.category,
          mitreTactics: inc.tactics,
          mitreTechniques: inc.techniques,
          createdBy: `analyst.l2@${tenantSlug}.io`,
          resolvedAt:
            inc.status === IncidentStatus.resolved || inc.status === IncidentStatus.closed
              ? addDuration(createdAt, 3, 'day')
              : null,
        },
        create: {
          tenantId,
          incidentNumber,
          title: inc.title,
          description: `Incident detected: ${inc.title}. Investigation and response procedures initiated per SOC playbook.`,
          severity: inc.severity,
          status: inc.status,
          category: inc.category,
          mitreTactics: inc.tactics,
          mitreTechniques: inc.techniques,
          createdBy: `analyst.l2@${tenantSlug}.io`,
          resolvedAt:
            inc.status === IncidentStatus.resolved || inc.status === IncidentStatus.closed
              ? addDuration(createdAt, 3, 'day')
              : null,
          createdAt,
          timeline: {
            create: Array.from({ length: timelineCount }, (_, j) => {
              const tmpl = timelineTemplates[j % timelineTemplates.length]!
              return {
                event: tmpl.event,
                actorType: tmpl.actorType,
                actorName: tmpl.actorName,
                timestamp: addDuration(createdAt, j, 'hour'),
              }
            }),
          },
        },
      })
    }

    logger.info({ tenant: tenantSlug, count: incidents.length }, 'Seeded incidents')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed incidents')
  }
}

// ─── 2. Correlation Rules ─────────────────────────────────────

async function seedCorrelationRules(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const year = getYear()
    const rules = [
      {
        title: 'Multiple Failed Logins Followed by Success',
        source: RuleSource.sigma,
        severity: RuleSeverity.high,
        status: RuleStatus.active,
        tactics: ['Credential Access'],
        techniques: ['T1110'],
        hitCount: 234,
      },
      {
        title: 'PowerShell Download Cradle Detection',
        source: RuleSource.sigma,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Execution'],
        techniques: ['T1059.001'],
        hitCount: 89,
      },
      {
        title: 'Suspicious DNS Query Volume',
        source: RuleSource.custom,
        severity: RuleSeverity.medium,
        status: RuleStatus.active,
        tactics: ['Exfiltration'],
        techniques: ['T1048.003'],
        hitCount: 156,
      },
      {
        title: 'LSASS Memory Access by Non-System Process',
        source: RuleSource.sigma,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Credential Access'],
        techniques: ['T1003.001'],
        hitCount: 12,
      },
      {
        title: 'Lateral Movement via WMI',
        source: RuleSource.sigma,
        severity: RuleSeverity.high,
        status: RuleStatus.active,
        tactics: ['Lateral Movement'],
        techniques: ['T1047'],
        hitCount: 67,
      },
      {
        title: 'Ransomware File Rename Pattern',
        source: RuleSource.custom,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Impact'],
        techniques: ['T1486'],
        hitCount: 3,
      },
      {
        title: 'Anomalous Outbound Data Transfer',
        source: RuleSource.ai_generated,
        severity: RuleSeverity.high,
        status: RuleStatus.active,
        tactics: ['Exfiltration'],
        techniques: ['T1041'],
        hitCount: 45,
      },
      {
        title: 'Scheduled Task Persistence',
        source: RuleSource.sigma,
        severity: RuleSeverity.medium,
        status: RuleStatus.active,
        tactics: ['Persistence'],
        techniques: ['T1053.005'],
        hitCount: 178,
      },
      {
        title: 'Registry Run Key Modification',
        source: RuleSource.sigma,
        severity: RuleSeverity.medium,
        status: RuleStatus.active,
        tactics: ['Persistence'],
        techniques: ['T1547.001'],
        hitCount: 312,
      },
      {
        title: 'Kerberoasting SPN Request Spike',
        source: RuleSource.custom,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Credential Access'],
        techniques: ['T1558.003'],
        hitCount: 8,
      },
      {
        title: 'DLL Side-Loading from Temp Directory',
        source: RuleSource.sigma,
        severity: RuleSeverity.high,
        status: RuleStatus.review,
        tactics: ['Defense Evasion'],
        techniques: ['T1574.002'],
        hitCount: 23,
      },
      {
        title: 'RDP Brute Force from External IP',
        source: RuleSource.custom,
        severity: RuleSeverity.high,
        status: RuleStatus.active,
        tactics: ['Credential Access'],
        techniques: ['T1110.001'],
        hitCount: 567,
      },
      {
        title: 'Process Injection via WriteProcessMemory',
        source: RuleSource.sigma,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Defense Evasion'],
        techniques: ['T1055'],
        hitCount: 19,
      },
      {
        title: 'Suspicious certutil.exe Usage',
        source: RuleSource.sigma,
        severity: RuleSeverity.medium,
        status: RuleStatus.active,
        tactics: ['Defense Evasion'],
        techniques: ['T1140'],
        hitCount: 98,
      },
      {
        title: 'Cloud API Enumeration Spike',
        source: RuleSource.ai_generated,
        severity: RuleSeverity.medium,
        status: RuleStatus.active,
        tactics: ['Discovery'],
        techniques: ['T1580'],
        hitCount: 34,
      },
      {
        title: 'Unusual Parent-Child Process Relationship',
        source: RuleSource.ai_generated,
        severity: RuleSeverity.high,
        status: RuleStatus.review,
        tactics: ['Execution'],
        techniques: ['T1059'],
        hitCount: 145,
      },
      {
        title: 'Shadow Copy Deletion Detected',
        source: RuleSource.sigma,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Impact'],
        techniques: ['T1490'],
        hitCount: 5,
      },
      {
        title: 'Beacon Communication Pattern Detected',
        source: RuleSource.ai_generated,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Command and Control'],
        techniques: ['T1071.001'],
        hitCount: 27,
      },
      {
        title: 'Email with Malicious Attachment Hash',
        source: RuleSource.custom,
        severity: RuleSeverity.high,
        status: RuleStatus.active,
        tactics: ['Initial Access'],
        techniques: ['T1566.001'],
        hitCount: 89,
      },
      {
        title: 'SMB Share Enumeration',
        source: RuleSource.sigma,
        severity: RuleSeverity.low,
        status: RuleStatus.active,
        tactics: ['Discovery'],
        techniques: ['T1135'],
        hitCount: 1023,
      },
      {
        title: 'Mimikatz Command Line Arguments',
        source: RuleSource.sigma,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Credential Access'],
        techniques: ['T1003'],
        hitCount: 7,
      },
      {
        title: 'Abnormal Service Installation',
        source: RuleSource.custom,
        severity: RuleSeverity.medium,
        status: RuleStatus.disabled,
        tactics: ['Persistence'],
        techniques: ['T1543.003'],
        hitCount: 456,
      },
      {
        title: 'DNS Over HTTPS Evasion',
        source: RuleSource.ai_generated,
        severity: RuleSeverity.medium,
        status: RuleStatus.active,
        tactics: ['Command and Control'],
        techniques: ['T1071.004'],
        hitCount: 78,
      },
      {
        title: 'Credential Dumping via ntdsutil',
        source: RuleSource.sigma,
        severity: RuleSeverity.critical,
        status: RuleStatus.active,
        tactics: ['Credential Access'],
        techniques: ['T1003.003'],
        hitCount: 2,
      },
      {
        title: 'Suspicious Office Macro Execution',
        source: RuleSource.sigma,
        severity: RuleSeverity.high,
        status: RuleStatus.active,
        tactics: ['Execution'],
        techniques: ['T1204.002'],
        hitCount: 167,
      },
    ]

    for (let i = 0; i < rules.length; i++) {
      globalCorrelationRuleCounter++
      const rule = rules[i]!
      const ruleNumber = `CR-${year}-${String(globalCorrelationRuleCounter).padStart(4, '0')}`

      await prisma.correlationRule.upsert({
        where: { ruleNumber },
        update: {
          tenantId,
          title: rule.title,
          description: `Sigma/Custom correlation rule: ${rule.title}. Detects suspicious activity matching MITRE ATT&CK ${rule.techniques.join(', ')}.`,
          source: rule.source,
          severity: rule.severity,
          status: rule.status,
          mitreTactics: rule.tactics,
          mitreTechniques: rule.techniques,
          hitCount: rule.hitCount,
          linkedIncidents: Math.floor(rule.hitCount / 50),
          createdBy: `analyst.l2@${tenantSlug}.io`,
          lastFiredAt: rule.hitCount > 0 ? randomDate(7) : null,
          yamlContent:
            rule.source === RuleSource.sigma
              ? `title: ${rule.title}\nstatus: ${rule.status}\nlevel: ${rule.severity}\ndetection:\n  selection:\n    EventID: 4625\n  condition: selection`
              : null,
        },
        create: {
          tenantId,
          ruleNumber,
          title: rule.title,
          description: `Sigma/Custom correlation rule: ${rule.title}. Detects suspicious activity matching MITRE ATT&CK ${rule.techniques.join(', ')}.`,
          source: rule.source,
          severity: rule.severity,
          status: rule.status,
          mitreTactics: rule.tactics,
          mitreTechniques: rule.techniques,
          hitCount: rule.hitCount,
          linkedIncidents: Math.floor(rule.hitCount / 50),
          createdBy: `analyst.l2@${tenantSlug}.io`,
          lastFiredAt: rule.hitCount > 0 ? randomDate(7) : null,
          yamlContent:
            rule.source === RuleSource.sigma
              ? `title: ${rule.title}\nstatus: ${rule.status}\nlevel: ${rule.severity}\ndetection:\n  selection:\n    EventID: 4625\n  condition: selection`
              : null,
        },
      })
    }

    logger.info({ tenant: tenantSlug, count: rules.length }, 'Seeded correlation rules')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed correlation rules')
  }
}

// ─── 3. Vulnerabilities ───────────────────────────────────────

async function seedVulnerabilities(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const vulns = [
      {
        cveId: 'CVE-2024-21762',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 12,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Fortinet FortiOS',
        desc: 'Out-of-bound write vulnerability in FortiOS SSL VPN allowing remote code execution.',
      },
      {
        cveId: 'CVE-2024-3094',
        cvss: 10.0,
        severity: VulnerabilitySeverity.critical,
        hosts: 3,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'XZ Utils 5.6.0-5.6.1',
        desc: 'Backdoor in XZ Utils allowing unauthorized SSH access via liblzma.',
      },
      {
        cveId: 'CVE-2024-21887',
        cvss: 9.1,
        severity: VulnerabilitySeverity.critical,
        hosts: 4,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'Ivanti Connect Secure',
        desc: 'Command injection in Ivanti Connect Secure web components.',
      },
      {
        cveId: 'CVE-2023-46805',
        cvss: 8.2,
        severity: VulnerabilitySeverity.high,
        hosts: 4,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Ivanti Connect Secure',
        desc: 'Authentication bypass in Ivanti Connect Secure and Policy Secure.',
      },
      {
        cveId: 'CVE-2024-1709',
        cvss: 10.0,
        severity: VulnerabilitySeverity.critical,
        hosts: 2,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'ConnectWise ScreenConnect',
        desc: 'Authentication bypass allowing unauthorized access to ScreenConnect.',
      },
      {
        cveId: 'CVE-2024-1708',
        cvss: 8.4,
        severity: VulnerabilitySeverity.high,
        hosts: 2,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'ConnectWise ScreenConnect',
        desc: 'Path traversal in ScreenConnect allowing remote code execution.',
      },
      {
        cveId: 'CVE-2024-23897',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Jenkins',
        desc: 'Arbitrary file read via Jenkins CLI args4j parser.',
      },
      {
        cveId: 'CVE-2024-27198',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'JetBrains TeamCity',
        desc: 'Authentication bypass in TeamCity allowing admin access.',
      },
      {
        cveId: 'CVE-2023-44228',
        cvss: 10.0,
        severity: VulnerabilitySeverity.critical,
        hosts: 8,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Apache Log4j',
        desc: 'Remote code execution via JNDI injection in Log4j (Log4Shell follow-up).',
      },
      {
        cveId: 'CVE-2024-38063',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 45,
        exploit: false,
        patch: PatchStatus.scheduled,
        software: 'Windows TCP/IP',
        desc: 'Remote code execution via IPv6 packets in Windows TCP/IP stack.',
      },
      {
        cveId: 'CVE-2024-30088',
        cvss: 8.8,
        severity: VulnerabilitySeverity.high,
        hosts: 23,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Windows Kernel',
        desc: 'Windows Kernel elevation of privilege vulnerability.',
      },
      {
        cveId: 'CVE-2024-4577',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 3,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'PHP CGI',
        desc: 'Argument injection in PHP CGI on Windows allowing RCE.',
      },
      {
        cveId: 'CVE-2024-28986',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'SolarWinds Web Help Desk',
        desc: 'Java deserialization RCE in SolarWinds Web Help Desk.',
      },
      {
        cveId: 'CVE-2024-5274',
        cvss: 8.8,
        severity: VulnerabilitySeverity.high,
        hosts: 67,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Google Chrome V8',
        desc: 'Type confusion in V8 JavaScript engine allowing sandbox escape.',
      },
      {
        cveId: 'CVE-2024-4671',
        cvss: 8.8,
        severity: VulnerabilitySeverity.high,
        hosts: 67,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Google Chrome Visuals',
        desc: 'Use-after-free in Chrome Visuals component.',
      },
      {
        cveId: 'CVE-2024-21413',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 34,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Microsoft Outlook',
        desc: 'Remote code execution via malicious hyperlink in Outlook (MonikerLink).',
      },
      {
        cveId: 'CVE-2024-21412',
        cvss: 8.1,
        severity: VulnerabilitySeverity.high,
        hosts: 45,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Windows SmartScreen',
        desc: 'Security feature bypass in Windows SmartScreen.',
      },
      {
        cveId: 'CVE-2024-20353',
        cvss: 8.6,
        severity: VulnerabilitySeverity.high,
        hosts: 2,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Cisco ASA/FTD',
        desc: 'Denial of service in Cisco ASA/FTD web services.',
      },
      {
        cveId: 'CVE-2024-20359',
        cvss: 6.0,
        severity: VulnerabilitySeverity.medium,
        hosts: 2,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Cisco ASA',
        desc: 'Persistent local code execution in Cisco ASA.',
      },
      {
        cveId: 'CVE-2024-3400',
        cvss: 10.0,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Palo Alto PAN-OS',
        desc: 'Command injection in GlobalProtect allowing root RCE.',
      },
      {
        cveId: 'CVE-2024-6387',
        cvss: 8.1,
        severity: VulnerabilitySeverity.high,
        hosts: 89,
        exploit: false,
        patch: PatchStatus.scheduled,
        software: 'OpenSSH',
        desc: 'Signal handler race condition (regreSSHion) allowing root RCE.',
      },
      {
        cveId: 'CVE-2024-29824',
        cvss: 9.6,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'Ivanti EPM',
        desc: 'SQL injection in Ivanti Endpoint Manager Core server.',
      },
      {
        cveId: 'CVE-2024-0012',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'Palo Alto PAN-OS',
        desc: 'Authentication bypass in PAN-OS management interface.',
      },
      {
        cveId: 'CVE-2024-9474',
        cvss: 7.2,
        severity: VulnerabilitySeverity.high,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'Palo Alto PAN-OS',
        desc: 'Privilege escalation in PAN-OS management interface.',
      },
      {
        cveId: 'CVE-2024-47575',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'FortiManager',
        desc: 'Missing authentication in FortiManager fgfmd daemon.',
      },
      {
        cveId: 'CVE-2024-11477',
        cvss: 7.8,
        severity: VulnerabilitySeverity.high,
        hosts: 120,
        exploit: false,
        patch: PatchStatus.scheduled,
        software: '7-Zip',
        desc: 'Integer underflow in 7-Zip Zstandard decompression.',
      },
      {
        cveId: 'CVE-2024-43451',
        cvss: 6.5,
        severity: VulnerabilitySeverity.medium,
        hosts: 45,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Windows NTLM',
        desc: 'NTLM hash disclosure via NTLMv2 hash in crafted file.',
      },
      {
        cveId: 'CVE-2024-49039',
        cvss: 8.8,
        severity: VulnerabilitySeverity.high,
        hosts: 45,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Windows Task Scheduler',
        desc: 'Privilege escalation via Windows Task Scheduler.',
      },
      {
        cveId: 'CVE-2023-36884',
        cvss: 8.8,
        severity: VulnerabilitySeverity.high,
        hosts: 34,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Microsoft Office',
        desc: 'HTML RCE via crafted Office document (Storm-0978).',
      },
      {
        cveId: 'CVE-2023-38831',
        cvss: 7.8,
        severity: VulnerabilitySeverity.high,
        hosts: 56,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'WinRAR',
        desc: 'Code execution when opening crafted RAR archive.',
      },
      {
        cveId: 'CVE-2024-20698',
        cvss: 7.8,
        severity: VulnerabilitySeverity.high,
        hosts: 45,
        exploit: false,
        patch: PatchStatus.scheduled,
        software: 'Windows Kernel',
        desc: 'Windows Kernel elevation of privilege vulnerability.',
      },
      {
        cveId: 'CVE-2024-30051',
        cvss: 7.8,
        severity: VulnerabilitySeverity.high,
        hosts: 45,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'Windows DWM',
        desc: 'Windows DWM Core Library elevation of privilege.',
      },
      {
        cveId: 'CVE-2024-21338',
        cvss: 7.8,
        severity: VulnerabilitySeverity.high,
        hosts: 45,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Windows Kernel',
        desc: 'AppLocker bypass via Windows Kernel vulnerability (Lazarus Group).',
      },
      {
        cveId: 'CVE-2024-24919',
        cvss: 8.6,
        severity: VulnerabilitySeverity.high,
        hosts: 3,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Check Point Quantum',
        desc: 'Information disclosure in Check Point Security Gateways.',
      },
      {
        cveId: 'CVE-2024-40711',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'Veeam Backup',
        desc: 'Unauthenticated RCE in Veeam Backup & Replication.',
      },
      {
        cveId: 'CVE-2024-29973',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 2,
        exploit: true,
        patch: PatchStatus.patch_pending,
        software: 'Zyxel NAS',
        desc: 'Command injection in Zyxel NAS devices.',
      },
      {
        cveId: 'CVE-2024-36401',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'GeoServer',
        desc: 'RCE via OGC filter evaluation in GeoServer.',
      },
      {
        cveId: 'CVE-2024-22252',
        cvss: 9.3,
        severity: VulnerabilitySeverity.critical,
        hosts: 5,
        exploit: false,
        patch: PatchStatus.scheduled,
        software: 'VMware ESXi',
        desc: 'Use-after-free in VMware ESXi XHCI USB controller.',
      },
      {
        cveId: 'CVE-2024-37085',
        cvss: 7.2,
        severity: VulnerabilitySeverity.high,
        hosts: 5,
        exploit: true,
        patch: PatchStatus.patching,
        software: 'VMware ESXi',
        desc: 'Authentication bypass in VMware ESXi Active Directory integration.',
      },
      {
        cveId: 'CVE-2024-23113',
        cvss: 9.8,
        severity: VulnerabilitySeverity.critical,
        hosts: 1,
        exploit: true,
        patch: PatchStatus.mitigated,
        software: 'Fortinet FortiOS',
        desc: 'Format string vulnerability in FortiOS fgfmd daemon.',
      },
    ]

    for (const v of vulns) {
      const remediation =
        v.patch === PatchStatus.mitigated
          ? `Patch applied. Verify all instances of ${v.software} are updated.`
          : `Update ${v.software} to latest version. Apply vendor workarounds if patch unavailable.`
      const discoveredAt = randomDate(90)
      const patchedAt = v.patch === PatchStatus.mitigated ? randomDate(30) : null

      await prisma.vulnerability.upsert({
        where: { tenantId_cveId: { tenantId, cveId: v.cveId } },
        update: {
          cvssScore: v.cvss,
          severity: v.severity,
          description: v.desc,
          affectedHosts: v.hosts,
          exploitAvailable: v.exploit,
          patchStatus: v.patch,
          affectedSoftware: v.software,
          remediation,
          discoveredAt,
          patchedAt,
        },
        create: {
          tenantId,
          cveId: v.cveId,
          cvssScore: v.cvss,
          severity: v.severity,
          description: v.desc,
          affectedHosts: v.hosts,
          exploitAvailable: v.exploit,
          patchStatus: v.patch,
          affectedSoftware: v.software,
          remediation,
          discoveredAt,
          patchedAt,
        },
      })
    }

    logger.info({ tenant: tenantSlug, count: vulns.length }, 'Seeded vulnerabilities')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed vulnerabilities')
  }
}

// ─── 4. AI Agents ─────────────────────────────────────────────

async function seedAiAgents(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const agents = [
      {
        name: 'Sentinel Triage Agent',
        description: 'Automated alert triage and initial classification using behavioral analysis.',
        model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
        tier: AiAgentTier.L1,
        status: AiAgentStatus.online,
        totalTasks: 4523,
        totalTokens: BigInt(12500000),
        totalCost: 187.5,
        avgTimeMs: 2300,
        tools: [
          {
            name: 'alert_classify',
            description: 'Classifies alerts by severity and type using ML models',
            schema: { type: 'object', properties: { alertId: { type: 'string' } } },
          },
          {
            name: 'ioc_enrich',
            description: 'Enriches IOCs with threat intelligence feeds',
            schema: {
              type: 'object',
              properties: { iocValue: { type: 'string' }, iocType: { type: 'string' } },
            },
          },
        ],
        sessions: [
          {
            input: 'Classify alert: Multiple failed SSH logins from 203.0.113.42',
            output:
              'Classification: Brute Force Attack (T1110.001). Severity: HIGH. Confidence: 92%.',
            tokensUsed: 850,
            cost: 0.013,
            durationMs: 1800,
            status: AiAgentSessionStatus.completed,
          },
          {
            input: 'Classify alert: Suspicious PowerShell encoded command',
            output:
              'Classification: Malicious Script Execution (T1059.001). Severity: CRITICAL. Confidence: 88%.',
            tokensUsed: 920,
            cost: 0.014,
            durationMs: 2100,
            status: AiAgentSessionStatus.completed,
          },
          {
            input: 'Enrich IOC: evil-domain.xyz',
            output:
              'Domain registered 3 days ago. Hosting: bulletproof. Associated with LockBit ransomware campaign.',
            tokensUsed: 1200,
            cost: 0.018,
            durationMs: 3400,
            status: AiAgentSessionStatus.completed,
          },
        ],
      },
      {
        name: 'Hunt Orchestrator',
        description:
          'Coordinates threat hunting campaigns using natural language queries across data sources.',
        model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
        tier: AiAgentTier.L2,
        status: AiAgentStatus.online,
        totalTasks: 1287,
        totalTokens: BigInt(8900000),
        totalCost: 133.5,
        avgTimeMs: 4500,
        tools: [
          {
            name: 'query_wazuh',
            description: 'Executes search queries against Wazuh indices',
            schema: {
              type: 'object',
              properties: { query: { type: 'string' }, timeRange: { type: 'string' } },
            },
          },
          {
            name: 'query_graylog',
            description: 'Searches Graylog streams for matching events',
            schema: { type: 'object', properties: { query: { type: 'string' } } },
          },
          {
            name: 'correlate_events',
            description: 'Correlates events across multiple data sources',
            schema: {
              type: 'object',
              properties: { eventIds: { type: 'array', items: { type: 'string' } } },
            },
          },
        ],
        sessions: [
          {
            input: 'Hunt for lateral movement via SMB in the last 48 hours',
            output:
              'Found 23 suspicious SMB sessions. 3 endpoints show signs of pass-the-hash. Recommend isolation.',
            tokensUsed: 2100,
            cost: 0.032,
            durationMs: 5600,
            status: AiAgentSessionStatus.completed,
          },
          {
            input: 'Detect DNS tunneling activity',
            output:
              'Identified beaconing pattern from workstation-17 to update-service.xyz. 47MB exfiltrated.',
            tokensUsed: 1800,
            cost: 0.027,
            durationMs: 4200,
            status: AiAgentSessionStatus.completed,
          },
        ],
      },
      {
        name: 'Incident Responder',
        description:
          'Automated incident response orchestration with containment and remediation actions.',
        model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
        tier: AiAgentTier.L2,
        status: AiAgentStatus.online,
        totalTasks: 892,
        totalTokens: BigInt(6200000),
        totalCost: 93.0,
        avgTimeMs: 3800,
        tools: [
          {
            name: 'isolate_host',
            description: 'Isolates a host from the network via EDR',
            schema: { type: 'object', properties: { hostname: { type: 'string' } } },
          },
          {
            name: 'block_ioc',
            description: 'Blocks an IOC at firewall/proxy level',
            schema: {
              type: 'object',
              properties: { iocValue: { type: 'string' }, iocType: { type: 'string' } },
            },
          },
        ],
        sessions: [
          {
            input: 'Contain host: workstation-101 (suspected ransomware)',
            output: 'Host isolated via EDR. Snapshot captured. Network quarantine applied.',
            tokensUsed: 650,
            cost: 0.01,
            durationMs: 2800,
            status: AiAgentSessionStatus.completed,
          },
          {
            input: 'Block C2 domain: evil-domain.xyz',
            output: 'Domain blocked on proxy, DNS sinkhole configured, firewall rules updated.',
            tokensUsed: 580,
            cost: 0.009,
            durationMs: 1900,
            status: AiAgentSessionStatus.completed,
          },
          {
            input: 'Remediate CVE-2024-21762 on FortiGate devices',
            output: null,
            tokensUsed: 0,
            cost: 0,
            durationMs: 0,
            status: AiAgentSessionStatus.running,
          },
        ],
      },
      {
        name: 'Compliance Auditor',
        description:
          'Evaluates security controls against compliance frameworks and generates reports.',
        model: 'anthropic.claude-3-haiku-20240307-v1:0',
        tier: AiAgentTier.L1,
        status: AiAgentStatus.online,
        totalTasks: 234,
        totalTokens: BigInt(3100000),
        totalCost: 15.5,
        avgTimeMs: 1800,
        tools: [
          {
            name: 'assess_control',
            description: 'Assesses a compliance control against evidence',
            schema: {
              type: 'object',
              properties: { controlId: { type: 'string' }, framework: { type: 'string' } },
            },
          },
        ],
        sessions: [
          {
            input: 'Assess ISO 27001 A.12.4.1 Event Logging',
            output: 'Control PASSED. Centralized logging via Wazuh+Graylog. 98% coverage.',
            tokensUsed: 450,
            cost: 0.002,
            durationMs: 1200,
            status: AiAgentSessionStatus.completed,
          },
        ],
      },
      {
        name: 'Vulnerability Prioritizer',
        description:
          'Prioritizes vulnerabilities based on asset criticality, exploit availability, and threat context.',
        model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
        tier: AiAgentTier.L3,
        status: AiAgentStatus.degraded,
        totalTasks: 567,
        totalTokens: BigInt(4800000),
        totalCost: 72.0,
        avgTimeMs: 3200,
        tools: [
          {
            name: 'score_vulnerability',
            description: 'Calculates risk-adjusted vulnerability score',
            schema: { type: 'object', properties: { cveId: { type: 'string' } } },
          },
          {
            name: 'map_assets',
            description: 'Maps vulnerable assets to business criticality',
            schema: {
              type: 'object',
              properties: { assetIds: { type: 'array', items: { type: 'string' } } },
            },
          },
        ],
        sessions: [
          {
            input: 'Prioritize CVE-2024-3094 for remediation',
            output:
              'CRITICAL priority. XZ Utils backdoor affects 3 SSH-exposed servers. Exploit in the wild. Immediate patching required.',
            tokensUsed: 1100,
            cost: 0.017,
            durationMs: 2900,
            status: AiAgentSessionStatus.completed,
          },
          {
            input: 'Assess risk of CVE-2024-6387 across infrastructure',
            output: null,
            tokensUsed: 200,
            cost: 0.003,
            durationMs: 15000,
            status: AiAgentSessionStatus.failed,
          },
        ],
      },
      {
        name: 'Report Generator',
        description:
          'Generates executive and technical security reports with AI-powered analysis summaries.',
        model: 'anthropic.claude-3-haiku-20240307-v1:0',
        tier: AiAgentTier.L0,
        status: AiAgentStatus.maintenance,
        totalTasks: 145,
        totalTokens: BigInt(2000000),
        totalCost: 10.0,
        avgTimeMs: 5500,
        tools: [
          {
            name: 'generate_report',
            description: 'Generates formatted security reports',
            schema: {
              type: 'object',
              properties: { reportType: { type: 'string' }, dateRange: { type: 'string' } },
            },
          },
        ],
        sessions: [
          {
            input: 'Generate weekly executive summary',
            output:
              'Executive Security Report generated. 12 critical alerts, 4 incidents, 2 resolved. Threat level: ELEVATED.',
            tokensUsed: 3200,
            cost: 0.016,
            durationMs: 8500,
            status: AiAgentSessionStatus.completed,
          },
        ],
      },
    ]

    for (const agent of agents) {
      try {
        const existing = await prisma.aiAgent.findFirst({
          where: { tenantId, name: agent.name },
          select: { id: true },
        })
        if (existing) {
          continue
        }

        await prisma.aiAgent.create({
          data: {
            tenantId,
            name: agent.name,
            description: agent.description,
            model: agent.model,
            tier: agent.tier,
            status: agent.status,
            totalTasks: agent.totalTasks,
            totalTokens: agent.totalTokens,
            totalCost: agent.totalCost,
            avgTimeMs: agent.avgTimeMs,
            tools: {
              create: agent.tools.map(t => ({
                name: t.name,
                description: t.description,
                schema: t.schema as Prisma.InputJsonValue,
              })),
            },
            sessions: {
              create: agent.sessions.map((s, idx) => ({
                input: s.input,
                output: s.output,
                tokensUsed: s.tokensUsed,
                cost: s.cost,
                durationMs: s.durationMs,
                status: s.status,
                startedAt: subtractDuration(nowDate(), agent.sessions.length - idx, 'hour'),
                completedAt:
                  s.status !== AiAgentSessionStatus.running
                    ? addDuration(
                        subtractDuration(nowDate(), agent.sessions.length - idx, 'hour'),
                        s.durationMs,
                        'millisecond'
                      )
                    : null,
              })),
            },
          },
        })
      } catch (agentError) {
        logger.warn(
          { tenant: tenantSlug, agent: agent.name, error: agentError },
          'Skipped AI agent (already exists or error)'
        )
      }
    }

    logger.info({ tenant: tenantSlug, count: agents.length }, 'Seeded AI agents')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed AI agents')
  }
}

// ─── 5. UEBA ──────────────────────────────────────────────────

async function seedUeba(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const entities = [
      {
        name: 'john.doe',
        type: UebaEntityType.user,
        risk: 85.2,
        level: UebaRiskLevel.critical,
        topAnomaly: 'Impossible travel: login from 2 countries within 30 minutes',
      },
      {
        name: 'jane.smith',
        type: UebaEntityType.user,
        risk: 72.1,
        level: UebaRiskLevel.high,
        topAnomaly: 'Accessed 15 sensitive repos outside business hours',
      },
      {
        name: 'svc-backup',
        type: UebaEntityType.service_account,
        risk: 91.5,
        level: UebaRiskLevel.critical,
        topAnomaly: 'Service account used interactively from unknown workstation',
      },
      {
        name: 'web-prod-03',
        type: UebaEntityType.host,
        risk: 67.8,
        level: UebaRiskLevel.high,
        topAnomaly: 'Outbound data transfer 5x baseline to external IP',
      },
      {
        name: 'admin.ops',
        type: UebaEntityType.user,
        risk: 45.3,
        level: UebaRiskLevel.medium,
        topAnomaly: 'Password reset for 12 accounts in 5 minutes',
      },
      {
        name: 'dc-01',
        type: UebaEntityType.host,
        risk: 88.9,
        level: UebaRiskLevel.critical,
        topAnomaly: 'NTDS.dit access attempt detected',
      },
      {
        name: 'erp-app-01',
        type: UebaEntityType.application,
        risk: 34.2,
        level: UebaRiskLevel.medium,
        topAnomaly: 'Unusual API call pattern from unknown client',
      },
      {
        name: 'contractor.ext',
        type: UebaEntityType.user,
        risk: 78.4,
        level: UebaRiskLevel.high,
        topAnomaly: 'VPN connection from 3 different countries in 24 hours',
      },
      {
        name: 'svc-deploy',
        type: UebaEntityType.service_account,
        risk: 62.1,
        level: UebaRiskLevel.high,
        topAnomaly: 'Scheduled task created with encoded PowerShell payload',
      },
      {
        name: 'mail-relay-01',
        type: UebaEntityType.host,
        risk: 56.7,
        level: UebaRiskLevel.medium,
        topAnomaly: 'Outbound SMTP to 200+ unique domains in 1 hour',
      },
      {
        name: 'dev.intern',
        type: UebaEntityType.user,
        risk: 23.1,
        level: UebaRiskLevel.low,
        topAnomaly: 'Access to production database (first time)',
      },
      {
        name: 'vpn-gw-01',
        type: UebaEntityType.host,
        risk: 41.2,
        level: UebaRiskLevel.medium,
        topAnomaly: 'Failed authentication spike from Tor exit node',
      },
      {
        name: 'crm-api',
        type: UebaEntityType.application,
        risk: 15.0,
        level: UebaRiskLevel.normal,
        topAnomaly: null,
      },
      {
        name: 'mike.johnson',
        type: UebaEntityType.user,
        risk: 95.0,
        level: UebaRiskLevel.critical,
        topAnomaly: 'Downloaded 2.3GB from SharePoint before resignation notice',
      },
      {
        name: 'svc-monitoring',
        type: UebaEntityType.service_account,
        risk: 8.5,
        level: UebaRiskLevel.normal,
        topAnomaly: null,
      },
      {
        name: 'build-server-01',
        type: UebaEntityType.host,
        risk: 52.3,
        level: UebaRiskLevel.medium,
        topAnomaly: 'Cryptominer process detected consuming 98% CPU',
      },
      {
        name: 'sarah.chen',
        type: UebaEntityType.user,
        risk: 31.4,
        level: UebaRiskLevel.low,
        topAnomaly: 'Login from new device type',
      },
      {
        name: 'db-prod-01',
        type: UebaEntityType.host,
        risk: 74.6,
        level: UebaRiskLevel.high,
        topAnomaly: 'Bulk SELECT queries on PII tables from new application',
      },
      {
        name: 'ci-runner-02',
        type: UebaEntityType.host,
        risk: 28.9,
        level: UebaRiskLevel.low,
        topAnomaly: 'Outbound connection to npm registry mirror in unusual country',
      },
      {
        name: 'hr-portal',
        type: UebaEntityType.application,
        risk: 19.7,
        level: UebaRiskLevel.normal,
        topAnomaly: null,
      },
    ]

    const anomalyTemplates = [
      {
        anomalyType: 'impossible_travel',
        description:
          'Login detected from geographically distant locations within impossible travel time',
        severity: UebaRiskLevel.critical,
        score: 92.5,
      },
      {
        anomalyType: 'unusual_access_time',
        description: 'Resource access outside of normal working hours pattern',
        severity: UebaRiskLevel.medium,
        score: 45.0,
      },
      {
        anomalyType: 'data_exfiltration',
        description: 'Data transfer volume exceeds 3 standard deviations from baseline',
        severity: UebaRiskLevel.high,
        score: 78.3,
      },
      {
        anomalyType: 'privilege_escalation',
        description: 'Unexpected privilege elevation or admin group membership change',
        severity: UebaRiskLevel.critical,
        score: 88.1,
      },
      {
        anomalyType: 'lateral_movement',
        description: 'Sequential authentication to multiple hosts in short timeframe',
        severity: UebaRiskLevel.high,
        score: 71.2,
      },
      {
        anomalyType: 'credential_abuse',
        description: 'Service account used for interactive login',
        severity: UebaRiskLevel.critical,
        score: 95.0,
      },
      {
        anomalyType: 'new_device',
        description: 'Authentication from previously unseen device or user agent',
        severity: UebaRiskLevel.low,
        score: 25.0,
      },
      {
        anomalyType: 'bulk_download',
        description: 'Unusual volume of file downloads from cloud storage',
        severity: UebaRiskLevel.high,
        score: 82.4,
      },
    ]

    for (const entity of entities) {
      try {
        const existing = await prisma.uebaEntity.findFirst({
          where: { tenantId, entityName: entity.name, entityType: entity.type },
          select: { id: true },
        })
        if (existing) {
          continue
        }

        const trendData = Array.from({ length: 30 }, (_, i) => ({
          date: toIso(subtractDuration(nowDate(), 29 - i, 'day')).slice(0, 10),
          score: Math.max(0, entity.risk + Math.sin(i * 0.5) * 15),
        }))

        const anomalyCount =
          entity.level === UebaRiskLevel.normal
            ? 0
            : entity.level === UebaRiskLevel.low
              ? 2
              : entity.level === UebaRiskLevel.medium
                ? 3
                : 4

        const createdEntity = await prisma.uebaEntity.create({
          data: {
            tenantId,
            entityName: entity.name,
            entityType: entity.type,
            riskScore: entity.risk,
            riskLevel: entity.level,
            topAnomaly: entity.topAnomaly,
            trendData: trendData as unknown as Prisma.InputJsonValue,
            lastSeenAt: randomDate(3),
          },
        })

        for (let a = 0; a < anomalyCount; a++) {
          const tmpl = anomalyTemplates[a % anomalyTemplates.length]!
          await prisma.uebaAnomaly.create({
            data: {
              tenantId,
              entityId: createdEntity.id,
              anomalyType: tmpl.anomalyType,
              description: tmpl.description,
              severity: tmpl.severity,
              score: tmpl.score,
              detectedAt: randomDate(14),
              resolved: a === 0 ? false : Math.random() > 0.5,
            },
          })
        }
      } catch (entityError) {
        logger.warn(
          { tenant: tenantSlug, entity: entity.name, error: entityError },
          'Skipped UEBA entity (already exists or error)'
        )
      }
    }

    // ML Models
    const mlModels = [
      {
        name: 'User Behavior Baseline',
        modelType: MlModelType.anomaly_detection,
        accuracy: 0.94,
        status: MlModelStatus.active,
        dataPoints: 1250000,
        description: 'Baseline model for user login patterns, access times, and resource usage.',
      },
      {
        name: 'Lateral Movement Detector',
        modelType: MlModelType.classification,
        accuracy: 0.89,
        status: MlModelStatus.active,
        dataPoints: 850000,
        description: 'Classifies network authentication patterns as normal or lateral movement.',
      },
      {
        name: 'Data Exfiltration Scorer',
        modelType: MlModelType.time_series,
        accuracy: 0.91,
        status: MlModelStatus.active,
        dataPoints: 2100000,
        description:
          'Time-series model tracking data transfer volumes and detecting anomalous outbound transfers.',
      },
      {
        name: 'Entity Risk Clusterer',
        modelType: MlModelType.clustering,
        accuracy: 0.87,
        status: MlModelStatus.training,
        dataPoints: 500000,
        description:
          'Clusters entities by behavioral similarity to identify peer groups and outliers.',
      },
    ]

    for (const model of mlModels) {
      const lastTrained = model.status === MlModelStatus.training ? null : randomDate(7)

      await prisma.mlModel.upsert({
        where: { tenantId_name: { tenantId, name: model.name } },
        update: {
          modelType: model.modelType,
          accuracy: model.accuracy,
          status: model.status,
          dataPoints: model.dataPoints,
          description: model.description,
          lastTrained,
        },
        create: {
          tenantId,
          name: model.name,
          modelType: model.modelType,
          accuracy: model.accuracy,
          status: model.status,
          dataPoints: model.dataPoints,
          description: model.description,
          lastTrained,
        },
      })
    }

    logger.info(
      { tenant: tenantSlug, entities: entities.length, models: mlModels.length },
      'Seeded UEBA'
    )
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed UEBA')
  }
}

// ─── 6. Attack Paths ──────────────────────────────────────────

async function seedAttackPaths(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const year = getYear()
    const paths = [
      {
        title: 'External Phishing to Domain Admin',
        description:
          'Attack path from spear phishing email through credential theft to full domain compromise.',
        severity: AttackPathSeverity.critical,
        status: AttackPathStatus.active,
        assets: 24,
        coverage: 0.85,
        tactics: [
          'Initial Access',
          'Execution',
          'Credential Access',
          'Lateral Movement',
          'Privilege Escalation',
        ],
        techniques: ['T1566.001', 'T1204.002', 'T1003.001', 'T1021.002', 'T1068'],
        stages: [
          {
            name: 'Phishing Email Delivery',
            technique: 'T1566.001',
            status: 'active',
            assets: ['mail-relay-01'],
          },
          {
            name: 'Macro Execution',
            technique: 'T1204.002',
            status: 'active',
            assets: ['workstation-101'],
          },
          {
            name: 'Credential Dumping',
            technique: 'T1003.001',
            status: 'active',
            assets: ['workstation-101'],
          },
          {
            name: 'Lateral Movement via RDP',
            technique: 'T1021.001',
            status: 'active',
            assets: ['dc-01'],
          },
          {
            name: 'Domain Admin Achieved',
            technique: 'T1068',
            status: 'active',
            assets: ['dc-01', 'dc-02'],
          },
        ],
      },
      {
        title: 'VPN Compromise to Data Exfiltration',
        description:
          'Exploitation of VPN vulnerability leading to internal network access and data theft.',
        severity: AttackPathSeverity.critical,
        status: AttackPathStatus.active,
        assets: 15,
        coverage: 0.72,
        tactics: ['Initial Access', 'Persistence', 'Collection', 'Exfiltration'],
        techniques: ['T1190', 'T1505.003', 'T1005', 'T1041'],
        stages: [
          { name: 'VPN Exploit', technique: 'T1190', status: 'active', assets: ['vpn-gw-01'] },
          {
            name: 'Web Shell Persistence',
            technique: 'T1505.003',
            status: 'active',
            assets: ['vpn-gw-01'],
          },
          {
            name: 'Internal Recon',
            technique: 'T1046',
            status: 'active',
            assets: ['internal-network'],
          },
          { name: 'Data Collection', technique: 'T1005', status: 'active', assets: ['db-prod-01'] },
          {
            name: 'HTTPS Exfiltration',
            technique: 'T1041',
            status: 'active',
            assets: ['db-prod-01'],
          },
        ],
      },
      {
        title: 'Supply Chain to Ransomware',
        description:
          'Compromised software supply chain leading to ransomware deployment across infrastructure.',
        severity: AttackPathSeverity.critical,
        status: AttackPathStatus.mitigated,
        assets: 45,
        coverage: 0.91,
        tactics: ['Initial Access', 'Execution', 'Impact'],
        techniques: ['T1195.002', 'T1059.001', 'T1486'],
        stages: [
          {
            name: 'Malicious Package',
            technique: 'T1195.002',
            status: 'mitigated',
            assets: ['build-server-01'],
          },
          {
            name: 'Code Execution',
            technique: 'T1059.001',
            status: 'mitigated',
            assets: ['build-server-01'],
          },
          {
            name: 'Ransomware Deploy',
            technique: 'T1486',
            status: 'mitigated',
            assets: ['file-server-01'],
          },
        ],
      },
      {
        title: 'Insider Threat Data Theft',
        description:
          'Malicious insider using legitimate access to exfiltrate sensitive data before departure.',
        severity: AttackPathSeverity.high,
        status: AttackPathStatus.active,
        assets: 8,
        coverage: 0.65,
        tactics: ['Collection', 'Exfiltration'],
        techniques: ['T1530', 'T1567', 'T1052.001'],
        stages: [
          {
            name: 'Cloud Storage Access',
            technique: 'T1530',
            status: 'active',
            assets: ['sharepoint'],
          },
          {
            name: 'Bulk Download',
            technique: 'T1567',
            status: 'active',
            assets: ['workstation-202'],
          },
          {
            name: 'USB Exfiltration',
            technique: 'T1052.001',
            status: 'active',
            assets: ['workstation-202'],
          },
        ],
      },
      {
        title: 'Cloud Misconfiguration Exploit',
        description:
          'Exploitation of misconfigured S3 bucket to access sensitive data and pivot to EC2.',
        severity: AttackPathSeverity.high,
        status: AttackPathStatus.resolved,
        assets: 6,
        coverage: 0.55,
        tactics: ['Initial Access', 'Privilege Escalation', 'Collection'],
        techniques: ['T1190', 'T1078.004', 'T1530'],
        stages: [
          {
            name: 'Public S3 Access',
            technique: 'T1190',
            status: 'resolved',
            assets: ['s3-bucket'],
          },
          { name: 'IAM Key Theft', technique: 'T1078.004', status: 'resolved', assets: ['iam'] },
          { name: 'EC2 Pivot', technique: 'T1530', status: 'resolved', assets: ['ec2-prod'] },
        ],
      },
      {
        title: 'Kerberoasting to Lateral Movement',
        description:
          'Service ticket extraction leading to offline password cracking and lateral movement.',
        severity: AttackPathSeverity.high,
        status: AttackPathStatus.active,
        assets: 12,
        coverage: 0.68,
        tactics: ['Credential Access', 'Lateral Movement'],
        techniques: ['T1558.003', 'T1550.002'],
        stages: [
          { name: 'SPN Enumeration', technique: 'T1558.003', status: 'active', assets: ['dc-01'] },
          {
            name: 'Ticket Extraction',
            technique: 'T1558.003',
            status: 'active',
            assets: ['workstation-101'],
          },
          {
            name: 'Offline Cracking',
            technique: 'T1558.003',
            status: 'active',
            assets: ['attacker-host'],
          },
          {
            name: 'Pass-the-Hash',
            technique: 'T1550.002',
            status: 'active',
            assets: ['erp-server-01'],
          },
        ],
      },
      {
        title: 'IoT Device to Network Compromise',
        description:
          'Exploitation of unpatched IoT device as initial foothold into corporate network.',
        severity: AttackPathSeverity.medium,
        status: AttackPathStatus.mitigated,
        assets: 3,
        coverage: 0.42,
        tactics: ['Initial Access', 'Discovery', 'Lateral Movement'],
        techniques: ['T1190', 'T1046', 'T1021.002'],
        stages: [
          {
            name: 'IoT Exploit',
            technique: 'T1190',
            status: 'mitigated',
            assets: ['iot-camera-03'],
          },
          {
            name: 'Network Scan',
            technique: 'T1046',
            status: 'mitigated',
            assets: ['iot-camera-03'],
          },
          {
            name: 'SMB Pivot',
            technique: 'T1021.002',
            status: 'mitigated',
            assets: ['file-server-01'],
          },
        ],
      },
      {
        title: 'Email Compromise to Wire Fraud',
        description:
          'Business email compromise targeting finance department for fraudulent wire transfers.',
        severity: AttackPathSeverity.high,
        status: AttackPathStatus.active,
        assets: 5,
        coverage: 0.48,
        tactics: ['Initial Access', 'Collection', 'Impact'],
        techniques: ['T1566.002', 'T1114.002', 'T1657'],
        stages: [
          {
            name: 'Credential Phishing',
            technique: 'T1566.002',
            status: 'active',
            assets: ['mail'],
          },
          {
            name: 'Mailbox Monitoring',
            technique: 'T1114.002',
            status: 'active',
            assets: ['exchange'],
          },
          {
            name: 'Fraudulent Transfer',
            technique: 'T1657',
            status: 'active',
            assets: ['finance-app'],
          },
        ],
      },
      {
        title: 'CI/CD Pipeline Poisoning',
        description:
          'Compromise of CI/CD pipeline to inject malicious code into production deployments.',
        severity: AttackPathSeverity.critical,
        status: AttackPathStatus.active,
        assets: 10,
        coverage: 0.78,
        tactics: ['Initial Access', 'Execution', 'Impact'],
        techniques: ['T1195.002', 'T1059', 'T1565.001'],
        stages: [
          {
            name: 'Repository Compromise',
            technique: 'T1195.002',
            status: 'active',
            assets: ['gitlab'],
          },
          {
            name: 'Pipeline Manipulation',
            technique: 'T1059',
            status: 'active',
            assets: ['ci-runner-01'],
          },
          {
            name: 'Malicious Deploy',
            technique: 'T1565.001',
            status: 'active',
            assets: ['web-prod-03'],
          },
        ],
      },
      {
        title: 'DNS Tunneling Exfiltration Chain',
        description:
          'Data exfiltration via DNS tunneling after initial compromise through drive-by download.',
        severity: AttackPathSeverity.medium,
        status: AttackPathStatus.resolved,
        assets: 4,
        coverage: 0.52,
        tactics: ['Initial Access', 'Command and Control', 'Exfiltration'],
        techniques: ['T1189', 'T1071.004', 'T1048.003'],
        stages: [
          {
            name: 'Drive-by Download',
            technique: 'T1189',
            status: 'resolved',
            assets: ['workstation-101'],
          },
          {
            name: 'DNS C2 Channel',
            technique: 'T1071.004',
            status: 'resolved',
            assets: ['workstation-101'],
          },
          {
            name: 'DNS Exfiltration',
            technique: 'T1048.003',
            status: 'resolved',
            assets: ['workstation-101'],
          },
        ],
      },
    ]

    for (let i = 0; i < paths.length; i++) {
      globalAttackPathCounter++
      const p = paths[i]!
      const pathNumber = `AP-${year}-${String(globalAttackPathCounter).padStart(4, '0')}`

      await prisma.attackPath.upsert({
        where: { pathNumber },
        update: {
          tenantId,
          title: p.title,
          description: p.description,
          severity: p.severity,
          status: p.status,
          stages: p.stages as unknown as Prisma.InputJsonValue,
          affectedAssets: p.assets,
          killChainCoverage: p.coverage,
          mitreTactics: p.tactics,
          mitreTechniques: p.techniques,
          detectedAt: randomDate(30),
        },
        create: {
          tenantId,
          pathNumber,
          title: p.title,
          description: p.description,
          severity: p.severity,
          status: p.status,
          stages: p.stages as unknown as Prisma.InputJsonValue,
          affectedAssets: p.assets,
          killChainCoverage: p.coverage,
          mitreTactics: p.tactics,
          mitreTechniques: p.techniques,
          detectedAt: randomDate(30),
        },
      })
    }

    logger.info({ tenant: tenantSlug, count: paths.length }, 'Seeded attack paths')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed attack paths')
  }
}

// ─── 7. SOAR Playbooks ────────────────────────────────────────

async function seedSoar(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const playbooks = [
      {
        name: 'Phishing Email Response',
        description:
          'Automated response to reported phishing emails including quarantine, IOC extraction, and user notification.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.alert,
        execCount: 89,
        steps: [
          { name: 'Extract IOCs', action: 'extract_iocs' },
          { name: 'Check Reputation', action: 'threat_intel_lookup' },
          { name: 'Quarantine Email', action: 'quarantine_message' },
          { name: 'Notify User', action: 'send_notification' },
          { name: 'Update Blocklist', action: 'update_blocklist' },
        ],
      },
      {
        name: 'Malware Containment',
        description: 'Isolate infected endpoint, collect forensic data, and initiate remediation.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.alert,
        execCount: 34,
        steps: [
          { name: 'Isolate Host', action: 'edr_isolate' },
          { name: 'Capture Memory', action: 'memory_dump' },
          { name: 'Collect Artifacts', action: 'collect_forensics' },
          { name: 'Scan Network', action: 'lateral_scan' },
        ],
      },
      {
        name: 'Brute Force Mitigation',
        description:
          'Block source IPs, reset affected credentials, and enable enhanced monitoring.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.alert,
        execCount: 156,
        steps: [
          { name: 'Block Source IP', action: 'firewall_block' },
          { name: 'Reset Passwords', action: 'reset_credentials' },
          { name: 'Enable MFA', action: 'enforce_mfa' },
        ],
      },
      {
        name: 'Vulnerability Scan Orchestration',
        description:
          'Scheduled vulnerability scanning across all asset groups with automated ticketing.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.scheduled,
        execCount: 52,
        steps: [
          { name: 'Discover Assets', action: 'asset_discovery' },
          { name: 'Run Scan', action: 'vuln_scan' },
          { name: 'Parse Results', action: 'parse_results' },
          { name: 'Create Tickets', action: 'create_jira_tickets' },
          { name: 'Send Report', action: 'email_report' },
        ],
      },
      {
        name: 'Incident Escalation',
        description:
          'Automated escalation workflow for critical incidents including stakeholder notification.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.incident,
        execCount: 23,
        steps: [
          { name: 'Classify Severity', action: 'classify' },
          { name: 'Page On-Call', action: 'pagerduty_alert' },
          { name: 'Create War Room', action: 'create_slack_channel' },
          { name: 'Notify CISO', action: 'email_executive' },
        ],
      },
      {
        name: 'Threat Intel Enrichment',
        description: 'Enrich alerts with threat intelligence from multiple sources.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.alert,
        execCount: 412,
        steps: [
          { name: 'Query VirusTotal', action: 'vt_lookup' },
          { name: 'Query MISP', action: 'misp_lookup' },
          { name: 'Query Shodan', action: 'shodan_lookup' },
          { name: 'Score Threat', action: 'calculate_score' },
          { name: 'Update Alert', action: 'update_alert' },
          { name: 'Generate Report', action: 'create_report' },
        ],
      },
      {
        name: 'Data Exfiltration Response',
        description:
          'Respond to detected data exfiltration by blocking channels and preserving evidence.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.alert,
        execCount: 8,
        steps: [
          { name: 'Block Destination', action: 'firewall_block' },
          { name: 'Isolate Source', action: 'edr_isolate' },
          { name: 'Capture Traffic', action: 'pcap_capture' },
          { name: 'Alert Legal', action: 'notify_legal' },
        ],
      },
      {
        name: 'User Account Compromise',
        description:
          'Response to compromised user accounts including session termination and credential reset.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.alert,
        execCount: 67,
        steps: [
          { name: 'Terminate Sessions', action: 'revoke_sessions' },
          { name: 'Reset Password', action: 'reset_password' },
          { name: 'Review Access Logs', action: 'query_logs' },
          { name: 'Enable MFA', action: 'enforce_mfa' },
          { name: 'Notify User', action: 'send_notification' },
        ],
      },
      {
        name: 'Compliance Check Automation',
        description: 'Automated daily compliance checks against configured frameworks.',
        status: SoarPlaybookStatus.draft,
        trigger: SoarTriggerType.scheduled,
        execCount: 0,
        steps: [
          { name: 'Collect Evidence', action: 'gather_evidence' },
          { name: 'Run Checks', action: 'evaluate_controls' },
          { name: 'Generate Report', action: 'compliance_report' },
        ],
      },
      {
        name: 'Ransomware Response',
        description: 'Emergency response playbook for ransomware incidents.',
        status: SoarPlaybookStatus.active,
        trigger: SoarTriggerType.incident,
        execCount: 3,
        steps: [
          { name: 'Isolate Network Segment', action: 'network_isolate' },
          { name: 'Disable Share Access', action: 'disable_smb' },
          { name: 'Snapshot Backups', action: 'verify_backups' },
          { name: 'Collect IOCs', action: 'extract_iocs' },
          { name: 'Notify Management', action: 'escalate' },
          { name: 'Engage IR Firm', action: 'contact_dfir' },
        ],
      },
    ]

    for (const pb of playbooks) {
      try {
        const existingPlaybook = await prisma.soarPlaybook.findFirst({
          where: { tenantId, name: pb.name },
          select: { id: true },
        })
        if (existingPlaybook) {
          continue
        }

        const playbook = await prisma.soarPlaybook.create({
          data: {
            tenantId,
            name: pb.name,
            description: pb.description,
            status: pb.status,
            triggerType: pb.trigger,
            triggerConditions:
              pb.trigger === SoarTriggerType.scheduled
                ? ({ cron: '0 2 * * *', timezone: 'UTC' } as Prisma.InputJsonValue)
                : ({
                    severity: ['critical', 'high'],
                    source: ['wazuh', 'graylog'],
                  } as Prisma.InputJsonValue),
            steps: pb.steps as unknown as Prisma.InputJsonValue,
            executionCount: pb.execCount,
            lastExecutedAt: pb.execCount > 0 ? randomDate(7) : null,
            createdBy: `admin@${tenantSlug}.io`,
          },
        })

        // Create 3-8 executions per playbook
        const execCount = Math.min(pb.execCount, 3 + (playbooks.indexOf(pb) % 6))
        const statuses = [
          SoarExecutionStatus.completed,
          SoarExecutionStatus.completed,
          SoarExecutionStatus.completed,
          SoarExecutionStatus.failed,
          SoarExecutionStatus.completed,
          SoarExecutionStatus.completed,
          SoarExecutionStatus.running,
          SoarExecutionStatus.cancelled,
        ]

        for (let e = 0; e < execCount; e++) {
          const execStatus = statuses[e % statuses.length]!
          const totalSteps = pb.steps.length
          const stepsCompleted =
            execStatus === SoarExecutionStatus.completed
              ? totalSteps
              : execStatus === SoarExecutionStatus.running
                ? Math.floor(totalSteps / 2)
                : execStatus === SoarExecutionStatus.failed
                  ? Math.max(1, totalSteps - 2)
                  : 0
          const startedAt = subtractDuration(nowDate(), execCount - e, 'day')

          await prisma.soarExecution.create({
            data: {
              tenantId,
              playbookId: playbook.id,
              status: execStatus,
              triggerSource:
                pb.trigger === SoarTriggerType.scheduled
                  ? 'cron'
                  : `alert-${randomUUID().slice(0, 8)}`,
              triggeredBy: `analyst.l2@${tenantSlug}.io`,
              startedAt,
              completedAt:
                execStatus === SoarExecutionStatus.running
                  ? null
                  : addDuration(startedAt, 30_000 * totalSteps, 'millisecond'),
              stepsCompleted,
              totalSteps,
              output:
                execStatus === SoarExecutionStatus.completed
                  ? ({ result: 'success', actionsCompleted: totalSteps } as Prisma.InputJsonValue)
                  : Prisma.DbNull,
              error:
                execStatus === SoarExecutionStatus.failed
                  ? 'Connection timeout to external service'
                  : null,
            },
          })
        }
      } catch (pbError) {
        logger.warn(
          { tenant: tenantSlug, playbook: pb.name, error: pbError },
          'Skipped SOAR playbook (already exists or error)'
        )
      }
    }

    logger.info({ tenant: tenantSlug, count: playbooks.length }, 'Seeded SOAR playbooks')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed SOAR')
  }
}

// ─── 8. Compliance ────────────────────────────────────────────

async function seedCompliance(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const frameworks = [
      {
        name: 'ISO/IEC 27001:2022',
        standard: ComplianceStandard.iso_27001,
        version: '2022',
        controls: [
          {
            num: 'A.5.1',
            title: 'Information Security Policies',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'A.5.2',
            title: 'Information Security Roles',
            status: ComplianceControlStatus.passed,
          },
          { num: 'A.6.1', title: 'Screening', status: ComplianceControlStatus.passed },
          {
            num: 'A.6.2',
            title: 'Terms and Conditions of Employment',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'A.7.1',
            title: 'Physical Security Perimeters',
            status: ComplianceControlStatus.partially_met,
          },
          { num: 'A.7.2', title: 'Physical Entry', status: ComplianceControlStatus.passed },
          { num: 'A.8.1', title: 'User Endpoint Devices', status: ComplianceControlStatus.passed },
          {
            num: 'A.8.2',
            title: 'Privileged Access Rights',
            status: ComplianceControlStatus.failed,
          },
          {
            num: 'A.8.3',
            title: 'Information Access Restriction',
            status: ComplianceControlStatus.passed,
          },
          { num: 'A.8.5', title: 'Secure Authentication', status: ComplianceControlStatus.passed },
          {
            num: 'A.8.7',
            title: 'Protection Against Malware',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'A.8.8',
            title: 'Management of Technical Vulnerabilities',
            status: ComplianceControlStatus.partially_met,
          },
          { num: 'A.8.15', title: 'Logging', status: ComplianceControlStatus.passed },
          { num: 'A.8.16', title: 'Monitoring Activities', status: ComplianceControlStatus.passed },
        ],
      },
      {
        name: 'NIST Cybersecurity Framework 2.0',
        standard: ComplianceStandard.nist,
        version: '2.0',
        controls: [
          {
            num: 'GV.OC-01',
            title: 'Organizational Context',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'GV.RM-01',
            title: 'Risk Management Strategy',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'ID.AM-01',
            title: 'Asset Inventories',
            status: ComplianceControlStatus.partially_met,
          },
          {
            num: 'ID.AM-02',
            title: 'Software Inventories',
            status: ComplianceControlStatus.partially_met,
          },
          {
            num: 'ID.RA-01',
            title: 'Vulnerability Identification',
            status: ComplianceControlStatus.passed,
          },
          { num: 'PR.AA-01', title: 'Identity Management', status: ComplianceControlStatus.passed },
          {
            num: 'PR.AA-03',
            title: 'Multi-Factor Authentication',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'PR.AT-01',
            title: 'Security Awareness Training',
            status: ComplianceControlStatus.failed,
          },
          {
            num: 'PR.DS-01',
            title: 'Data-at-Rest Protection',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'PR.DS-02',
            title: 'Data-in-Transit Protection',
            status: ComplianceControlStatus.passed,
          },
          { num: 'DE.CM-01', title: 'Network Monitoring', status: ComplianceControlStatus.passed },
          {
            num: 'DE.CM-06',
            title: 'External Service Provider Monitoring',
            status: ComplianceControlStatus.not_assessed,
          },
          {
            num: 'RS.MA-01',
            title: 'Incident Management Plan',
            status: ComplianceControlStatus.passed,
          },
          {
            num: 'RC.RP-01',
            title: 'Recovery Plan Execution',
            status: ComplianceControlStatus.partially_met,
          },
          {
            num: 'RC.CO-01',
            title: 'Recovery Communication',
            status: ComplianceControlStatus.passed,
          },
        ],
      },
      {
        name: 'PCI DSS v4.0',
        standard: ComplianceStandard.pci_dss,
        version: '4.0',
        controls: [
          {
            num: '1.1.1',
            title: 'Network Security Controls Defined',
            status: ComplianceControlStatus.passed,
          },
          {
            num: '1.2.1',
            title: 'Inbound Traffic Restricted',
            status: ComplianceControlStatus.passed,
          },
          {
            num: '2.2.1',
            title: 'System Hardening Standards',
            status: ComplianceControlStatus.partially_met,
          },
          {
            num: '3.1.1',
            title: 'Account Data Retention Policies',
            status: ComplianceControlStatus.passed,
          },
          { num: '3.5.1', title: 'PAN Storage Protection', status: ComplianceControlStatus.passed },
          {
            num: '4.2.1',
            title: 'Strong Cryptography for Transmission',
            status: ComplianceControlStatus.passed,
          },
          { num: '5.2.1', title: 'Anti-Malware Deployed', status: ComplianceControlStatus.passed },
          {
            num: '6.2.1',
            title: 'Secure Development Practices',
            status: ComplianceControlStatus.failed,
          },
          {
            num: '7.2.1',
            title: 'Access Control Model Defined',
            status: ComplianceControlStatus.passed,
          },
          { num: '8.3.1', title: 'Strong Authentication', status: ComplianceControlStatus.passed },
          {
            num: '9.1.1',
            title: 'Physical Access Controls',
            status: ComplianceControlStatus.partially_met,
          },
          { num: '10.2.1', title: 'Audit Logs Enabled', status: ComplianceControlStatus.passed },
          {
            num: '11.3.1',
            title: 'Vulnerability Scanning',
            status: ComplianceControlStatus.passed,
          },
        ],
      },
      {
        name: 'SOC 2 Type II',
        standard: ComplianceStandard.soc2,
        version: 'Type II',
        controls: [
          {
            num: 'CC1.1',
            title: 'COSO Principle 1 — Integrity and Ethics',
            status: ComplianceControlStatus.passed,
          },
          { num: 'CC1.2', title: 'Board Oversight', status: ComplianceControlStatus.passed },
          { num: 'CC2.1', title: 'Information Quality', status: ComplianceControlStatus.passed },
          {
            num: 'CC3.1',
            title: 'Risk Assessment Process',
            status: ComplianceControlStatus.passed,
          },
          { num: 'CC4.1', title: 'Monitoring Activities', status: ComplianceControlStatus.passed },
          {
            num: 'CC5.1',
            title: 'Control Activities Selection',
            status: ComplianceControlStatus.partially_met,
          },
          {
            num: 'CC6.1',
            title: 'Logical and Physical Access',
            status: ComplianceControlStatus.passed,
          },
          { num: 'CC6.2', title: 'Access Credentials', status: ComplianceControlStatus.passed },
          { num: 'CC6.3', title: 'Access Removal', status: ComplianceControlStatus.failed },
          { num: 'CC7.1', title: 'Detection of Changes', status: ComplianceControlStatus.passed },
          {
            num: 'CC7.2',
            title: 'Monitoring for Anomalies',
            status: ComplianceControlStatus.passed,
          },
          { num: 'CC8.1', title: 'Change Management', status: ComplianceControlStatus.passed },
          { num: 'CC9.1', title: 'Risk Mitigation', status: ComplianceControlStatus.passed },
        ],
      },
    ]

    for (const fw of frameworks) {
      try {
        const existingFramework = await prisma.complianceFramework.findFirst({
          where: { tenantId, standard: fw.standard, version: fw.version },
          select: { id: true },
        })
        if (existingFramework) {
          continue
        }

        const passedCount = fw.controls.filter(
          c => c.status === ComplianceControlStatus.passed
        ).length
        const failedCount = fw.controls.filter(
          c => c.status === ComplianceControlStatus.failed
        ).length
        const overallScore = (passedCount / fw.controls.length) * 100

        await prisma.complianceFramework.create({
          data: {
            tenantId,
            name: fw.name,
            description: `${fw.name} compliance framework assessment for ${tenantSlug}.`,
            standard: fw.standard,
            version: fw.version,
            totalControls: fw.controls.length,
            passedControls: passedCount,
            failedControls: failedCount,
            overallScore: Math.round(overallScore * 10) / 10,
            lastAssessedAt: randomDate(14),
            controls: {
              create: fw.controls.map(c => ({
                controlNumber: c.num,
                title: c.title,
                description: `Assessment of ${c.title} control requirements.`,
                status: c.status,
                evidence:
                  c.status === ComplianceControlStatus.passed
                    ? 'Evidence collected from automated scanning and manual review. All criteria met.'
                    : c.status === ComplianceControlStatus.failed
                      ? 'Gap identified. Remediation plan required.'
                      : null,
                assessedAt:
                  c.status !== ComplianceControlStatus.not_assessed ? randomDate(14) : null,
                assessedBy:
                  c.status !== ComplianceControlStatus.not_assessed
                    ? `admin@${tenantSlug}.io`
                    : null,
              })),
            },
          },
        })
      } catch (fwError) {
        logger.warn(
          { tenant: tenantSlug, framework: fw.name, error: fwError },
          'Skipped compliance framework (already exists or error)'
        )
      }
    }

    logger.info({ tenant: tenantSlug, count: frameworks.length }, 'Seeded compliance frameworks')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed compliance')
  }
}

// ─── 9. Reports ───────────────────────────────────────────────

async function seedReportTemplates(): Promise<void> {
  const templates = [
    {
      id: '00000000-0000-4000-a000-000000000901',
      key: ReportTemplateKey.executive_overview,
      module: ReportModule.dashboard,
      name: 'Executive Overview Pack',
      description: 'Executive posture snapshot with weekly highlights and KPI rollups.',
      type: ReportType.executive,
      defaultFormat: ReportFormat.pdf,
      parameters: {
        timeWindow: 'last_30_days',
        includeNarrative: true,
        includeCharts: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: '00000000-0000-4000-a000-000000000902',
      key: ReportTemplateKey.incident_posture,
      module: ReportModule.incidents,
      name: 'Incident Posture Report',
      description: 'Incident workload, containment progress, and responder throughput.',
      type: ReportType.incident,
      defaultFormat: ReportFormat.pdf,
      parameters: {
        timeWindow: 'last_14_days',
        includeTimeline: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: '00000000-0000-4000-a000-000000000903',
      key: ReportTemplateKey.threat_exposure,
      module: ReportModule.alerts,
      name: 'Threat Exposure Report',
      description: 'Alert severity mix, MITRE coverage, and targeted asset exposure.',
      type: ReportType.threat,
      defaultFormat: ReportFormat.pdf,
      parameters: {
        timeWindow: 'last_7_days',
        includeMitreCoverage: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: '00000000-0000-4000-a000-000000000904',
      key: ReportTemplateKey.vulnerability_exposure,
      module: ReportModule.vulnerabilities,
      name: 'Vulnerability Exposure Report',
      description: 'Critical and high severity exposure, patch posture, and exploit availability.',
      type: ReportType.custom,
      defaultFormat: ReportFormat.html,
      parameters: {
        includePatchStatus: true,
        includeExploitAvailability: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: '00000000-0000-4000-a000-000000000905',
      key: ReportTemplateKey.compliance_posture,
      module: ReportModule.compliance,
      name: 'Compliance Posture Report',
      description: 'Framework health, failed controls, and evidence readiness summary.',
      type: ReportType.compliance,
      defaultFormat: ReportFormat.pdf,
      parameters: {
        includeControlBreakdown: true,
        includeEvidenceGaps: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: '00000000-0000-4000-a000-000000000906',
      key: ReportTemplateKey.automation_health,
      module: ReportModule.soar,
      name: 'Automation Health Report',
      description: 'AI agents, SOAR activity, and job pipeline runtime status.',
      type: ReportType.custom,
      defaultFormat: ReportFormat.pdf,
      parameters: {
        includeAiSessions: true,
        includeJobBacklog: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: '00000000-0000-4000-a000-000000000907',
      key: ReportTemplateKey.connector_health,
      module: ReportModule.connectors,
      name: 'Connector Health Report',
      description: 'Connector runtime status, failures, and synchronization readiness.',
      type: ReportType.custom,
      defaultFormat: ReportFormat.csv,
      parameters: {
        includeLastCheck: true,
        includeErrors: true,
      } as Prisma.InputJsonValue,
    },
  ]

  for (const template of templates) {
    await prisma.reportTemplate.upsert({
      where: { id: template.id },
      update: {
        key: template.key,
        module: template.module,
        name: template.name,
        description: template.description,
        type: template.type,
        defaultFormat: template.defaultFormat,
        parameters: template.parameters,
        isSystem: true,
      },
      create: {
        id: template.id,
        key: template.key,
        module: template.module,
        name: template.name,
        description: template.description,
        type: template.type,
        defaultFormat: template.defaultFormat,
        parameters: template.parameters,
        isSystem: true,
      },
    })
  }

  logger.info({ count: templates.length }, 'Seeded report templates')
}

async function seedReports(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const existingCount = await prisma.report.count({ where: { tenantId } })
    if (existingCount >= 7) {
      logger.info({ tenant: tenantSlug, existingCount }, 'Reports already seeded — skipping')
      return
    }

    const reportTemplates = await prisma.reportTemplate.findMany({
      where: { tenantId: null, isSystem: true },
      select: { id: true, key: true },
    })
    const reportTemplateMap = new Map(reportTemplates.map(template => [template.key, template.id]))

    const reports = [
      {
        name: 'Weekly Executive Summary — W10 2025',
        type: ReportType.executive,
        module: ReportModule.dashboard,
        templateKey: ReportTemplateKey.executive_overview,
        format: ReportFormat.pdf,
        status: ReportStatus.completed,
        fileSize: BigInt(245000),
      },
      {
        name: 'Monthly Compliance Report — Feb 2025',
        type: ReportType.compliance,
        module: ReportModule.compliance,
        templateKey: ReportTemplateKey.compliance_posture,
        format: ReportFormat.pdf,
        status: ReportStatus.completed,
        fileSize: BigInt(1250000),
      },
      {
        name: 'Incident Report — Ransomware INC-2025-0001',
        type: ReportType.incident,
        module: ReportModule.incidents,
        templateKey: ReportTemplateKey.incident_posture,
        format: ReportFormat.pdf,
        status: ReportStatus.completed,
        fileSize: BigInt(890000),
      },
      {
        name: 'Quarterly Threat Landscape Q1 2025',
        type: ReportType.threat,
        module: ReportModule.alerts,
        templateKey: ReportTemplateKey.threat_exposure,
        format: ReportFormat.pdf,
        status: ReportStatus.completed,
        fileSize: BigInt(2100000),
      },
      {
        name: 'Alert Export — March 2025',
        type: ReportType.custom,
        module: ReportModule.connectors,
        templateKey: ReportTemplateKey.connector_health,
        format: ReportFormat.csv,
        status: ReportStatus.completed,
        fileSize: BigInt(456000),
      },
      {
        name: 'Vulnerability Assessment Report',
        type: ReportType.custom,
        module: ReportModule.vulnerabilities,
        templateKey: ReportTemplateKey.vulnerability_exposure,
        format: ReportFormat.html,
        status: ReportStatus.generating,
        fileSize: null,
      },
      {
        name: 'Weekly Executive Summary — W11 2025',
        type: ReportType.executive,
        module: ReportModule.dashboard,
        templateKey: ReportTemplateKey.executive_overview,
        format: ReportFormat.pdf,
        status: ReportStatus.failed,
        fileSize: null,
      },
    ]

    for (const r of reports) {
      try {
        // Check if this specific report already exists
        const existingReport = await prisma.report.findFirst({
          where: { tenantId, name: r.name },
          select: { id: true },
        })
        if (existingReport) {
          continue
        }

        await prisma.report.create({
          data: {
            tenantId,
            templateId: reportTemplateMap.get(r.templateKey) ?? null,
            name: r.name,
            description: `Auto-generated ${r.type} report for ${tenantSlug}.`,
            type: r.type,
            module: r.module,
            templateKey: r.templateKey,
            format: r.format,
            status: r.status,
            generatedBy: `admin@${tenantSlug}.io`,
            parameters: { dateRange: 'last_30_days', includeCharts: true } as Prisma.InputJsonValue,
            filterSnapshot: {
              tenant: tenantSlug,
              module: r.module,
              source: 'seed',
            } as Prisma.InputJsonValue,
            fileUrl:
              r.status === ReportStatus.completed
                ? `/reports/${tenantSlug}/${r.name.toLowerCase().split(' ').join('-')}.${r.format}`
                : null,
            fileSize: r.fileSize,
            generatedAt: r.status === ReportStatus.completed ? randomDate(7) : null,
          },
        })
      } catch (reportError) {
        logger.warn(
          { tenant: tenantSlug, report: r.name, error: reportError },
          'Skipped report (already exists or error)'
        )
      }
    }

    logger.info({ tenant: tenantSlug, count: reports.length }, 'Seeded reports')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed reports')
  }
}

// ─── 10. System Health ────────────────────────────────────────

async function seedSystemHealth(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const existingChecks = await prisma.systemHealthCheck.count({ where: { tenantId } })
    if (existingChecks >= 8) {
      logger.info({ tenant: tenantSlug, existingChecks }, 'System health already seeded — skipping')
      return
    }

    const healthChecks = [
      {
        serviceName: 'Wazuh Manager',
        serviceType: ServiceType.connector,
        status: ServiceStatus.healthy,
        responseTimeMs: 45,
      },
      {
        serviceName: 'Graylog SIEM',
        serviceType: ServiceType.connector,
        status: ServiceStatus.healthy,
        responseTimeMs: 78,
      },
      {
        serviceName: 'PostgreSQL Primary',
        serviceType: ServiceType.database,
        status: ServiceStatus.healthy,
        responseTimeMs: 12,
      },
      {
        serviceName: 'AuraSpear API',
        serviceType: ServiceType.api,
        status: ServiceStatus.healthy,
        responseTimeMs: 23,
      },
      {
        serviceName: 'Redis Queue',
        serviceType: ServiceType.queue,
        status: ServiceStatus.healthy,
        responseTimeMs: 3,
      },
      {
        serviceName: 'MinIO Object Storage',
        serviceType: ServiceType.storage,
        status: ServiceStatus.degraded,
        responseTimeMs: 234,
        error: 'High latency on bucket operations — disk I/O saturation detected',
      },
      {
        serviceName: 'Velociraptor EDR',
        serviceType: ServiceType.connector,
        status: ServiceStatus.down,
        responseTimeMs: null,
        error: 'Connection refused: Velociraptor service not running',
      },
      {
        serviceName: 'MISP Threat Intel',
        serviceType: ServiceType.connector,
        status: ServiceStatus.healthy,
        responseTimeMs: 156,
      },
    ]

    for (const hc of healthChecks) {
      try {
        const existingHc = await prisma.systemHealthCheck.findFirst({
          where: { tenantId, serviceName: hc.serviceName },
          select: { id: true },
        })
        if (existingHc) {
          continue
        }

        await prisma.systemHealthCheck.create({
          data: {
            tenantId,
            serviceName: hc.serviceName,
            serviceType: hc.serviceType,
            status: hc.status,
            responseTimeMs: hc.responseTimeMs,
            lastCheckedAt: nowDate(),
            errorMessage: 'error' in hc ? (hc as { error: string }).error : null,
            metadata: { version: '1.0.0', region: 'us-east-1' } as Prisma.InputJsonValue,
          },
        })
      } catch (hcError) {
        logger.warn(
          { tenant: tenantSlug, service: hc.serviceName, error: hcError },
          'Skipped health check (already exists or error)'
        )
      }
    }

    // System Metrics — 10 snapshots (only seed if none exist for this tenant)
    const existingMetrics = await prisma.systemMetric.count({ where: { tenantId } })
    if (existingMetrics >= 10) {
      logger.info(
        { tenant: tenantSlug, existingMetrics },
        'System metrics already seeded — skipping'
      )
    } else {
      const metricSnapshots = [
        { metricName: 'api_server_cpu', metricType: MetricType.cpu, value: 42.5, unit: 'percent' },
        {
          metricName: 'api_server_memory',
          metricType: MetricType.memory,
          value: 68.2,
          unit: 'percent',
        },
        {
          metricName: 'database_disk_usage',
          metricType: MetricType.disk,
          value: 45.8,
          unit: 'percent',
        },
        {
          metricName: 'ingest_network_throughput',
          metricType: MetricType.network,
          value: 125.6,
          unit: 'mbps',
        },
        {
          metricName: 'alert_processing_queue',
          metricType: MetricType.queue_depth,
          value: 23,
          unit: 'messages',
        },
        {
          metricName: 'api_response_latency_p99',
          metricType: MetricType.latency,
          value: 145,
          unit: 'ms',
        },
        {
          metricName: 'wazuh_indexer_cpu',
          metricType: MetricType.cpu,
          value: 67.3,
          unit: 'percent',
        },
        {
          metricName: 'graylog_heap_usage',
          metricType: MetricType.memory,
          value: 82.1,
          unit: 'percent',
        },
        {
          metricName: 'log_storage_disk',
          metricType: MetricType.disk,
          value: 71.4,
          unit: 'percent',
        },
        {
          metricName: 'event_correlation_latency',
          metricType: MetricType.latency,
          value: 89,
          unit: 'ms',
        },
      ]

      for (const m of metricSnapshots) {
        try {
          const existingMetric = await prisma.systemMetric.findFirst({
            where: { tenantId, metricName: m.metricName },
            select: { id: true },
          })
          if (existingMetric) {
            continue
          }

          await prisma.systemMetric.create({
            data: {
              tenantId,
              metricName: m.metricName,
              metricType: m.metricType,
              value: m.value,
              unit: m.unit,
              tags: { host: 'soc-primary', environment: 'production' } as Prisma.InputJsonValue,
              recordedAt: nowDate(),
            },
          })
        } catch (metricError) {
          logger.warn(
            { tenant: tenantSlug, metric: m.metricName, error: metricError },
            'Skipped metric (already exists or error)'
          )
        }
      }
    }

    logger.info({ tenant: tenantSlug }, 'Seeded system health')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed system health')
  }
}

// ─── 11. Normalization Pipelines ──────────────────────────────

async function seedNormalization(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const pipelines = [
      {
        name: 'Wazuh Syslog Parser',
        sourceType: NormalizationSourceType.syslog,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(15230000),
        errors: 12,
      },
      {
        name: 'Graylog JSON Ingestion',
        sourceType: NormalizationSourceType.json,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(8940000),
        errors: 3,
      },
      {
        name: 'Windows Event Log Parser',
        sourceType: NormalizationSourceType.json,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(22100000),
        errors: 45,
      },
      {
        name: 'Firewall CEF Parser',
        sourceType: NormalizationSourceType.cef,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(6780000),
        errors: 8,
      },
      {
        name: 'IDS LEEF Parser',
        sourceType: NormalizationSourceType.leef,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(3450000),
        errors: 2,
      },
      {
        name: 'CSV Threat Feed Importer',
        sourceType: NormalizationSourceType.csv,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(125000),
        errors: 0,
      },
      {
        name: 'Linux Audit Log Parser',
        sourceType: NormalizationSourceType.syslog,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(9800000),
        errors: 15,
      },
      {
        name: 'Cloud Trail JSON Parser',
        sourceType: NormalizationSourceType.json,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(4560000),
        errors: 7,
      },
      {
        name: 'Custom Application Log Parser',
        sourceType: NormalizationSourceType.custom,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(1230000),
        errors: 23,
      },
      {
        name: 'DNS Query Log Parser',
        sourceType: NormalizationSourceType.syslog,
        status: NormalizationPipelineStatus.active,
        processed: BigInt(45670000),
        errors: 1,
      },
      {
        name: 'Email Gateway CEF Parser',
        sourceType: NormalizationSourceType.cef,
        status: NormalizationPipelineStatus.inactive,
        processed: BigInt(890000),
        errors: 156,
      },
      {
        name: 'Legacy SNMP Trap Parser',
        sourceType: NormalizationSourceType.custom,
        status: NormalizationPipelineStatus.error,
        processed: BigInt(34000),
        errors: 2340,
      },
    ]

    for (const p of pipelines) {
      const description = `Normalization pipeline for ${p.sourceType} log sources. Parses and maps fields to ECS schema.`
      const parserConfig = {
        format: p.sourceType,
        delimiter: p.sourceType === NormalizationSourceType.csv ? ',' : null,
        timestampField: '@timestamp',
        encoding: 'UTF-8',
      } as Prisma.InputJsonValue
      const fieldMappings = {
        source_ip: 'source.ip',
        dest_ip: 'destination.ip',
        severity: 'event.severity',
        message: 'message',
        timestamp: '@timestamp',
      } as Prisma.InputJsonValue
      const lastProcessedAt =
        p.status === NormalizationPipelineStatus.error ? randomDate(30) : randomDate(1)

      await prisma.normalizationPipeline.upsert({
        where: { tenantId_name: { tenantId, name: p.name } },
        update: {
          description,
          sourceType: p.sourceType,
          status: p.status,
          parserConfig,
          fieldMappings,
          processedCount: p.processed,
          errorCount: p.errors,
          lastProcessedAt,
        },
        create: {
          tenantId,
          name: p.name,
          description,
          sourceType: p.sourceType,
          status: p.status,
          parserConfig,
          fieldMappings,
          processedCount: p.processed,
          errorCount: p.errors,
          lastProcessedAt,
        },
      })
    }

    logger.info({ tenant: tenantSlug, count: pipelines.length }, 'Seeded normalization pipelines')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed normalization')
  }
}

// ─── 12. Detection Rules ──────────────────────────────────────

async function seedDetectionRules(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const year = getYear()
    const rules = [
      {
        name: 'Failed Login Threshold',
        ruleType: DetectionRuleType.threshold,
        severity: DetectionRuleSeverity.high,
        status: DetectionRuleStatus.active,
        hitCount: 1234,
        fpCount: 23,
      },
      {
        name: 'Anomalous Process Creation',
        ruleType: DetectionRuleType.anomaly,
        severity: DetectionRuleSeverity.critical,
        status: DetectionRuleStatus.active,
        hitCount: 89,
        fpCount: 12,
      },
      {
        name: 'Brute Force then Lateral Movement',
        ruleType: DetectionRuleType.chain,
        severity: DetectionRuleSeverity.critical,
        status: DetectionRuleStatus.active,
        hitCount: 7,
        fpCount: 1,
      },
      {
        name: 'Daily Compliance Scan',
        ruleType: DetectionRuleType.scheduled,
        severity: DetectionRuleSeverity.info,
        status: DetectionRuleStatus.active,
        hitCount: 365,
        fpCount: 0,
      },
      {
        name: 'Port Scan Detection',
        ruleType: DetectionRuleType.threshold,
        severity: DetectionRuleSeverity.medium,
        status: DetectionRuleStatus.active,
        hitCount: 567,
        fpCount: 89,
      },
      {
        name: 'Unusual DNS Query Pattern',
        ruleType: DetectionRuleType.anomaly,
        severity: DetectionRuleSeverity.high,
        status: DetectionRuleStatus.active,
        hitCount: 234,
        fpCount: 34,
      },
      {
        name: 'Privilege Escalation Chain',
        ruleType: DetectionRuleType.chain,
        severity: DetectionRuleSeverity.critical,
        status: DetectionRuleStatus.active,
        hitCount: 12,
        fpCount: 2,
      },
      {
        name: 'Outbound Traffic Volume Alert',
        ruleType: DetectionRuleType.threshold,
        severity: DetectionRuleSeverity.high,
        status: DetectionRuleStatus.active,
        hitCount: 145,
        fpCount: 45,
      },
      {
        name: 'Suspicious PowerShell Pattern',
        ruleType: DetectionRuleType.anomaly,
        severity: DetectionRuleSeverity.critical,
        status: DetectionRuleStatus.testing,
        hitCount: 34,
        fpCount: 8,
      },
      {
        name: 'Off-Hours Access Detection',
        ruleType: DetectionRuleType.scheduled,
        severity: DetectionRuleSeverity.low,
        status: DetectionRuleStatus.active,
        hitCount: 892,
        fpCount: 234,
      },
      {
        name: 'Multiple Account Lockouts',
        ruleType: DetectionRuleType.threshold,
        severity: DetectionRuleSeverity.medium,
        status: DetectionRuleStatus.active,
        hitCount: 345,
        fpCount: 56,
      },
      {
        name: 'File Integrity Change Burst',
        ruleType: DetectionRuleType.anomaly,
        severity: DetectionRuleSeverity.high,
        status: DetectionRuleStatus.active,
        hitCount: 67,
        fpCount: 15,
      },
      {
        name: 'Phishing then Credential Use',
        ruleType: DetectionRuleType.chain,
        severity: DetectionRuleSeverity.high,
        status: DetectionRuleStatus.testing,
        hitCount: 5,
        fpCount: 1,
      },
      {
        name: 'Weekly Vulnerability Report',
        ruleType: DetectionRuleType.scheduled,
        severity: DetectionRuleSeverity.info,
        status: DetectionRuleStatus.active,
        hitCount: 52,
        fpCount: 0,
      },
      {
        name: 'Deprecated SSL/TLS Usage',
        ruleType: DetectionRuleType.threshold,
        severity: DetectionRuleSeverity.low,
        status: DetectionRuleStatus.disabled,
        hitCount: 2345,
        fpCount: 1890,
      },
    ]

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]!

      const description = `Detection rule: ${r.name}. Type: ${r.ruleType}. Monitors for security events matching configured conditions.`
      const conditions =
        r.ruleType === DetectionRuleType.threshold
          ? ({
              field: 'event.count',
              operator: 'gte',
              value: 10,
              window: '5m',
            } as Prisma.InputJsonValue)
          : r.ruleType === DetectionRuleType.chain
            ? ({
                steps: [
                  { event: 'auth_failure', count: 5 },
                  { event: 'auth_success', within: '10m' },
                ],
              } as Prisma.InputJsonValue)
            : ({ model: 'baseline', deviation: 3.0 } as Prisma.InputJsonValue)
      const actions = {
        notify: true,
        severity: r.severity,
        createAlert: true,
        channels: ['siem', 'slack'],
      } as Prisma.InputJsonValue
      const lastTriggeredAt = r.hitCount > 0 ? randomDate(3) : null

      const existingRule = await prisma.detectionRule.findFirst({
        where: { tenantId, name: r.name },
        select: { id: true, ruleNumber: true },
      })

      if (existingRule) {
        await prisma.detectionRule.update({
          where: { id: existingRule.id },
          data: {
            description,
            ruleType: r.ruleType,
            severity: r.severity,
            status: r.status,
            conditions,
            actions,
            hitCount: r.hitCount,
            falsePositiveCount: r.fpCount,
            lastTriggeredAt,
            createdBy: `analyst.l2@${tenantSlug}.io`,
          },
        })
        continue
      }

      globalDetectionRuleCounter++
      const ruleNumber = `DR-${year}-${String(globalDetectionRuleCounter).padStart(4, '0')}`

      await prisma.detectionRule.upsert({
        where: { ruleNumber },
        update: {
          tenantId,
          name: r.name,
          description,
          ruleType: r.ruleType,
          severity: r.severity,
          status: r.status,
          conditions,
          actions,
          hitCount: r.hitCount,
          falsePositiveCount: r.fpCount,
          lastTriggeredAt,
          createdBy: `analyst.l2@${tenantSlug}.io`,
        },
        create: {
          tenantId,
          ruleNumber,
          name: r.name,
          description,
          ruleType: r.ruleType,
          severity: r.severity,
          status: r.status,
          conditions,
          actions,
          hitCount: r.hitCount,
          falsePositiveCount: r.fpCount,
          lastTriggeredAt,
          createdBy: `analyst.l2@${tenantSlug}.io`,
        },
      })
    }

    logger.info({ tenant: tenantSlug, count: rules.length }, 'Seeded detection rules')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed detection rules')
  }
}

// ─── 13. Cloud Security ───────────────────────────────────────

async function seedCloudSecurity(tenantId: string, tenantSlug: string): Promise<void> {
  try {
    const accounts = [
      {
        provider: CloudProvider.aws,
        accountId: '123456789012',
        alias: 'Production AWS',
        status: CloudAccountStatus.connected,
        region: 'us-east-1',
        complianceScore: 78.5,
        findings: [
          {
            resourceType: 'S3 Bucket',
            resourceId: 'arn:aws:s3:::prod-data-bucket',
            severity: CloudFindingSeverity.critical,
            title: 'S3 Bucket Publicly Accessible',
            status: CloudFindingStatus.open,
            remediation: 'Enable bucket ACL and block public access settings.',
          },
          {
            resourceType: 'EC2 Instance',
            resourceId: 'i-0abc123def456',
            severity: CloudFindingSeverity.high,
            title: 'EC2 Instance with Public SSH Access',
            status: CloudFindingStatus.open,
            remediation: 'Restrict security group inbound SSH to VPN CIDR only.',
          },
          {
            resourceType: 'IAM User',
            resourceId: 'arn:aws:iam::123456789012:user/deploy-bot',
            severity: CloudFindingSeverity.high,
            title: 'IAM User with Unused Access Keys',
            status: CloudFindingStatus.resolved,
            remediation: 'Rotate or delete unused access keys older than 90 days.',
          },
          {
            resourceType: 'RDS Instance',
            resourceId: 'arn:aws:rds:us-east-1:123456789012:db:prod-db',
            severity: CloudFindingSeverity.medium,
            title: 'RDS Instance Not Encrypted',
            status: CloudFindingStatus.open,
            remediation: 'Enable encryption at rest using AWS KMS.',
          },
          {
            resourceType: 'Lambda Function',
            resourceId: 'arn:aws:lambda:us-east-1:123456789012:function:data-processor',
            severity: CloudFindingSeverity.low,
            title: 'Lambda Function Using Deprecated Runtime',
            status: CloudFindingStatus.open,
            remediation: 'Upgrade runtime from Node.js 16 to Node.js 20.',
          },
          {
            resourceType: 'CloudTrail',
            resourceId: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/main',
            severity: CloudFindingSeverity.info,
            title: 'CloudTrail Log File Validation Disabled',
            status: CloudFindingStatus.suppressed,
            remediation: 'Enable log file validation for tamper detection.',
          },
          {
            resourceType: 'EBS Volume',
            resourceId: 'vol-0abc123',
            severity: CloudFindingSeverity.medium,
            title: 'Unencrypted EBS Volume Attached to Production Instance',
            status: CloudFindingStatus.open,
            remediation: 'Create encrypted snapshot and replace volume.',
          },
          {
            resourceType: 'Security Group',
            resourceId: 'sg-0abc123',
            severity: CloudFindingSeverity.high,
            title: 'Security Group Allows 0.0.0.0/0 on Port 3389',
            status: CloudFindingStatus.open,
            remediation: 'Restrict RDP access to corporate VPN range only.',
          },
        ],
      },
      {
        provider: CloudProvider.azure,
        accountId: 'a1b2c3d4-e5f6-7890-abcd-subscription01',
        alias: 'Azure Production',
        status: CloudAccountStatus.connected,
        region: 'eastus',
        complianceScore: 82.3,
        findings: [
          {
            resourceType: 'Storage Account',
            resourceId:
              '/subscriptions/a1b2c3d4/resourceGroups/prod/providers/Microsoft.Storage/storageAccounts/proddata',
            severity: CloudFindingSeverity.high,
            title: 'Storage Account Allows Blob Public Access',
            status: CloudFindingStatus.open,
            remediation: 'Disable blob public access on storage account.',
          },
          {
            resourceType: 'Virtual Machine',
            resourceId:
              '/subscriptions/a1b2c3d4/resourceGroups/prod/providers/Microsoft.Compute/virtualMachines/web-01',
            severity: CloudFindingSeverity.medium,
            title: 'VM Missing Endpoint Protection',
            status: CloudFindingStatus.open,
            remediation: 'Install and configure Microsoft Defender for Endpoint.',
          },
          {
            resourceType: 'Key Vault',
            resourceId:
              '/subscriptions/a1b2c3d4/resourceGroups/prod/providers/Microsoft.KeyVault/vaults/prod-kv',
            severity: CloudFindingSeverity.low,
            title: 'Key Vault Soft Delete Not Enabled',
            status: CloudFindingStatus.resolved,
            remediation: 'Enable soft delete and purge protection.',
          },
          {
            resourceType: 'SQL Database',
            resourceId:
              '/subscriptions/a1b2c3d4/resourceGroups/prod/providers/Microsoft.Sql/servers/prod-sql',
            severity: CloudFindingSeverity.high,
            title: 'SQL Server Firewall Allows Azure Services',
            status: CloudFindingStatus.open,
            remediation: 'Restrict to specific VNet and private endpoints.',
          },
          {
            resourceType: 'Network Security Group',
            resourceId:
              '/subscriptions/a1b2c3d4/resourceGroups/prod/providers/Microsoft.Network/nsg/web-nsg',
            severity: CloudFindingSeverity.critical,
            title: 'NSG Rule Allows All Inbound Traffic',
            status: CloudFindingStatus.open,
            remediation: 'Remove allow-all inbound rule. Apply least-privilege access.',
          },
          {
            resourceType: 'App Service',
            resourceId:
              '/subscriptions/a1b2c3d4/resourceGroups/prod/providers/Microsoft.Web/sites/api-app',
            severity: CloudFindingSeverity.medium,
            title: 'App Service Using HTTP Instead of HTTPS',
            status: CloudFindingStatus.resolved,
            remediation: 'Enable HTTPS Only setting.',
          },
        ],
      },
      {
        provider: CloudProvider.gcp,
        accountId: 'auraspear-prod-12345',
        alias: 'GCP Analytics',
        status: CloudAccountStatus.connected,
        region: 'us-central1',
        complianceScore: 88.7,
        findings: [
          {
            resourceType: 'GCS Bucket',
            resourceId: 'projects/auraspear-prod-12345/buckets/analytics-data',
            severity: CloudFindingSeverity.high,
            title: 'GCS Bucket with Uniform Access Not Enforced',
            status: CloudFindingStatus.open,
            remediation: 'Enable uniform bucket-level access.',
          },
          {
            resourceType: 'Compute Instance',
            resourceId: 'projects/auraspear-prod-12345/zones/us-central1-a/instances/worker-01',
            severity: CloudFindingSeverity.medium,
            title: 'Compute Instance with Default Service Account',
            status: CloudFindingStatus.open,
            remediation: 'Create and assign a least-privilege custom service account.',
          },
          {
            resourceType: 'BigQuery Dataset',
            resourceId: 'projects/auraspear-prod-12345/datasets/user_analytics',
            severity: CloudFindingSeverity.low,
            title: 'BigQuery Dataset Accessible by allAuthenticatedUsers',
            status: CloudFindingStatus.resolved,
            remediation: 'Remove allAuthenticatedUsers binding. Grant specific IAM roles.',
          },
          {
            resourceType: 'Firewall Rule',
            resourceId: 'projects/auraspear-prod-12345/global/firewalls/allow-ssh',
            severity: CloudFindingSeverity.high,
            title: 'Firewall Rule Allows SSH from 0.0.0.0/0',
            status: CloudFindingStatus.open,
            remediation: 'Restrict SSH source ranges to IAP tunnel or VPN.',
          },
          {
            resourceType: 'Cloud SQL',
            resourceId: 'projects/auraspear-prod-12345/instances/analytics-db',
            severity: CloudFindingSeverity.medium,
            title: 'Cloud SQL Instance Without SSL Enforcement',
            status: CloudFindingStatus.open,
            remediation: 'Enable SSL enforcement for all connections.',
          },
          {
            resourceType: 'GKE Cluster',
            resourceId: 'projects/auraspear-prod-12345/locations/us-central1/clusters/analytics',
            severity: CloudFindingSeverity.critical,
            title: 'GKE Cluster with Legacy ABAC Enabled',
            status: CloudFindingStatus.open,
            remediation: 'Disable legacy ABAC and use RBAC exclusively.',
          },
        ],
      },
    ]

    for (const acc of accounts) {
      try {
        const existingAccount = await prisma.cloudAccount.findFirst({
          where: { tenantId, provider: acc.provider, accountId: acc.accountId },
          select: { id: true },
        })
        if (existingAccount) {
          continue
        }

        const createdAccount = await prisma.cloudAccount.create({
          data: {
            tenantId,
            provider: acc.provider,
            accountId: acc.accountId,
            alias: acc.alias,
            status: acc.status,
            region: acc.region,
            lastScanAt: randomDate(1),
            findingsCount: acc.findings.length,
            complianceScore: acc.complianceScore,
          },
        })

        for (const f of acc.findings) {
          await prisma.cloudFinding.create({
            data: {
              tenantId,
              cloudAccountId: createdAccount.id,
              resourceType: f.resourceType,
              resourceId: f.resourceId,
              severity: f.severity,
              title: f.title,
              description: `${f.title}. This finding was detected during automated cloud security assessment.`,
              status: f.status,
              remediationSteps: f.remediation,
              detectedAt: randomDate(14),
              resolvedAt: f.status === CloudFindingStatus.resolved ? randomDate(7) : null,
            },
          })
        }
      } catch (accError) {
        logger.warn(
          { tenant: tenantSlug, account: acc.alias, error: accError },
          'Skipped cloud account (already exists or error)'
        )
      }
    }

    logger.info({ tenant: tenantSlug, count: accounts.length }, 'Seeded cloud security')
  } catch (error) {
    logger.warn({ tenant: tenantSlug, error }, 'Failed to seed cloud security')
  }
}

const NOTIFICATION_TARGET_COUNT = 15

async function seedNotifications(
  tenantId: string,
  tenantSlug: string,
  userIds: string[]
): Promise<void> {
  if (userIds.length < 2) return

  const existingCount = await prisma.notification.count({ where: { tenantId } })
  if (existingCount >= NOTIFICATION_TARGET_COUNT) {
    logger.info(
      { tenant: tenantSlug, existing: existingCount },
      'Notifications already seeded, skipping'
    )
    return
  }

  // Fetch cases for this tenant to reference in notifications
  const cases = await prisma.case.findMany({
    where: { tenantId },
    select: { id: true, caseNumber: true, title: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  const notificationTemplates: Array<{
    type: string
    entityType: string
    titleFn: (caseTitle?: string) => string
    messageFn: (actorName: string, caseTitle?: string) => string
    needsCase: boolean
  }> = [
    {
      type: 'case_assigned',
      entityType: 'case',
      titleFn: caseTitle => `Assigned to case: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} assigned you to case "${caseTitle ?? 'Unknown'}"`,
      needsCase: true,
    },
    {
      type: 'case_status_changed',
      entityType: 'case',
      titleFn: caseTitle => `Case status updated: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} changed the status of "${caseTitle ?? 'Unknown'}" to in_progress`,
      needsCase: true,
    },
    {
      type: 'case_comment_added',
      entityType: 'case_comment',
      titleFn: caseTitle => `New comment on: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} commented on case "${caseTitle ?? 'Unknown'}"`,
      needsCase: true,
    },
    {
      type: 'case_updated',
      entityType: 'case',
      titleFn: caseTitle => `Case updated: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} updated case "${caseTitle ?? 'Unknown'}" severity to high`,
      needsCase: true,
    },
    {
      type: 'case_task_added',
      entityType: 'case',
      titleFn: caseTitle => `New task on: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} added a task to case "${caseTitle ?? 'Unknown'}"`,
      needsCase: true,
    },
    {
      type: 'role_changed',
      entityType: 'user',
      titleFn: () => 'Your role has been updated',
      messageFn: actorName => `${actorName} changed your role to SOC_ANALYST_L2`,
      needsCase: false,
    },
    {
      type: 'mention',
      entityType: 'case_comment',
      titleFn: caseTitle => `You were mentioned in: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} mentioned you in a comment on "${caseTitle ?? 'Unknown'}"`,
      needsCase: true,
    },
    {
      type: 'case_artifact_added',
      entityType: 'case',
      titleFn: caseTitle => `New artifact on: ${caseTitle ?? 'Unknown'}`,
      messageFn: (actorName, caseTitle) =>
        `${actorName} added an artifact to case "${caseTitle ?? 'Unknown'}"`,
      needsCase: true,
    },
  ]

  const actorNames = ['Admin User', 'Senior Analyst', 'Junior Analyst', 'Threat Hunter']
  const notifications: Array<{
    tenantId: string
    type: string
    actorUserId: string
    recipientUserId: string
    title: string
    message: string
    entityType: string
    entityId: string
    caseId: string | null
    readAt: Date | null
    createdAt: Date
  }> = []

  for (let i = 0; i < NOTIFICATION_TARGET_COUNT; i++) {
    const templateIndex = i % notificationTemplates.length
    const template = notificationTemplates[templateIndex]!
    const actorIndex = i % userIds.length
    let recipientIndex = (i + 1) % userIds.length
    if (recipientIndex === actorIndex) {
      recipientIndex = (recipientIndex + 1) % userIds.length
    }

    const actorId = userIds[actorIndex]!
    const recipientId = userIds[recipientIndex]!
    const actorName = actorNames[actorIndex] ?? 'Unknown'

    const caseRecord = template.needsCase && cases.length > 0 ? cases[i % cases.length] : undefined

    const hoursAgo = (i + 1) * 2
    const createdAt = subtractDuration(nowDate(), hoursAgo, 'hour')
    const isRead = i > NOTIFICATION_TARGET_COUNT / 2

    notifications.push({
      tenantId,
      type: template.type,
      actorUserId: actorId,
      recipientUserId: recipientId,
      title: template.titleFn(caseRecord?.title),
      message: template.messageFn(actorName, caseRecord?.title),
      entityType: template.entityType,
      entityId: caseRecord?.id ?? recipientId,
      caseId: caseRecord?.id ?? null,
      readAt: isRead ? addDuration(createdAt, 30, 'minute') : null,
      createdAt,
    })
  }

  await prisma.notification.createMany({ data: notifications, skipDuplicates: true })
  logger.info({ tenant: tenantSlug, count: notifications.length }, 'Seeded notifications')
}

// ─── Main seed function ────────────────────────────────────────

async function seedCaseCycles(tenantId: string, profile: TenantProfile): Promise<string[]> {
  const now = nowDate()
  const cycleIds: string[] = []

  for (const template of CYCLE_TEMPLATES) {
    try {
      const startDate = subtractDuration(now, template.daysAgo, 'day')
      const endDate = addDuration(startDate, template.durationDays, 'day')
      const cycleName = `[${profile.slug}] ${template.name}`

      const existingCycle = await prisma.caseCycle.findFirst({
        where: { tenantId, name: cycleName },
        select: { id: true },
      })
      if (existingCycle) {
        cycleIds.push(existingCycle.id)
        continue
      }

      const cycle = await prisma.caseCycle.create({
        data: {
          tenantId,
          name: cycleName,
          description: template.description,
          status: template.status,
          startDate,
          endDate: template.status === 'closed' ? endDate : null,
          createdBy: `admin@${profile.slug}.io`,
          closedBy: template.status === 'closed' ? `admin@${profile.slug}.io` : null,
          closedAt: template.status === 'closed' ? endDate : null,
        },
      })

      cycleIds.push(cycle.id)
    } catch (cycleError) {
      logger.warn(
        { tenant: profile.slug, cycle: template.name, error: cycleError },
        'Skipped case cycle (already exists or error)'
      )
    }
  }

  return cycleIds
}

/* ─── Entity Seeding ─────────────────────────────────────────────── */

const ENTITY_IPS = [
  // Private / internal
  '10.0.0.1',
  '10.0.0.5',
  '10.0.0.12',
  '10.0.0.50',
  '10.0.0.100',
  '10.0.1.1',
  '10.0.1.25',
  '10.0.2.10',
  '10.0.2.50',
  '10.0.3.1',
  '192.168.1.1',
  '192.168.1.10',
  '192.168.1.50',
  '192.168.1.100',
  '192.168.1.200',
  '192.168.10.1',
  '192.168.10.5',
  '192.168.10.20',
  '192.168.10.100',
  '192.168.10.254',
  // Public / suspicious / malicious
  '185.220.101.34',
  '185.220.101.45',
  '185.143.223.12',
  '185.56.80.65',
  '185.100.87.202',
  '45.33.32.156',
  '45.55.12.99',
  '45.77.65.211',
  '45.154.255.147',
  '45.129.56.200',
  '91.215.85.17',
  '91.234.99.38',
  '103.224.182.244',
  '104.248.50.87',
  '141.98.11.96',
  '198.51.100.1',
  '203.0.113.50',
  '172.217.14.206',
  '8.8.8.8',
  '1.1.1.1',
]

const ENTITY_DOMAINS = [
  'login.suspicious-site.com',
  'cdn.malware-host.net',
  'api.legit-service.com',
  'update.fake-microsoft.com',
  'dl.trojan-payload.xyz',
  'c2.darknet-ops.io',
  'mail.phishing-central.org',
  'auth.credential-harvest.com',
  'dns.exfil-tunnel.net',
  'proxy.anonymizer-hub.ru',
  'static.cdn-assets.com',
  'api.internal-tools.local',
  'monitor.grafana-prod.local',
  'vault.secrets-mgr.local',
  'git.devops-internal.local',
  'siem.wazuh-cluster.local',
  'ldap.corp-directory.local',
  'ntp.time-sync.local',
  'backup.storage-node.local',
  'log.elk-cluster.local',
]

const ENTITY_HOSTNAMES = [
  'fin-web-01',
  'fin-web-02',
  'dc-prod-01',
  'dc-prod-02',
  'mail-gw-01',
  'mail-gw-02',
  'dev-laptop-34',
  'dev-laptop-12',
  'hr-desktop-05',
  'exec-laptop-01',
  'db-master-01',
  'db-replica-01',
  'app-server-01',
  'app-server-02',
  'proxy-lb-01',
  'vpn-gw-01',
  'wazuh-manager',
  'elk-node-01',
  'backup-srv-01',
  'jump-box-01',
]

const ENTITY_USERS = [
  'admin',
  'root',
  'j.smith',
  's.johnson',
  'a.williams',
  'm.brown',
  'r.davis',
  'k.wilson',
  'svc-backup',
  'svc-monitor',
  'svc-deploy',
  'compromised-user',
  'temp-contractor',
  'd.martinez',
  'l.anderson',
  'p.thomas',
  'c.jackson',
  'n.white',
  'b.harris',
  'f.clark',
]

const ENTITY_EMAILS = [
  'phishing@evil-sender.com',
  'ciso@company.com',
  'admin@internal.local',
  'helpdesk@support.company.com',
  'noreply@auth-alert.com',
  'hr@company.com',
  'it-security@company.com',
  'soc-alerts@company.com',
  'ceo@company.com',
  'finance@company.com',
  'legal@company.com',
  'spam@bulk-mailer.net',
  'invoice@fake-vendor.com',
  'password-reset@phishing-kit.xyz',
  'recruiter@legit-jobs.com',
]

const ENTITY_HASHES = [
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  'deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef',
  'b5bb9d8014a0f9b1d61e21e796d78dccdf1352f23cd32812f4850b878ae4944c',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  '7d793037a0760186574b0282f2f435e7c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
  'ff9900aabb11cc22dd33ee44ff5566778899aabb00cc11dd22ee33ff44556677',
  '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
  'cafed00dcafed00dcafed00dcafed00dcafed00dcafed00dcafed00dcafed00d',
  '0011223344556677889900aabbccddeeff0011223344556677889900aabbccdd',
  'face0ff1ce0badbeef1234abcd5678ef9012345678abcdef0123456789abcdef',
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00',
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
]

const ENTITY_URLS = [
  'https://evil.com/payload.exe',
  'https://malware-host.net/dropper.js',
  'http://phishing-central.org/login.html',
  'https://c2.darknet-ops.io/beacon',
  'https://fake-microsoft.com/update.msi',
  'http://exfil-tunnel.net/upload',
  'https://credential-harvest.com/form',
  'https://trojan-payload.xyz/stage2.bin',
  'http://anonymizer-hub.ru/proxy.pac',
  'https://bulk-mailer.net/track/open.gif',
]

const ENTITY_PROCESSES = [
  'powershell.exe',
  'cmd.exe',
  'svchost.exe',
  'mimikatz.exe',
  'psexec.exe',
  'rundll32.exe',
  'wmic.exe',
  'certutil.exe',
  'mshta.exe',
  'regsvr32.exe',
]

interface SeedEntity {
  type: string
  value: string
  displayName: string | null
  riskScore: number
}

function buildSeedEntityRiskScore(type: string, value: string): number {
  // Known malicious
  const maliciousPatterns = [
    'mimikatz',
    'psexec',
    'evil',
    'malware',
    'phishing',
    'trojan',
    'c2.',
    'darknet',
    'credential-harvest',
    'exfil',
    'fake-',
    'compromised',
    'payload',
    'dropper',
    'beacon',
  ]
  const valueLower = value.toLowerCase()
  if (maliciousPatterns.some(p => valueLower.includes(p))) {
    return 70 + Math.floor(Math.random() * 26) // 70-95
  }

  // Suspicious
  const suspiciousPatterns = [
    '185.',
    '91.',
    '45.154',
    '45.129',
    '141.98',
    'admin',
    'root',
    'temp-contractor',
    'anonymizer',
    'bulk-mailer',
    'certutil',
    'mshta',
    'regsvr32',
    'wmic',
    'rundll32',
  ]
  if (suspiciousPatterns.some(p => valueLower.includes(p))) {
    return 30 + Math.floor(Math.random() * 31) // 30-60
  }

  // Internal / normal
  if (type === 'ip' && (valueLower.startsWith('10.') || valueLower.startsWith('192.168.'))) {
    return Math.floor(Math.random() * 21) // 0-20
  }
  if (
    type === 'hostname' &&
    (valueLower.includes('-prod-') ||
      valueLower.includes('-srv-') ||
      valueLower.includes('wazuh') ||
      valueLower.includes('elk'))
  ) {
    return Math.floor(Math.random() * 16) // 0-15
  }

  // Default low-medium
  return Math.floor(Math.random() * 31) // 0-30
}

function buildSeedEntities(): SeedEntity[] {
  const entities: SeedEntity[] = []

  for (const ip of ENTITY_IPS) {
    entities.push({
      type: 'ip',
      value: ip,
      displayName: null,
      riskScore: buildSeedEntityRiskScore('ip', ip),
    })
  }
  for (const domain of ENTITY_DOMAINS) {
    entities.push({
      type: 'domain',
      value: domain,
      displayName: null,
      riskScore: buildSeedEntityRiskScore('domain', domain),
    })
  }
  for (const hostname of ENTITY_HOSTNAMES) {
    entities.push({
      type: 'hostname',
      value: hostname,
      displayName: hostname,
      riskScore: buildSeedEntityRiskScore('hostname', hostname),
    })
  }
  for (const user of ENTITY_USERS) {
    entities.push({
      type: 'user',
      value: user,
      displayName: user,
      riskScore: buildSeedEntityRiskScore('user', user),
    })
  }
  for (const email of ENTITY_EMAILS) {
    entities.push({
      type: 'email',
      value: email,
      displayName: null,
      riskScore: buildSeedEntityRiskScore('email', email),
    })
  }
  for (const hash of ENTITY_HASHES) {
    entities.push({
      type: 'hash',
      value: hash,
      displayName: null,
      riskScore: buildSeedEntityRiskScore('hash', hash),
    })
  }
  for (const url of ENTITY_URLS) {
    entities.push({
      type: 'url',
      value: url,
      displayName: null,
      riskScore: buildSeedEntityRiskScore('url', url),
    })
  }
  for (const proc of ENTITY_PROCESSES) {
    entities.push({
      type: 'process',
      value: proc,
      displayName: proc,
      riskScore: buildSeedEntityRiskScore('process', proc),
    })
  }

  return entities
}

interface SeedRelationSpec {
  fromType: string
  fromValue: string
  toType: string
  toValue: string
  relationType: string
}

const ENTITY_RELATION_SPECS: SeedRelationSpec[] = [
  // IP → IP (communicates_with)
  {
    fromType: 'ip',
    fromValue: '10.0.0.1',
    toType: 'ip',
    toValue: '185.220.101.34',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '10.0.0.5',
    toType: 'ip',
    toValue: '185.220.101.45',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '192.168.1.10',
    toType: 'ip',
    toValue: '45.33.32.156',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '192.168.1.50',
    toType: 'ip',
    toValue: '91.215.85.17',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '10.0.1.1',
    toType: 'ip',
    toValue: '45.154.255.147',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '192.168.10.1',
    toType: 'ip',
    toValue: '185.143.223.12',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '10.0.2.10',
    toType: 'ip',
    toValue: '103.224.182.244',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '10.0.0.50',
    toType: 'ip',
    toValue: '141.98.11.96',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '192.168.1.100',
    toType: 'ip',
    toValue: '45.129.56.200',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '10.0.3.1',
    toType: 'ip',
    toValue: '91.234.99.38',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '10.0.0.12',
    toType: 'ip',
    toValue: '8.8.8.8',
    relationType: 'communicates_with',
  },
  {
    fromType: 'ip',
    fromValue: '192.168.10.5',
    toType: 'ip',
    toValue: '1.1.1.1',
    relationType: 'communicates_with',
  },

  // IP → Domain (resolves_to)
  {
    fromType: 'ip',
    fromValue: '185.220.101.34',
    toType: 'domain',
    toValue: 'login.suspicious-site.com',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '185.143.223.12',
    toType: 'domain',
    toValue: 'cdn.malware-host.net',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '45.33.32.156',
    toType: 'domain',
    toValue: 'c2.darknet-ops.io',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '91.215.85.17',
    toType: 'domain',
    toValue: 'auth.credential-harvest.com',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '45.154.255.147',
    toType: 'domain',
    toValue: 'dl.trojan-payload.xyz',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '185.56.80.65',
    toType: 'domain',
    toValue: 'update.fake-microsoft.com',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '45.129.56.200',
    toType: 'domain',
    toValue: 'dns.exfil-tunnel.net',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '91.234.99.38',
    toType: 'domain',
    toValue: 'proxy.anonymizer-hub.ru',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '172.217.14.206',
    toType: 'domain',
    toValue: 'api.legit-service.com',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '104.248.50.87',
    toType: 'domain',
    toValue: 'mail.phishing-central.org',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '185.100.87.202',
    toType: 'domain',
    toValue: 'static.cdn-assets.com',
    relationType: 'resolves_to',
  },
  {
    fromType: 'ip',
    fromValue: '198.51.100.1',
    toType: 'domain',
    toValue: 'api.internal-tools.local',
    relationType: 'resolves_to',
  },

  // Hostname → IP (hosts)
  {
    fromType: 'hostname',
    fromValue: 'fin-web-01',
    toType: 'ip',
    toValue: '10.0.0.1',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'fin-web-02',
    toType: 'ip',
    toValue: '10.0.0.5',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'dc-prod-01',
    toType: 'ip',
    toValue: '10.0.0.12',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'dc-prod-02',
    toType: 'ip',
    toValue: '10.0.0.50',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'mail-gw-01',
    toType: 'ip',
    toValue: '10.0.1.1',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'mail-gw-02',
    toType: 'ip',
    toValue: '10.0.1.25',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'dev-laptop-34',
    toType: 'ip',
    toValue: '192.168.1.10',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'dev-laptop-12',
    toType: 'ip',
    toValue: '192.168.1.50',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'hr-desktop-05',
    toType: 'ip',
    toValue: '192.168.1.100',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'exec-laptop-01',
    toType: 'ip',
    toValue: '192.168.1.200',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'db-master-01',
    toType: 'ip',
    toValue: '10.0.2.10',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'db-replica-01',
    toType: 'ip',
    toValue: '10.0.2.50',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'app-server-01',
    toType: 'ip',
    toValue: '10.0.0.100',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'app-server-02',
    toType: 'ip',
    toValue: '10.0.3.1',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'proxy-lb-01',
    toType: 'ip',
    toValue: '192.168.10.1',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'vpn-gw-01',
    toType: 'ip',
    toValue: '192.168.10.5',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'wazuh-manager',
    toType: 'ip',
    toValue: '192.168.10.20',
    relationType: 'hosts',
  },
  {
    fromType: 'hostname',
    fromValue: 'elk-node-01',
    toType: 'ip',
    toValue: '192.168.10.100',
    relationType: 'hosts',
  },

  // User → Hostname (belongs_to)
  {
    fromType: 'user',
    fromValue: 'j.smith',
    toType: 'hostname',
    toValue: 'dev-laptop-34',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 's.johnson',
    toType: 'hostname',
    toValue: 'dev-laptop-12',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'a.williams',
    toType: 'hostname',
    toValue: 'hr-desktop-05',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'admin',
    toType: 'hostname',
    toValue: 'dc-prod-01',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'root',
    toType: 'hostname',
    toValue: 'dc-prod-02',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'm.brown',
    toType: 'hostname',
    toValue: 'exec-laptop-01',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'svc-backup',
    toType: 'hostname',
    toValue: 'backup-srv-01',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'svc-monitor',
    toType: 'hostname',
    toValue: 'wazuh-manager',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'svc-deploy',
    toType: 'hostname',
    toValue: 'app-server-01',
    relationType: 'belongs_to',
  },
  {
    fromType: 'user',
    fromValue: 'compromised-user',
    toType: 'hostname',
    toValue: 'fin-web-01',
    relationType: 'belongs_to',
  },

  // Email → User (associated_with)
  {
    fromType: 'email',
    fromValue: 'ciso@company.com',
    toType: 'user',
    toValue: 'm.brown',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'admin@internal.local',
    toType: 'user',
    toValue: 'admin',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'helpdesk@support.company.com',
    toType: 'user',
    toValue: 'a.williams',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'it-security@company.com',
    toType: 'user',
    toValue: 'r.davis',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'soc-alerts@company.com',
    toType: 'user',
    toValue: 'k.wilson',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'hr@company.com',
    toType: 'user',
    toValue: 'a.williams',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'finance@company.com',
    toType: 'user',
    toValue: 'd.martinez',
    relationType: 'associated_with',
  },
  {
    fromType: 'email',
    fromValue: 'ceo@company.com',
    toType: 'user',
    toValue: 'l.anderson',
    relationType: 'associated_with',
  },

  // Process → Hostname (executed_by)
  {
    fromType: 'process',
    fromValue: 'mimikatz.exe',
    toType: 'hostname',
    toValue: 'fin-web-01',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'psexec.exe',
    toType: 'hostname',
    toValue: 'dc-prod-01',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'powershell.exe',
    toType: 'hostname',
    toValue: 'dev-laptop-34',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'cmd.exe',
    toType: 'hostname',
    toValue: 'app-server-01',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'svchost.exe',
    toType: 'hostname',
    toValue: 'dc-prod-02',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'rundll32.exe',
    toType: 'hostname',
    toValue: 'hr-desktop-05',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'wmic.exe',
    toType: 'hostname',
    toValue: 'exec-laptop-01',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'certutil.exe',
    toType: 'hostname',
    toValue: 'dev-laptop-12',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'mshta.exe',
    toType: 'hostname',
    toValue: 'fin-web-02',
    relationType: 'executed_by',
  },
  {
    fromType: 'process',
    fromValue: 'regsvr32.exe',
    toType: 'hostname',
    toValue: 'mail-gw-01',
    relationType: 'executed_by',
  },

  // IP → triggered_alert (generic)
  {
    fromType: 'ip',
    fromValue: '185.220.101.34',
    toType: 'hostname',
    toValue: 'fin-web-01',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '45.33.32.156',
    toType: 'hostname',
    toValue: 'dc-prod-01',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '91.215.85.17',
    toType: 'hostname',
    toValue: 'dev-laptop-34',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '45.154.255.147',
    toType: 'hostname',
    toValue: 'mail-gw-01',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '185.143.223.12',
    toType: 'hostname',
    toValue: 'app-server-01',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '141.98.11.96',
    toType: 'hostname',
    toValue: 'db-master-01',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '45.129.56.200',
    toType: 'hostname',
    toValue: 'proxy-lb-01',
    relationType: 'triggered_alert',
  },
  {
    fromType: 'ip',
    fromValue: '103.224.182.244',
    toType: 'hostname',
    toValue: 'vpn-gw-01',
    relationType: 'triggered_alert',
  },
]

async function seedEntities(tenantId: string, tenantSlug: string): Promise<void> {
  const entities = buildSeedEntities()

  // Upsert all entities (idempotent via unique constraint [tenantId, type, value])
  const entityIdMap = new Map<string, string>()
  for (const entity of entities) {
    const mapKey = `${entity.type}:${entity.value}`
    try {
      const result = await prisma.entity.upsert({
        where: { tenantId_type_value: { tenantId, type: entity.type, value: entity.value } },
        create: {
          tenantId,
          type: entity.type,
          value: entity.value,
          displayName: entity.displayName,
          riskScore: entity.riskScore,
          lastSeen: nowDate(),
        },
        update: {
          riskScore: entity.riskScore,
          lastSeen: nowDate(),
          ...(entity.displayName ? { displayName: entity.displayName } : {}),
        },
      })
      entityIdMap.set(mapKey, result.id)
    } catch (err) {
      logger.warn({ tenant: tenantSlug, entity: mapKey, error: err }, 'Failed to upsert entity')
    }
  }

  logger.info({ tenant: tenantSlug, count: entityIdMap.size }, 'Seeded entities')

  // Create relationships
  let relationsCreated = 0
  for (const spec of ENTITY_RELATION_SPECS) {
    const fromKey = `${spec.fromType}:${spec.fromValue}`
    const toKey = `${spec.toType}:${spec.toValue}`
    const fromId = entityIdMap.get(fromKey)
    const toId = entityIdMap.get(toKey)

    if (!fromId || !toId) {
      continue
    }

    try {
      await prisma.entityRelation.create({
        data: {
          tenantId,
          fromEntityId: fromId,
          toEntityId: toId,
          relationType: spec.relationType,
          source: 'seed',
          confidence: 1.0,
        },
      })
      relationsCreated++
    } catch {
      // Duplicate or constraint violation — skip silently (idempotent)
    }
  }

  logger.info({ tenant: tenantSlug, count: relationsCreated }, 'Seeded entity relations')
}

async function seedRolePermissions(tenantId: string): Promise<void> {
  // Build the full set of default role-permission records
  const records: Prisma.RolePermissionCreateManyInput[] = []
  for (const role of CONFIGURABLE_ROLES) {
    const permissions = DEFAULT_PERMISSIONS[role] ?? []
    for (const permissionKey of permissions) {
      records.push({
        tenantId,
        role: role as UserRole,
        permissionKey,
        allowed: true,
      })
    }
  }

  if (records.length > 0) {
    // skipDuplicates makes this idempotent — existing rows are left untouched,
    // only missing permission rows (e.g. newly added permissions) are inserted.
    // Tenant-customized permissions (added or removed by admins) are preserved.
    await prisma.rolePermission.createMany({ data: records, skipDuplicates: true })
  }

  logger.info({ tenantId, count: records.length }, 'Seeded default role permissions')
}

async function seedPermissionDefinitions(): Promise<void> {
  for (const def of PERMISSION_DEFINITIONS) {
    const existing = await prisma.permissionDefinition.findFirst({
      where: { tenantId: null, key: def.key },
    })

    if (existing) {
      await prisma.permissionDefinition.update({
        where: { id: existing.id },
        data: { module: def.module, labelKey: def.labelKey, sortOrder: def.sortOrder },
      })
    } else {
      await prisma.permissionDefinition.create({
        data: {
          key: def.key,
          module: def.module,
          labelKey: def.labelKey,
          sortOrder: def.sortOrder,
        },
      })
    }
  }

  logger.info({ count: PERMISSION_DEFINITIONS.length }, 'Seeded permission definitions')
}

async function main(): Promise<void> {
  logger.info('Seeding database...')

  // Seed permission definitions (global, not per-tenant)
  await seedPermissionDefinitions()
  await seedReportTemplates()

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS)

  // ─── Platform Admin (true GLOBAL_ADMIN, member of every tenant) ───
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'platform-admin@auraspear.io' },
    update: { passwordHash, isProtected: true },
    create: {
      email: 'platform-admin@auraspear.io',
      name: 'Platform Administrator',
      passwordHash,
      isProtected: true,
    },
  })

  await prisma.userPreference.upsert({
    where: { userId: platformAdmin.id },
    update: {},
    create: {
      userId: platformAdmin.id,
      theme: 'system',
      language: 'en',
      dashboardDensity: DEFAULT_DASHBOARD_DENSITY,
      collapsedDashboardPanels: DEFAULT_COLLAPSED_DASHBOARD_PANELS,
      notificationsEmail: true,
      notificationsInApp: true,
    },
  })

  // Create GLOBAL_ADMIN membership for every tenant
  let firstTenantId = ''
  for (const profile of TENANT_PROFILES) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: profile.slug },
      update: {},
      create: {
        id: profile.id,
        name: profile.name,
        slug: profile.slug,
      },
    })

    if (!firstTenantId) {
      firstTenantId = tenant.id
    }

    await prisma.tenantMembership.upsert({
      where: { userId_tenantId: { userId: platformAdmin.id, tenantId: tenant.id } },
      update: { role: UserRole.GLOBAL_ADMIN, status: 'active' },
      create: {
        userId: platformAdmin.id,
        tenantId: tenant.id,
        role: UserRole.GLOBAL_ADMIN,
      },
    })
  }

  await seedUserSession(
    platformAdmin.id,
    firstTenantId,
    'platform-admin',
    'desktop',
    UserSessionOsFamily.macos,
    UserSessionClientType.desktop,
    '10.99.0.10',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 Version/17.3 Safari/605.1.15',
    subtractDuration(nowDate(), 15, 'minute'),
    subtractDuration(nowDate(), 2, 'minute')
  )

  logger.info(
    { email: 'platform-admin@auraspear.io' },
    'Seeded platform admin with GLOBAL_ADMIN on all tenants'
  )

  // Initialize global case counter from existing max case number
  const maxCase = await prisma.case.findFirst({
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true },
  })
  if (maxCase?.caseNumber) {
    const match = maxCase.caseNumber.match(/SOC-\d+-(\d+)/)
    if (match?.[1]) {
      globalCaseCounter = Number.parseInt(match[1], 10)
    }
  }

  // Initialize global counters for Phase 1-4 modules
  const maxIncident = await prisma.incident.findFirst({
    orderBy: { incidentNumber: 'desc' },
    select: { incidentNumber: true },
  })
  if (maxIncident?.incidentNumber) {
    const m = maxIncident.incidentNumber.match(/INC-\d+-(\d+)/)
    if (m?.[1]) globalIncidentCounter = Number.parseInt(m[1], 10)
  }

  const maxCorrRule = await prisma.correlationRule.findFirst({
    orderBy: { ruleNumber: 'desc' },
    select: { ruleNumber: true },
  })
  if (maxCorrRule?.ruleNumber) {
    const m = maxCorrRule.ruleNumber.match(/CR-\d+-(\d+)/)
    if (m?.[1]) globalCorrelationRuleCounter = Number.parseInt(m[1], 10)
  }

  const maxAttackPath = await prisma.attackPath.findFirst({
    orderBy: { pathNumber: 'desc' },
    select: { pathNumber: true },
  })
  if (maxAttackPath?.pathNumber) {
    const m = maxAttackPath.pathNumber.match(/AP-\d+-(\d+)/)
    if (m?.[1]) globalAttackPathCounter = Number.parseInt(m[1], 10)
  }

  const maxDetRule = await prisma.detectionRule.findFirst({
    orderBy: { ruleNumber: 'desc' },
    select: { ruleNumber: true },
  })
  if (maxDetRule?.ruleNumber) {
    const m = maxDetRule.ruleNumber.match(/DR-\d+-(\d+)/)
    if (m?.[1]) globalDetectionRuleCounter = Number.parseInt(m[1], 10)
  }

  for (const profile of TENANT_PROFILES) {
    try {
      await prisma.tenant.upsert({
        where: { slug: profile.slug },
        update: {},
        create: {
          id: profile.id,
          name: profile.name,
          slug: profile.slug,
        },
      })

      const createdTenant = await prisma.tenant.findUnique({ where: { slug: profile.slug } })
      const tenantId = createdTenant?.id ?? profile.id

      // ─── Users + Memberships ───
      const userDefs = [
        {
          oidcSub: `admin-${profile.slug}`,
          email: `admin@${profile.slug}.io`,
          name: 'Admin User',
          role: UserRole.TENANT_ADMIN,
        },
        {
          oidcSub: `analyst-l2-${profile.slug}`,
          email: `analyst.l2@${profile.slug}.io`,
          name: 'Senior Analyst',
          role: UserRole.SOC_ANALYST_L2,
        },
        {
          oidcSub: `analyst-l1-${profile.slug}`,
          email: `analyst.l1@${profile.slug}.io`,
          name: 'Junior Analyst',
          role: UserRole.SOC_ANALYST_L1,
        },
        {
          oidcSub: `hunter-${profile.slug}`,
          email: `hunter@${profile.slug}.io`,
          name: 'Threat Hunter',
          role: UserRole.THREAT_HUNTER,
        },
        {
          oidcSub: `exec-${profile.slug}`,
          email: `exec@${profile.slug}.io`,
          name: 'Executive',
          role: UserRole.EXECUTIVE_READONLY,
        },
      ]

      for (const [userIndex, userDef] of userDefs.entries()) {
        const isProtected = userDef.role === UserRole.TENANT_ADMIN
        const seededLastLoginAt = subtractDuration(nowDate(), (userIndex + 1) * 45, 'minute')

        const createdUser = await prisma.user.upsert({
          where: { email: userDef.email },
          update: {
            name: userDef.name,
            oidcSub: userDef.oidcSub,
            passwordHash,
            isProtected,
            lastLoginAt: seededLastLoginAt,
          },
          create: {
            email: userDef.email,
            name: userDef.name,
            oidcSub: userDef.oidcSub,
            passwordHash,
            isProtected,
            lastLoginAt: seededLastLoginAt,
          },
        })

        await prisma.tenantMembership.upsert({
          where: { userId_tenantId: { userId: createdUser.id, tenantId } },
          update: {
            role: userDef.role,
            status: 'active',
          },
          create: {
            userId: createdUser.id,
            tenantId,
            role: userDef.role,
          },
        })

        await prisma.userPreference.upsert({
          where: { userId: createdUser.id },
          update: {},
          create: {
            userId: createdUser.id,
            theme: 'system',
            language: 'en',
            dashboardDensity: DEFAULT_DASHBOARD_DENSITY,
            collapsedDashboardPanels: DEFAULT_COLLAPSED_DASHBOARD_PANELS,
            notificationsEmail: true,
            notificationsInApp: true,
          },
        })

        logger.info(
          { tenant: profile.slug, email: userDef.email, role: userDef.role },
          'Seeded user'
        )

        await seedUserSession(
          createdUser.id,
          tenantId,
          userDef.oidcSub,
          'desktop',
          UserSessionOsFamily.windows,
          UserSessionClientType.desktop,
          `10.10.${userIndex + 10}.15`,
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
          seededLastLoginAt,
          subtractDuration(nowDate(), (userIndex + 1) * 6, 'minute')
        )

        if (userDef.role === UserRole.TENANT_ADMIN || userDef.role === UserRole.SOC_ANALYST_L2) {
          await seedUserSession(
            createdUser.id,
            tenantId,
            userDef.oidcSub,
            'mobile',
            UserSessionOsFamily.android,
            UserSessionClientType.mobile,
            `10.20.${userIndex + 20}.25`,
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36',
            subtractDuration(seededLastLoginAt, 2, 'hour'),
            subtractDuration(nowDate(), (userIndex + 1) * 18, 'minute')
          )
        }
      }

      // Collect user IDs that can be assigned cases (analysts, hunters, admins — not execs)
      const assignableUsers = await prisma.tenantMembership.findMany({
        where: {
          tenantId,
          status: 'active',
          role: {
            in: [
              UserRole.GLOBAL_ADMIN,
              UserRole.TENANT_ADMIN,
              UserRole.SOC_ANALYST_L2,
              UserRole.SOC_ANALYST_L1,
              UserRole.THREAT_HUNTER,
            ],
          },
        },
        select: { userId: true },
      })
      const assignableUserIds = assignableUsers.map(u => u.userId)

      // ─── Connectors ───
      const encryptionKey = process.env.CONFIG_ENCRYPTION_KEY
      for (const connector of profile.connectors) {
        const encryptedConfig = encryptionKey
          ? encrypt(JSON.stringify(connector.config), encryptionKey)
          : JSON.stringify(connector.config)

        await prisma.connectorConfig.upsert({
          where: { tenantId_type: { tenantId, type: connector.type } },
          update: { encryptedConfig },
          create: {
            tenantId,
            type: connector.type,
            name: connector.name,
            authType: connector.authType,
            enabled: connector.enabled,
            encryptedConfig,
          },
        })
      }

      // ─── Alerts ───
      await seedAlerts(tenantId, profile)
      logger.info({ tenant: profile.slug, count: profile.alertCount }, 'Seeded alerts')

      // ─── Case Cycles ───
      const cycleIds = await seedCaseCycles(tenantId, profile)
      logger.info({ tenant: profile.slug, count: CYCLE_TEMPLATES.length }, 'Seeded case cycles')

      // ─── Cases ───
      await seedCases(tenantId, profile, cycleIds, assignableUserIds)
      logger.info(
        { tenant: profile.slug, count: profile.caseTemplateIndices.length },
        'Seeded cases'
      )

      // ─── Notifications (depends on users + cases) ───
      await seedNotifications(tenantId, profile.slug, assignableUserIds)

      // ─── Hunt Sessions ───
      await seedHuntSessions(tenantId, profile)
      logger.info(
        { tenant: profile.slug, count: profile.huntQueryIndices.length },
        'Seeded hunt sessions'
      )

      // ─── Intel ───
      await seedIntel(tenantId, profile)
      logger.info(
        {
          tenant: profile.slug,
          iocs: profile.iocIndices.length,
          mispEvents: profile.mispEventIndices.length,
        },
        'Seeded intel'
      )

      // ─── AI Audit Logs ───
      await seedAiAuditLogs(tenantId, profile.slug)
      logger.info({ tenant: profile.slug, count: AI_AUDIT_TARGET_COUNT }, 'Seeded AI audit logs')

      // ─── Phase 1-4 Modules ───
      await seedIncidents(tenantId, profile.slug)
      await seedCorrelationRules(tenantId, profile.slug)
      await seedVulnerabilities(tenantId, profile.slug)
      await seedAiAgents(tenantId, profile.slug)
      await seedUeba(tenantId, profile.slug)
      await seedAttackPaths(tenantId, profile.slug)
      await seedSoar(tenantId, profile.slug)
      await seedCompliance(tenantId, profile.slug)
      await seedReports(tenantId, profile.slug)
      await seedSystemHealth(tenantId, profile.slug)
      await seedNormalization(tenantId, profile.slug)
      await seedDetectionRules(tenantId, profile.slug)
      await seedCloudSecurity(tenantId, profile.slug)

      // ─── Entities ───
      await seedEntities(tenantId, profile.slug)

      // ─── Role Permissions ───
      await seedRolePermissions(tenantId)

      logger.info({ tenant: profile.slug }, 'Tenant seeding completed')
    } catch (tenantError) {
      logger.warn(
        { tenant: profile.slug, error: tenantError },
        'Failed to seed tenant — continuing with next'
      )
    }
  }

  logger.info('Seed completed.')
}

main()
  .catch(error => {
    logger.error(error, 'Seed failed')
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
