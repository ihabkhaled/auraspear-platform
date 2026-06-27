import { Injectable } from '@nestjs/common'
import { getUserMemoryDelegate } from './memory.types'
import { PrismaService } from '../../../prisma/prisma.service'
import type { RagCategoryRow } from './rag-observability.types'

@Injectable()
export class RagObservabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countActiveMemories(tenantId: string, userId: string): Promise<number> {
    return getUserMemoryDelegate(this.prisma).count({
      where: { tenantId, userId, isDeleted: false },
    })
  }

  async countAllActiveMemoriesByTenant(tenantId: string): Promise<number> {
    return getUserMemoryDelegate(this.prisma).count({
      where: { tenantId, isDeleted: false },
    })
  }

  async fetchCategoryBreakdown(tenantId: string): Promise<RagCategoryRow[]> {
    return this.prisma.$queryRaw<RagCategoryRow[]>`
      SELECT category, COUNT(*) as count
      FROM user_memories WHERE tenant_id = ${tenantId}::uuid AND is_deleted = false
      GROUP BY category ORDER BY count DESC
    `
  }
}
