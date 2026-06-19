import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiFeatureConfig, Prisma } from '@prisma/client'

@Injectable()
export class FeatureCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndFeature(
    tenantId: string,
    featureKey: string
  ): Promise<AiFeatureConfig | null> {
    return this.prisma.aiFeatureConfig.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    })
  }

  async findAllByTenant(tenantId: string): Promise<AiFeatureConfig[]> {
    return this.prisma.aiFeatureConfig.findMany({
      where: { tenantId },
      orderBy: { featureKey: 'asc' },
    })
  }

  async upsert(
    tenantId: string,
    featureKey: string,
    data: Omit<Prisma.AiFeatureConfigUncheckedCreateInput, 'tenantId' | 'featureKey'>
  ): Promise<AiFeatureConfig> {
    return this.prisma.aiFeatureConfig.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: { tenantId, featureKey, ...data },
      update: data,
    })
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.aiFeatureConfig.deleteMany({
      where: { id, tenantId },
    })
  }

  async bulkToggle(
    tenantId: string,
    enabled: boolean,
    allFeatureKeys: string[]
  ): Promise<{ count: number }> {
    const operations = allFeatureKeys.map(featureKey =>
      this.prisma.aiFeatureConfig.upsert({
        where: { tenantId_featureKey: { tenantId, featureKey } },
        create: { tenantId, featureKey, enabled },
        update: { enabled },
      })
    )
    const results = await this.prisma.$transaction(operations)
    return { count: results.length }
  }
}
