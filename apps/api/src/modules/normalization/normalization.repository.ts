import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { Prisma, NormalizationPipeline } from '@prisma/client'

@Injectable()
export class NormalizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyPipelines(params: {
    where: Prisma.NormalizationPipelineWhereInput
    skip: number
    take: number
    orderBy: Prisma.NormalizationPipelineOrderByWithRelationInput
  }): Promise<NormalizationPipeline[]> {
    return this.prisma.normalizationPipeline.findMany(params)
  }

  async countPipelines(where: Prisma.NormalizationPipelineWhereInput): Promise<number> {
    return this.prisma.normalizationPipeline.count({ where })
  }

  async findFirstPipelineByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<NormalizationPipeline | null> {
    return this.prisma.normalizationPipeline.findFirst({
      where: { id, tenantId },
    })
  }

  async createPipeline(
    data: Prisma.NormalizationPipelineUncheckedCreateInput
  ): Promise<NormalizationPipeline> {
    return this.prisma.normalizationPipeline.create({ data })
  }

  async updateManyPipelinesByIdAndTenant(
    id: string,
    tenantId: string,
    data: Prisma.NormalizationPipelineUpdateManyMutationInput
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.normalizationPipeline.updateMany({
      where: { id, tenantId },
      data,
    })
  }

  async deleteManyPipelinesByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.normalizationPipeline.deleteMany({
      where: { id, tenantId },
    })
  }

  async countPipelinesByStatus(
    tenantId: string,
    status: NormalizationPipeline['status']
  ): Promise<number> {
    return this.prisma.normalizationPipeline.count({
      where: { tenantId, status },
    })
  }

  async aggregatePipelinesSums(tenantId: string): Promise<{
    _sum: { processedCount: bigint | null; errorCount: number | null }
  }> {
    return this.prisma.normalizationPipeline.aggregate({
      where: { tenantId },
      _sum: { processedCount: true, errorCount: true },
    })
  }
}
