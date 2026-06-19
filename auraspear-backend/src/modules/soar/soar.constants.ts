import type { Prisma } from '@prisma/client'

export const PLAYBOOK_WITH_TENANT_INCLUDE = {
  tenant: { select: { name: true } },
} as const satisfies Prisma.SoarPlaybookInclude

export const EXECUTION_WITH_PLAYBOOK_INCLUDE = {
  playbook: { select: { name: true, triggerType: true } },
} as const satisfies Prisma.SoarExecutionInclude

export const PLAYBOOK_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
  status: 'status',
  triggerType: 'triggerType',
  executionCount: 'executionCount',
}
