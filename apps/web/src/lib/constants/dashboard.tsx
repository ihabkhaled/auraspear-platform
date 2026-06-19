import type { ReactNode } from 'react'
import {
  Shield,
  AlertTriangle,
  Briefcase,
  Clock,
  Flame,
  Bug,
  UserX,
  Route,
  CheckCircle,
  Zap,
  HeartPulse,
  Bot,
  Workflow,
  PlugZap,
} from 'lucide-react'

export const KPI_ICONS: ReactNode[] = [
  <Shield key="shield" className="h-5 w-5" />,
  <AlertTriangle key="alert" className="h-5 w-5" />,
  <Briefcase key="briefcase" className="h-5 w-5" />,
  <Clock key="clock" className="h-5 w-5" />,
]

export const KPI_COLORS = [
  'var(--primary)',
  'var(--severity-critical)',
  'var(--status-info)',
  'var(--status-success)',
]

export const KPI_ROUTES = {
  totalAlerts: '/alerts?timeRange=7d',
  criticalAlerts: '/alerts?timeRange=7d&severity=critical',
  openCases: '/cases?status=open',
} as const

export const EXTENDED_KPI_ICONS: ReactNode[] = [
  <Flame key="incidents" className="h-5 w-5" />,
  <Bug key="vulns" className="h-5 w-5" />,
  <UserX key="ueba" className="h-5 w-5" />,
  <Route key="attack" className="h-5 w-5" />,
  <CheckCircle key="compliance" className="h-5 w-5" />,
  <Zap key="soar" className="h-5 w-5" />,
  <HeartPulse key="health" className="h-5 w-5" />,
  <Workflow key="jobs" className="h-5 w-5" />,
  <Bot key="agents" className="h-5 w-5" />,
  <PlugZap key="connectors" className="h-5 w-5" />,
]

export const EXTENDED_KPI_COLORS = [
  'var(--severity-high)',
  'var(--severity-critical)',
  'var(--status-warning)',
  'var(--severity-medium)',
  'var(--status-success)',
  'var(--status-info)',
  'var(--primary)',
  'var(--status-warning)',
  'var(--primary)',
  'var(--severity-high)',
]

export const EXTENDED_KPI_ROUTES = {
  openIncidents: '/incidents',
  criticalVulnerabilities: '/vulnerabilities?severity=critical',
  highRiskEntities: '/ueba',
  activeAttackPaths: '/attack-paths',
  complianceScore: '/compliance',
  soarExecutions: '/soar',
  systemHealthScore: '/system-health',
  jobBacklog: '/jobs',
  onlineAiAgents: '/ai-agents',
  failingConnectors: '/connectors',
} as const
