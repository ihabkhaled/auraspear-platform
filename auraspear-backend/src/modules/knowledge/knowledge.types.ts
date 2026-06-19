import type { Runbook } from '@prisma/client'

export type RunbookResponse = Runbook

export interface CreateRunbookInput {
  tenantId: string
  title: string
  content: string
  category: string
  tags: string[]
  createdBy: string
}

export interface UpdateRunbookInput {
  title?: string
  content?: string
  category?: string
  tags?: string[]
  updatedBy: string
}

export interface RunbookSearchParameters {
  q?: string
  category?: string
  page: number
  limit: number
  sortBy?: string
  sortOrder?: string
}
