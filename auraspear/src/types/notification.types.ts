import type { SortOrder } from '@/enums'

export interface TranslatableMessage {
  key: string
  params?: Record<string, string>
}

export interface NotificationItem {
  id: string
  type: string
  actorName: string
  actorEmail: string
  title: string
  message: string
  entityType: string
  entityId: string
  caseId: string | null
  caseCommentId: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationSearchParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: SortOrder
  query?: string
  type?: string
  isRead?: string
}

export interface UnreadCountResponse {
  count: number
}

export interface NotificationColumnTranslations {
  notifications: (key: string) => string
  common: (key: string) => string
  resolveMessage: (message: string) => string
  locale: string
}

export interface NotificationFiltersProps {
  searchQuery: string
  typeFilter: string
  readFilter: string
  onSearchChange: (value: string) => void
  onTypeChange: (value: string) => void
  onReadChange: (value: string) => void
  onClearAll: () => void
  t: (key: string) => string
}

export interface AiNotificationDigestProps {
  isLoading: boolean
  digestResult: AiNotificationDigestResult | null
  onGenerateDigest: () => void
  tCommon: (key: string) => string
  t: (key: string) => string
}

export interface AiNotificationDigestResult {
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
