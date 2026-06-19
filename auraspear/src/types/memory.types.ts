export interface UserMemory {
  id: string
  tenantId: string
  userId: string
  content: string
  category: string
  sourceType: string
  sourceId: string | null
  sourceLabel: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface UserMemoryListResponse {
  data: UserMemory[]
  total: number
}

export interface CreateMemoryInput {
  content: string
  category?: string
}

export interface UpdateMemoryInput {
  content: string
  category?: string
}

export interface MemorySettingsCardProps {
  t: (key: string) => string
}

/* ── Governance types ────────────────────────────────── */

export interface MemoryStats {
  totalActive: number
  totalDeleted: number
  byCategory: Array<{ category: string; count: number }>
  byUser: Array<{ userId: string; count: number }>
  uniqueUsers: number
}

export interface MemoryRetentionPolicy {
  id: string
  tenantId: string
  retentionDays: number
  autoCleanup: boolean
  lastCleanupAt: string | null
  lastCleanupCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}
