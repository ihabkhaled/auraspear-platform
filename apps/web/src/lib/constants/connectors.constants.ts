import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Brain,
  BarChart3,
  CheckCircle,
  Crosshair,
  Database,
  FileText,
  Folder,
  GitBranch,
  Globe,
  Laptop,
  LayoutDashboard,
  List,
  Monitor,
  Network,
  Radar,
  RefreshCw,
  Shield,
  ShieldCheck,
  Tag,
  Wifi,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  AlertSeverity,
  CardVariant,
  ConnectorAuthType,
  ConnectorCategory,
  ConnectorStatus,
  ConnectorType,
} from '@/enums'
import type { ConnectorMeta, SecurityPosture } from '@/types'

export const CONNECTOR_TYPES: ConnectorType[] = [
  ConnectorType.WAZUH,
  ConnectorType.GRAYLOG,
  ConnectorType.LOGSTASH,
  ConnectorType.VELOCIRAPTOR,
  ConnectorType.GRAFANA,
  ConnectorType.INFLUXDB,
  ConnectorType.MISP,
  ConnectorType.SHUFFLE,
  ConnectorType.BEDROCK,
  ConnectorType.LLM_APIS,
  ConnectorType.OPENCLAW_GATEWAY,
]

export const CONNECTOR_ICONS: Record<ConnectorType, LucideIcon> = {
  [ConnectorType.WAZUH]: Shield,
  [ConnectorType.GRAYLOG]: FileText,
  [ConnectorType.LOGSTASH]: Workflow,
  [ConnectorType.VELOCIRAPTOR]: Crosshair,
  [ConnectorType.GRAFANA]: BarChart3,
  [ConnectorType.INFLUXDB]: Database,
  [ConnectorType.MISP]: Radar,
  [ConnectorType.SHUFFLE]: Zap,
  [ConnectorType.BEDROCK]: Brain,
  [ConnectorType.LLM_APIS]: Globe,
  [ConnectorType.OPENCLAW_GATEWAY]: Network,
}

export const CONNECTOR_META: Record<ConnectorType, ConnectorMeta> = {
  [ConnectorType.WAZUH]: {
    label: 'Wazuh',
    descriptionKey: 'connectorDesc.wazuh',
    category: ConnectorCategory.SIEM,
  },
  [ConnectorType.GRAYLOG]: {
    label: 'Graylog',
    descriptionKey: 'connectorDesc.graylog',
    category: ConnectorCategory.SIEM,
  },
  [ConnectorType.LOGSTASH]: {
    label: 'Logstash',
    descriptionKey: 'connectorDesc.logstash',
    category: ConnectorCategory.SIEM,
  },
  [ConnectorType.VELOCIRAPTOR]: {
    label: 'Velociraptor',
    descriptionKey: 'connectorDesc.velociraptor',
    category: ConnectorCategory.EDR,
  },
  [ConnectorType.GRAFANA]: {
    label: 'Grafana',
    descriptionKey: 'connectorDesc.grafana',
    category: ConnectorCategory.OBSERVABILITY,
  },
  [ConnectorType.INFLUXDB]: {
    label: 'InfluxDB',
    descriptionKey: 'connectorDesc.influxdb',
    category: ConnectorCategory.OBSERVABILITY,
  },
  [ConnectorType.MISP]: {
    label: 'MISP',
    descriptionKey: 'connectorDesc.misp',
    category: ConnectorCategory.THREAT_INTEL,
  },
  [ConnectorType.SHUFFLE]: {
    label: 'Shuffle SOAR',
    descriptionKey: 'connectorDesc.shuffle',
    category: ConnectorCategory.SOAR,
  },
  [ConnectorType.BEDROCK]: {
    label: 'AWS Bedrock AI',
    descriptionKey: 'connectorDesc.bedrock',
    category: ConnectorCategory.AI,
  },
  [ConnectorType.LLM_APIS]: {
    label: 'LLM APIs',
    descriptionKey: 'connectorDesc.llmApis',
    category: ConnectorCategory.AI,
  },
  [ConnectorType.OPENCLAW_GATEWAY]: {
    label: 'OpenClaw Gateway',
    descriptionKey: 'connectorDesc.openclawGateway',
    category: ConnectorCategory.AI,
  },
}

export const CONNECTOR_AUTH_TYPES: ConnectorAuthType[] = [
  ConnectorAuthType.API_KEY,
  ConnectorAuthType.BASIC,
  ConnectorAuthType.TOKEN,
  ConnectorAuthType.IAM,
]

