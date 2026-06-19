import type { HuntStatus, MessageRole, ReasoningStepStatus } from '@/enums'

export interface ReasoningStep {
  id: string
  label: string
  status: ReasoningStepStatus
}

export interface HuntMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  reasoningSteps?: ReasoningStep[]
  actions?: string[]
}

export interface HuntSession {
  id: string
  status: HuntStatus
  createdAt: string
  query: string
  timeRange: string
  startedBy: string
  messages: HuntMessage[]
  eventsFound: number
  uniqueIps: number
  threatScore: number
  mitreTactics: string[]
  mitreTechniques: string[]
  aiAnalysis: string | null
  reasoning: string[]
  executedQuery: Record<string, unknown> | null
}

export interface HuntEvent {
  id: string
  timestamp: string
  severity: string
  eventId: string
  sourceIp: string | null
  user: string | null
  description: string
}

export interface HuntEventTableProps {
  events: HuntEvent[]
  loading?: boolean
  page?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
}

export interface ReasoningStepsProps {
  steps: ReasoningStep[]
}

export interface HuntStatusBarProps {
  sessionId: string
  status: HuntStatus
}

export interface HuntStatsGridProps {
  eventsFound: number
  uniqueIps: number
  threatScore: number
}

export interface ChatMessageProps {
  message: HuntMessage
}

export interface HuntResultsPanelProps {
  sessionId: string
  status: HuntStatus
  eventsFound: number
  uniqueIps: number
  threatScore: number
  events: HuntEvent[]
  loading?: boolean
  page?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
}

export interface HuntChatPanelProps {
  messages: HuntMessage[]
  onSend?: ((message: string) => void) | undefined
  disabled?: boolean | undefined
  hasSession?: boolean | undefined
  onNewHunt?: (() => void) | undefined
}

export interface HuntInputAreaProps {
  onSend?: ((message: string) => void) | undefined
  disabled?: boolean | undefined
}

export interface UseHuntInputAreaParams {
  onSend?: ((message: string) => void) | undefined
}
