import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { LlmConnector, Prisma } from '@prisma/client'

@Injectable()
export class LlmConnectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTenant(tenantId: string): Promise<LlmConnector[]> {
    return this.prisma.llmConnector.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<LlmConnector | null> {
    return this.prisma.llmConnector.findFirst({
      where: { id, tenantId },
    })
  }

  async findByNameAndTenant(name: string, tenantId: string): Promise<LlmConnector | null> {
    return this.prisma.llmConnector.findUnique({
      where: { tenantId_name: { tenantId, name } },
    })
  }

  async findEnabledByTenant(tenantId: string): Promise<LlmConnector[]> {
    return this.prisma.llmConnector.findMany({
      where: { tenantId, enabled: true },
      orderBy: { name: 'asc' },
    })
  }

  async create(data: Prisma.LlmConnectorUncheckedCreateInput): Promise<LlmConnector> {
    return this.prisma.llmConnector.create({ data })
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.LlmConnectorUpdateInput
  ): Promise<LlmConnector> {
    return this.prisma.llmConnector.updateMany({
      where: { id, tenantId },
      data,
    }) as unknown as Promise<LlmConnector>
  }

  async updateAndReturn(
    id: string,
    tenantId: string,
    data: Prisma.LlmConnectorUpdateInput
  ): Promise<LlmConnector | null> {
    // Use a transaction to ensure tenant scoping + return updated record
    const [, updated] = await this.prisma.$transaction([
      this.prisma.llmConnector.updateMany({
        where: { id, tenantId },
        data,
      }),
      this.prisma.llmConnector.findFirst({
        where: { id, tenantId },
      }),
    ])
    return updated
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.llmConnector.deleteMany({
      where: { id, tenantId },
    })
  }

  async updateTestResult(
    id: string,
    tenantId: string,
    data: { lastTestAt: Date; lastTestOk: boolean; lastError: string | null }
  ): Promise<void> {
    await this.prisma.llmConnector.updateMany({
      where: { id, tenantId },
      data,
    })
  }
}
