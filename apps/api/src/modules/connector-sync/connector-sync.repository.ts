import { Injectable } from '@nestjs/common'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { Alert, ConnectorType, Prisma } from '@prisma/client'

@Injectable()
export class ConnectorSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSyncableConnectors(params: {
    enabled: boolean
    syncEnabled: boolean
    types: ConnectorType[]
  }): Promise<Array<{ tenantId: string; type: ConnectorType; lastSyncAt: Date | null }>> {
    return this.prisma.connectorConfig.findMany({
      where: {
        enabled: params.enabled,
        syncEnabled: params.syncEnabled,
        type: { in: params.types },
      },
      select: {
        tenantId: true,
        type: true,
        lastSyncAt: true,
      },
    })
  }

  async updateConnectorSyncTimestamp(
    tenantId: string,
    type: ConnectorType
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.connectorConfig.updateMany({
      where: { tenantId, type },
      data: { lastSyncAt: nowDate() },
    })
  }

  async upsertAlert(params: {
    where: { tenantId_externalId: { tenantId: string; externalId: string } }
    create: Prisma.AlertUncheckedCreateInput
    update: Prisma.AlertUncheckedUpdateInput
  }): Promise<Alert> {
    return this.prisma.alert.upsert(params)
  }
}
