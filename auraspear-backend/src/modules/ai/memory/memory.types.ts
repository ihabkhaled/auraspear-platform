/**
 * UserMemory interface — mirrors the Prisma UserMemory model.
 * Used as a type-safe bridge until `prisma generate` runs to update the client.
 * After regeneration, prefer importing directly from `@prisma/client`.
 */
export interface UserMemoryRecord {
  id: string
  tenantId: string
  userId: string
  content: string
  category: string
  embedding: number[]
  sourceType: string
  sourceId: string | null
  sourceLabel: string | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Prisma delegate type for userMemory operations.
 * Used to type-assert PrismaService until the client is regenerated.
 */
export interface UserMemoryDelegate {
  findMany: (args: Record<string, unknown>) => Promise<UserMemoryRecord[]>
  findUnique: (args: Record<string, unknown>) => Promise<UserMemoryRecord | null>
  create: (args: Record<string, unknown>) => Promise<UserMemoryRecord>
  update: (args: Record<string, unknown>) => Promise<UserMemoryRecord>
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>
  count: (args: Record<string, unknown>) => Promise<number>
}

export interface ExtractedMemory {
  content: string
  category: string
  action: 'create' | 'update' | 'delete'
  existingMemoryId?: string
}

export interface RetrievedMemory {
  id: string
  content: string
  category: string
  similarity: number
}

/**
 * Helper to access the userMemory delegate from PrismaService.
 * Needed because `prisma generate` hasn't run yet to add the model.
 * Remove this after regeneration and use `prisma.userMemory` directly.
 */
export function getUserMemoryDelegate(prisma: unknown): UserMemoryDelegate {
  return (prisma as Record<string, unknown>)['userMemory'] as UserMemoryDelegate
}

/* ── Governance types ────────────────────────────────── */

export interface MemoryStatsResponse {
  totalActive: number
  totalDeleted: number
  byCategory: Array<{ category: string; count: number }>
  byUser: Array<{ userId: string; count: number }>
  uniqueUsers: number
}

export interface RetentionPolicyRecord {
  id: string
  tenantId: string
  retentionDays: number
  autoCleanup: boolean
  lastCleanupAt: Date | null
  lastCleanupCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
