import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiPromptTemplate, Prisma } from '@prisma/client'

@Injectable()
export class PromptRegistryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByTaskType(tenantId: string, taskType: string): Promise<AiPromptTemplate | null> {
    return this.prisma.aiPromptTemplate.findFirst({
      where: {
        tenantId,
        taskType,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    })
  }

  async findAllByTenant(tenantId: string): Promise<AiPromptTemplate[]> {
    return this.prisma.aiPromptTemplate.findMany({
      where: { tenantId },
      orderBy: [{ taskType: 'asc' }, { version: 'desc' }],
    })
  }

  async findById(id: string, tenantId: string): Promise<AiPromptTemplate | null> {
    return this.prisma.aiPromptTemplate.findFirst({
      where: { id, tenantId },
    })
  }

  async getMaxVersion(tenantId: string, taskType: string): Promise<number> {
    const result = await this.prisma.aiPromptTemplate.aggregate({
      where: { tenantId, taskType },
      _max: { version: true },
    })
    return result._max.version ?? 0
  }

  async create(data: Prisma.AiPromptTemplateUncheckedCreateInput): Promise<AiPromptTemplate> {
    return this.prisma.aiPromptTemplate.create({ data })
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.AiPromptTemplateUncheckedUpdateInput
  ): Promise<AiPromptTemplate> {
    return this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { ...data, tenantId },
    })
  }

  async deactivate(id: string, tenantId: string): Promise<AiPromptTemplate> {
    return this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { isActive: false, tenantId },
    })
  }

  async activate(id: string, tenantId: string): Promise<AiPromptTemplate> {
    return this.prisma.aiPromptTemplate.update({
      where: { id },
      data: { isActive: true, tenantId },
    })
  }

  async deactivateAllByTaskType(tenantId: string, taskType: string): Promise<void> {
    await this.prisma.aiPromptTemplate.updateMany({
      where: { tenantId, taskType, isActive: true },
      data: { isActive: false },
    })
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.aiPromptTemplate.deleteMany({
      where: { id, tenantId },
    })
  }
}
