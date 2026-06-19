import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { ConnectorConfig, Prisma } from '@prisma/client'

@Injectable()
export class ConnectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTenant(tenantId: string): Promise<ConnectorConfig[]> {
    return this.prisma.connectorConfig.findMany({
      where: { tenantId },
      orderBy: { type: 'asc' },
    })
  }

  async findByTenantAndType(tenantId: string, type: string): Promise<ConnectorConfig | null> {
    return this.prisma.connectorConfig.findUnique({
      where: { tenantId_type: { tenantId, type: type as never } },
    })
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<ConnectorConfig | null> {
    return this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    })
  }

  async findEnabledStatus(tenantId: string, type: string): Promise<{ enabled: boolean } | null> {
    return this.prisma.connectorConfig.findUnique({
      where: { tenantId_type: { tenantId, type: type as never } },
      select: { enabled: true },
    })
  }

  async findEnabledByTenant(tenantId: string): Promise<Array<{ type: string; name: string }>> {
    return this.prisma.connectorConfig.findMany({
      where: { tenantId, enabled: true },
      select: { type: true, name: true },
      orderBy: { type: 'asc' },
    })
  }

  async create(data: Prisma.ConnectorConfigUncheckedCreateInput): Promise<ConnectorConfig> {
    return this.prisma.connectorConfig.create({ data })
  }

  async updateByTenantAndType(
    tenantId: string,
    type: string,
    data: Prisma.ConnectorConfigUpdateInput
  ): Promise<ConnectorConfig> {
    return this.prisma.connectorConfig.update({
      where: { tenantId_type: { tenantId, type: type as never } },
      data,
    })
  }

  async updateById(id: string, data: Prisma.ConnectorConfigUpdateInput): Promise<ConnectorConfig> {
    return this.prisma.connectorConfig.update({
      where: { id },
      data,
    })
  }

  async deleteByTenantAndType(tenantId: string, type: string): Promise<ConnectorConfig> {
    return this.prisma.connectorConfig.delete({
      where: { tenantId_type: { tenantId, type: type as never } },
    })
  }
}
