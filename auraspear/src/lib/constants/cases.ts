import { Globe, Hash, Link2, Server } from 'lucide-react'
import { CaseArtifactType, CaseSeverity, CaseStatus, CaseTimelineEntryType } from '@/enums'

export const CASE_STATUS_LABEL_KEYS: Record<CaseStatus, string> = {
  [CaseStatus.OPEN]: 'statusOpen',
  [CaseStatus.IN_PROGRESS]: 'statusInProgress',
  [CaseStatus.CLOSED]: 'statusClosed',
}

export const CASE_SEVERITY_BORDER_COLORS: Record<CaseSeverity, string> = {
  [CaseSeverity.CRITICAL]: 'var(--severity-critical)',
  [CaseSeverity.HIGH]: 'var(--severity-high)',
  [CaseSeverity.MEDIUM]: 'var(--severity-medium)',
  [CaseSeverity.LOW]: 'var(--severity-low)',
}

export const KANBAN_COLUMN_CONFIG = [
  {
    status: CaseStatus.OPEN,
    labelKey: 'statusOpen',
    dotClass: 'bg-status-info',
    animate: false,
  },
  {
    status: CaseStatus.IN_PROGRESS,
    labelKey: 'statusInProgress',
    dotClass: 'bg-primary',
    animate: true,
  },
  {
    status: CaseStatus.CLOSED,
    labelKey: 'statusClosed',
    dotClass: 'bg-status-success',
    animate: false,
  },
] as const

export const CASE_SEVERITY_FILTERS = [
  CaseSeverity.CRITICAL,
  CaseSeverity.HIGH,
  CaseSeverity.MEDIUM,
  CaseSeverity.LOW,
] as const

export const COMMENT_MAX_LENGTH = 10000
export const COMMENT_COLLAPSE_HEIGHT_PX = 120
export const COMMENT_MENTIONS_MAX = 20
export const COMMENTS_PAGE_SIZE = 10

export const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
] as const

export const UNASSIGNED_VALUE = '__unassigned__'
export const NO_CYCLE_VALUE = '__no_cycle__'

export const TIMELINE_TYPE_COLORS: Record<CaseTimelineEntryType, string> = {
  [CaseTimelineEntryType.NOTE]: 'var(--status-info)',
  [CaseTimelineEntryType.ALERT]: 'var(--status-warning)',
  [CaseTimelineEntryType.STATUS]: 'var(--status-success)',
  [CaseTimelineEntryType.ACTION]: 'var(--chart-5, hsl(270 60% 60%))',
}

export const ARTIFACT_TYPE_ICONS: Record<CaseArtifactType, typeof Globe> = {
  [CaseArtifactType.IP]: Server,
  [CaseArtifactType.HASH]: Hash,
  [CaseArtifactType.DOMAIN]: Globe,
  [CaseArtifactType.URL]: Link2,
}

export const ARTIFACT_TYPE_KEYS: Record<CaseArtifactType, string> = {
  [CaseArtifactType.IP]: 'artifactIps',
  [CaseArtifactType.HASH]: 'artifactHashes',
  [CaseArtifactType.DOMAIN]: 'artifactDomains',
  [CaseArtifactType.URL]: 'artifactUrls',
}

export const VALID_CASE_STATUSES = Object.values(CaseStatus) as string[]
