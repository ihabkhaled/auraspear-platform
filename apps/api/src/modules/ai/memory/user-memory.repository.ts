import { Injectable } from '@nestjs/common'
import { getUserMemoryDelegate } from './memory.types'
import { PrismaService } from '../../../prisma/prisma.service'
import type {
  MemoryCategoryRow,
  MemoryUserRow,
  RetentionPolicyRecord,
  UserMemoryRecord,
} from './memory.types'

@Injectable()
export class UserMemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemories(
    where: Record<string, unknown>,
    limit: number,
    offset: number
  ): Promise<UserMemoryRecord[]> {
    return getUserMemoryDelegate(this.prisma).findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async countMemories(where: Record<string, unknown>): Promise<number> {
    return getUserMemoryDelegate(this.prisma).count({ where })
  }

  async createMemory(
    tenantId: string,
    data: {
      userId: string
      content: string
      category: string
      embedding: number[]
      sourceType: string
    }
  ): Promise<UserMemoryRecord> {
    return getUserMemoryDelegate(this.prisma).create({
      data: {
        tenantId,
        userId: data.userId,
        content: data.content,
        category: data.category,
        embedding: data.embedding,
        sourceType: data.sourceType,
      },
    })
  }

  async findMemoryById(id: string): Promise<UserMemoryRecord | null> {
    return getUserMemoryDelegate(this.prisma).findUnique({ where: { id } })
  }

  async updateMemory(
    id: string,
    data: {
      content: string
      category: string
      embedding: number[]
      sourceType: string
    }
  ): Promise<UserMemoryRecord> {
    return getUserMemoryDelegate(this.prisma).update({
      where: { id },
      data: {
        content: data.content,
        category: data.category,
        embedding: data.embedding,
        sourceType: data.sourceType,
      },
    })
  }

  async softDeleteMemory(id: string): Promise<UserMemoryRecord> {
    return getUserMemoryDelegate(this.prisma).update({
      where: { id },
      data: { isDeleted: true },
    })
  }

  async softDeleteManyMemories(where: Record<string, unknown>): Promise<{ count: number }> {
    return getUserMemoryDelegate(this.prisma).updateMany({
      where,
      data: { isDeleted: true },
    })
  }

  async countActiveMemories(tenantId: string): Promise<number> {
    return getUserMemoryDelegate(this.prisma).count({
      where: { tenantId, isDeleted: false },
    })
  }

  async countDeletedMemories(tenantId: string): Promise<number> {
    return getUserMemoryDelegate(this.prisma).count({
      where: { tenantId, isDeleted: true },
    })
  }

  async fetchStatsByCategory(tenantId: string): Promise<MemoryCategoryRow[]> {
    return this.prisma.$queryRaw<MemoryCategoryRow[]>`
      SELECT category, COUNT(*) as count
      FROM user_memories
      WHERE tenant_id = ${tenantId}::uuid AND is_deleted = false
      GROUP BY category
      ORDER BY count DESC
    `
  }

  async fetchStatsByUser(tenantId: string): Promise<MemoryUserRow[]> {
    return this.prisma.$queryRaw<MemoryUserRow[]>`
      SELECT user_id, COUNT(*) as count
      FROM user_memories
      WHERE tenant_id = ${tenantId}::uuid AND is_deleted = false
      GROUP BY user_id
      ORDER BY count DESC
      LIMIT 20
    `
  }

  async findManyForExport(where: Record<string, unknown>): Promise<UserMemoryRecord[]> {
    return getUserMemoryDelegate(this.prisma).findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
  }

  async findRetentionPolicy(tenantId: string): Promise<RetentionPolicyRecord | null> {
    return this.prisma.memoryRetentionPolicy.findUnique({ where: { tenantId } })
  }

  async upsertRetentionPolicy(
    tenantId: string,
    data: { retentionDays: number; autoCleanup: boolean; createdBy: string }
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
        createdBy: data.createdBy,
      },
    })
  }

  async updateRetentionPolicyCleanupTimestamp(
    tenantId: string,
    count: number
  ): Promise<RetentionPolicyRecord> {
    return this.prisma.memoryRetentionPolicy.update({
      where: { tenantId },
      data: {
        lastCleanupAt: new Date(),
        lastCleanupCount: count,
      },
    })
  }

  async softDeleteExpiredMemories(tenantId: string, cutoffDate: Date): Promise<{ count: number }> {
    return getUserMemoryDelegate(this.prisma).updateMany({
      where: {
        tenantId,
        isDeleted: false,
        updatedAt: { lt: cutoffDate },
      },
      data: { isDeleted: true },
    })
  }
}
