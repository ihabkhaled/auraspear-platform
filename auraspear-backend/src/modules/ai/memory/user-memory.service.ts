import { Injectable, Logger } from '@nestjs/common'
import { EmbeddingService } from './embedding.service'
import { getUserMemoryDelegate } from './memory.types'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { PrismaService } from '../../../prisma/prisma.service'
import type { MemoryStatsResponse, RetentionPolicyRecord, UserMemoryRecord } from './memory.types'

@Injectable()
export class UserMemoryService {
  private readonly logger = new Logger(UserMemoryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async listMemories(
    tenantId: string,
    userId: string,
    options?: { category?: string; search?: string; limit?: number; offset?: number }
  ): Promise<{ data: UserMemoryRecord[]; total: number }> {
    const where: Record<string, unknown> = { tenantId, userId, isDeleted: false }

    if (options?.category) {
      where['category'] = options.category
    }
    if (options?.search) {
      where['content'] = { contains: options.search, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      getUserMemoryDelegate(this.prisma).findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      getUserMemoryDelegate(this.prisma).count({ where }),
    ])

    return { data, total }
  }

  async createMemory(
    tenantId: string,
    userId: string,
    input: { content: string; category?: string }
  ): Promise<UserMemoryRecord> {
    const embedding = await this.safeGenerateEmbedding(tenantId, input.content)

    return getUserMemoryDelegate(this.prisma).create({
      data: {
        tenantId,
        userId,
        content: input.content,
        category: input.category ?? 'fact',
        embedding,
        sourceType: 'user_edit',
      },
    })
  }

  async updateMemory(
    tenantId: string,
    userId: string,
    memoryId: string,
    input: { content: string; category?: string }
  ): Promise<UserMemoryRecord> {
    const memory = await this.verifyOwnership(tenantId, userId, memoryId)

    const embedding =
      input.content === memory.content
        ? memory.embedding
        : await this.safeGenerateEmbedding(tenantId, input.content)

    return getUserMemoryDelegate(this.prisma).update({
      where: { id: memoryId },
      data: {
        content: input.content,
        category: input.category ?? memory.category,
        embedding,
        sourceType: 'user_edit',
      },
    })
  }

  async deleteMemory(tenantId: string, userId: string, memoryId: string): Promise<void> {
    await this.verifyOwnership(tenantId, userId, memoryId)

    await getUserMemoryDelegate(this.prisma).update({
      where: { id: memoryId },
      data: { isDeleted: true },
    })

    this.logger.log(`Memory ${memoryId} soft-deleted by user ${userId}`)
  }

  async deleteAllMemories(tenantId: string, userId: string): Promise<number> {
    const result = await getUserMemoryDelegate(this.prisma).updateMany({
      where: { tenantId, userId, isDeleted: false },
      data: { isDeleted: true },
    })

    this.logger.log(`All memories (${String(result.count)}) soft-deleted for user ${userId}`)
    return result.count
  }

  /* ── Governance: admin list (cross-user) ─────────────── */

  async listAllMemories(
    tenantId: string,
    options?: {
      userId?: string
      category?: string
      search?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ data: UserMemoryRecord[]; total: number }> {
    const where: Record<string, unknown> = { tenantId, isDeleted: false }

    if (options?.userId) {
      where['userId'] = options.userId
    }
    if (options?.category) {
      where['category'] = options.category
    }
    if (options?.search) {
      where['content'] = { contains: options.search, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      getUserMemoryDelegate(this.prisma).findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      getUserMemoryDelegate(this.prisma).count({ where }),
    ])

    return { data, total }
  }

  /* ── Governance: stats ─────────────────────────────── */

  async getMemoryStats(tenantId: string): Promise<MemoryStatsResponse> {
    const [totalActive, totalDeleted, byCategory, byUser] = await Promise.all([
      getUserMemoryDelegate(this.prisma).count({
        where: { tenantId, isDeleted: false },
      }),
      getUserMemoryDelegate(this.prisma).count({
        where: { tenantId, isDeleted: true },
      }),
      this.prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
        SELECT category, COUNT(*) as count
        FROM user_memories
        WHERE tenant_id = ${tenantId}::uuid AND is_deleted = false
        GROUP BY category
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<Array<{ user_id: string; count: bigint }>>`
        SELECT user_id, COUNT(*) as count
        FROM user_memories
        WHERE tenant_id = ${tenantId}::uuid AND is_deleted = false
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 20
      `,
    ])

    return {
      totalActive,
      totalDeleted,
      byCategory: byCategory.map(r => ({ category: r.category, count: Number(r.count) })),
      byUser: byUser.map(r => ({ userId: r.user_id, count: Number(r.count) })),
      uniqueUsers: byUser.length,
    }
  }

  /* ── Governance: export ────────────────────────────── */

  async exportMemories(
    tenantId: string,
    userId?: string
  ): Promise<UserMemoryRecord[]> {
    const where: Record<string, unknown> = { tenantId, isDeleted: false }
    if (userId) {
      where['userId'] = userId
    }

    return getUserMemoryDelegate(this.prisma).findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
  }

  /* ── Governance: retention policy ──────────────────── */

  async getRetentionPolicy(tenantId: string): Promise<RetentionPolicyRecord | null> {
    return this.prisma.memoryRetentionPolicy.findUnique({
      where: { tenantId },
    })
  }

  async upsertRetentionPolicy(
    tenantId: string,
    data: { retentionDays: number; autoCleanup: boolean },
    createdBy: string
  ): Promise<RetentionPolicyRecord> {
    return this.prisma.memoryRetentionPolicy.upsert({
      where: { tenantId },
      update: {
        retentionDays: data.retentionDays,
        autoCleanup: data.autoCleanup,
      },
      create: {
        tenantId,
        retentionDays: data.retentionDays,
        autoCleanup: data.autoCleanup,
        createdBy,
      },
    })
  }

  /* ── Governance: cleanup expired memories ──────────── */

  async cleanupExpiredMemories(tenantId: string): Promise<number> {
    const policy = await this.getRetentionPolicy(tenantId)
    if (!policy || policy.retentionDays <= 0 || !policy.autoCleanup) {
      return 0
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays)

    const result = await getUserMemoryDelegate(this.prisma).updateMany({
      where: {
        tenantId,
        isDeleted: false,
        updatedAt: { lt: cutoffDate },
      },
      data: { isDeleted: true },
    })

    if (result.count > 0) {
      await this.prisma.memoryRetentionPolicy.update({
        where: { tenantId },
        data: {
          lastCleanupAt: new Date(),
          lastCleanupCount: result.count,
        },
      })
      this.logger.log(`Retention cleanup: soft-deleted ${String(result.count)} memories for tenant ${tenantId}`)
    }

    return result.count
  }

  /* ── Governance: admin delete by user ──────────────── */

  async adminDeleteUserMemories(tenantId: string, userId: string): Promise<number> {
    const result = await getUserMemoryDelegate(this.prisma).updateMany({
      where: { tenantId, userId, isDeleted: false },
      data: { isDeleted: true },
    })
    this.logger.log(`Admin erased ${String(result.count)} memories for user ${userId} in tenant ${tenantId}`)
    return result.count
  }

  private async safeGenerateEmbedding(tenantId: string, text: string): Promise<number[]> {
    try {
      return await this.embeddingService.generateEmbedding(tenantId, text)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Embedding generation failed (saving without embedding): ${message}`)
      return []
    }
  }

  private async verifyOwnership(
    tenantId: string,
    userId: string,
    memoryId: string
  ): Promise<UserMemoryRecord> {
    const memory = await getUserMemoryDelegate(this.prisma).findUnique({
      where: { id: memoryId },
    })

    if (!memory || memory.isDeleted) {
      throw new BusinessException(404, 'Memory not found', 'errors.memory.notFound')
    }
    if (memory.tenantId !== tenantId || memory.userId !== userId) {
      throw new BusinessException(403, 'Access denied', 'errors.memory.accessDenied')
    }

    return memory
  }
}
