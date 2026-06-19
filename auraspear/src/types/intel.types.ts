import type { SortOrder } from '@/enums'

export interface MISPEvent {
  id: string
  mispEventId: string
  organization: string
  threatLevel: string
  info: string
  date: string
  tags: string[]
  attributeCount: number
  published: boolean
}

export interface MISPEventFeedProps {
  events: MISPEvent[]
  loading?: boolean
  onEventClick?: (event: MISPEvent) => void
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
}

export interface MISPTagPillProps {
  name: string
}

export interface IOCCorrelation {
  id: string
  iocValue: string
  iocType: string
  source: string
  hitCount: number
  firstSeen?: string
  lastSeen: string
  tags?: string[]
  severity: string
}

export interface WazuhCorrelationPanelProps {
  correlations: IOCCorrelation[]
  loading?: boolean
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
}

export interface IOCSearchBarProps {
  onSearch: (query: string, type: string, source: string) => void
  loading?: boolean
}

export interface UseIocSearchBarParams {
  onSearch: (query: string, type: string, source: string) => void
}

export interface IntelStatsGridProps {
  stats: IntelStats
}

export interface IntelStats {
  threatActors: number
  ipIOCs: number
  fileHashes: number
  activeDomains: number
  threatActorsTrend?: number
  ipIOCsTrend?: number
  fileHashesTrend?: number
  activeDomainsTrend?: number
}

export interface MISPSearchParams {
  page?: number
  limit?: number
  query?: string
  threatLevel?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface AiIntelPanelProps {
  canEnrich: boolean
  activeTask: string | null
  isLoading: boolean
  enrichResult: AiIntelResult | null
  advisoryResult: AiIntelResult | null
  selectedIocId?: string | undefined
  selectedIocIds?: string[]
  onEnrichIoc: (iocId: string) => void
  onDraftAdvisory: (iocIds: string[]) => void
  tCommon: (key: string) => string
  t: (key: string) => string
}

export interface AiIntelResult {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  provider: string
  tokensUsed: {
    input: number
    output: number
  }
}