export const SECURITY_POSTURE: Record<ConnectorType, SecurityPosture> = {
  [ConnectorType.WAZUH]: { mTLS: true, iam: false, encryption: true },
  [ConnectorType.GRAYLOG]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.LOGSTASH]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.VELOCIRAPTOR]: { mTLS: true, iam: false, encryption: true },
  [ConnectorType.GRAFANA]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.INFLUXDB]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.MISP]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.SHUFFLE]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.BEDROCK]: { mTLS: true, iam: true, encryption: true },
  [ConnectorType.LLM_APIS]: { mTLS: false, iam: false, encryption: true },
  [ConnectorType.OPENCLAW_GATEWAY]: { mTLS: false, iam: false, encryption: true },
}

export const CONNECTOR_STATUS_STYLES: Record<ConnectorStatus, string> = {
  [ConnectorStatus.NOT_CONFIGURED]: 'bg-muted text-muted-foreground',
  [ConnectorStatus.CONNECTED]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  [ConnectorStatus.DISCONNECTED]: 'bg-destructive/15 text-destructive',
  [ConnectorStatus.TESTING]: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse',
}

export const CONNECTOR_STATUS_KEYS: Record<ConnectorStatus, string> = {
  [ConnectorStatus.NOT_CONFIGURED]: 'statusNotConfigured',
  [ConnectorStatus.CONNECTED]: 'statusConnected',
  [ConnectorStatus.DISCONNECTED]: 'statusDisconnected',
  [ConnectorStatus.TESTING]: 'statusTesting',
}

export const BEDROCK_MODELS = [
  {
    id: 'global.anthropic.claude-opus-4-6-v1',
    label: 'Claude Opus 4.6',
  },
  {
    id: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
    label: 'Claude Sonnet 4.5',
  },
  {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    label: 'Claude 3 Haiku',
  },
  {
    id: 'amazon.nova-micro-v1:0',
    label: 'Amazon Nova Micro',
  },
  {
    id: 'us.meta.llama3-1-70b-instruct-v1:0',
    label: 'Llama 3.1 70B',
  },
] as const

export const AWS_REGIONS = [
  { id: 'us-east-1', label: 'US East (N. Virginia)' },
  { id: 'us-west-2', label: 'US West (Oregon)' },
  { id: 'eu-west-1', label: 'EU (Ireland)' },
  { id: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
] as const

/** Connectors that support automatic data sync (ingest into AuraSpear DB). */
export const SYNCABLE_CONNECTOR_TYPES: ReadonlySet<ConnectorType> = new Set([
  ConnectorType.WAZUH,
  ConnectorType.GRAYLOG,
  ConnectorType.MISP,
])

export function isConnectorType(value: string): value is ConnectorType {
  return CONNECTOR_TYPES.includes(value as ConnectorType)
}

export function isSyncableConnector(type: ConnectorType): boolean {
  return SYNCABLE_CONNECTOR_TYPES.has(type)
}

export const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  [AlertSeverity.CRITICAL]: 'bg-severity-critical text-white',
  [AlertSeverity.HIGH]: 'bg-severity-high text-white',
  [AlertSeverity.MEDIUM]: 'bg-severity-medium text-white',
  [AlertSeverity.LOW]: 'bg-severity-low',
  [AlertSeverity.INFO]: 'bg-severity-info',
}

export const WORKSPACE_ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  brain: Brain,
  'check-circle': CheckCircle,
  database: Database,
  folder: Folder,
  'git-branch': GitBranch,
  globe: Globe,
  laptop: Laptop,
  'layout-dashboard': LayoutDashboard,
  list: List,
  monitor: Monitor,
  'refresh-cw': RefreshCw,
  shield: Shield,
  'shield-check': ShieldCheck,
  tag: Tag,
  wifi: Wifi,
  workflow: Workflow,
}

export const WORKSPACE_HEADER_STATUS_CLASSES: Record<string, string> = {
  [ConnectorStatus.CONNECTED]: 'bg-status-success text-status-success border-status-success',
  [ConnectorStatus.DISCONNECTED]: 'bg-status-error text-status-error border-status-error',
  [ConnectorStatus.TESTING]: 'bg-status-warning text-status-warning border-status-warning',
  [ConnectorStatus.NOT_CONFIGURED]: '',
}

export const WORKSPACE_VARIANT_CLASSES: Record<CardVariant, string> = {
  [CardVariant.DEFAULT]: 'text-foreground',
  [CardVariant.SUCCESS]: 'text-status-success',
  [CardVariant.WARNING]: 'text-status-warning',
  [CardVariant.ERROR]: 'text-status-error',
  [CardVariant.INFO]: 'text-status-info',
}
