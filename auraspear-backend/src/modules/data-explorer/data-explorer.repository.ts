import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  ConnectorSyncJob,
  ConnectorType,
  GrafanaDashboard,
  LogstashPipelineLog,
  Prisma,
  ShuffleWorkflow,
  SyncJobStatus,
  VelociraptorEndpoint,
  VelociraptorHunt,
} from '@prisma/client'

@Injectable()
export class DataExplorerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* Connector config */

  async findConnectorConfigs(tenantId: string): Promise<
    Array<{
      type: ConnectorType
      enabled: boolean
      lastTestOk: boolean | null
      lastSyncAt: Date | null
    }>
  > {
    return this.prisma.connectorConfig.findMany({
      where: { tenantId },
      select: {
        type: true,
        enabled: true,
        lastTestOk: true,
        lastSyncAt: true,
      },
      orderBy: { type: 'asc' },
    })
  }

  /* Sync jobs */

  async groupBySyncJobStatus(
    tenantId: string
  ): Promise<Array<{ status: SyncJobStatus; connectorType: ConnectorType; _count: number }>> {
    const results = await this.prisma.connectorSyncJob.groupBy({
      by: ['status', 'connectorType'],
      where: { tenantId },
      _count: true,
    })
    return results
  }

  async createSyncJob(
    data: Prisma.ConnectorSyncJobUncheckedCreateInput
  ): Promise<ConnectorSyncJob> {
    return this.prisma.connectorSyncJob.create({ data })
  }

  async findSyncJobById(id: string): Promise<ConnectorSyncJob | null> {
    return this.prisma.connectorSyncJob.findUnique({ where: { id } })
  }

  async updateSyncJob(
    id: string,
    tenantId: string,
    data: Prisma.ConnectorSyncJobUpdateManyMutationInput
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.connectorSyncJob.updateMany({
      where: { id, tenantId },
      data,
    })
  }

  async findManySyncJobs(params: {
    where: Record<string, unknown>
    orderBy: Record<string, string>
    skip: number
    take: number
  }): Promise<ConnectorSyncJob[]> {
    return this.prisma.connectorSyncJob.findMany(params)
  }

  async countSyncJobs(where: Record<string, unknown>): Promise<number> {
    return this.prisma.connectorSyncJob.count({ where })
  }

  /* Grafana */

  async findManyGrafanaDashboards(params: {
    where: Record<string, unknown>
    orderBy: Record<string, string>
    skip: number
    take: number
  }): Promise<GrafanaDashboard[]> {
    return this.prisma.grafanaDashboard.findMany(params)
  }

  async countGrafanaDashboards(where: Record<string, unknown>): Promise<number> {
    return this.prisma.grafanaDashboard.count({ where })
  }

  async upsertGrafanaDashboard(
    params: Prisma.GrafanaDashboardUpsertArgs
  ): Promise<GrafanaDashboard> {
    return this.prisma.grafanaDashboard.upsert(params)
  }

  /* Velociraptor */

  async findManyVelociraptorEndpoints(params: {
    where: Record<string, unknown>
    orderBy: Record<string, string>
    skip: number
    take: number
  }): Promise<VelociraptorEndpoint[]> {
    return this.prisma.velociraptorEndpoint.findMany(params)
  }

  async countVelociraptorEndpoints(where: Record<string, unknown>): Promise<number> {
    return this.prisma.velociraptorEndpoint.count({ where })
  }

  async upsertVelociraptorEndpoint(
    params: Prisma.VelociraptorEndpointUpsertArgs
  ): Promise<VelociraptorEndpoint> {
    return this.prisma.velociraptorEndpoint.upsert(params)
  }

  async findManyVelociraptorHunts(params: {
    where: Record<string, unknown>
    orderBy: Record<string, string>
    skip: number
    take: number
  }): Promise<VelociraptorHunt[]> {
    return this.prisma.velociraptorHunt.findMany(params)
  }

  async countVelociraptorHunts(where: Record<string, unknown>): Promise<number> {
    return this.prisma.velociraptorHunt.count({ where })
  }

  async upsertVelociraptorHunt(
    params: Prisma.VelociraptorHuntUpsertArgs
  ): Promise<VelociraptorHunt> {
    return this.prisma.velociraptorHunt.upsert(params)
  }

  /* Logstash */

  async findManyLogstashLogs(params: {
    where: Record<string, unknown>
    orderBy: Record<string, string>
    skip: number
    take: number
  }): Promise<LogstashPipelineLog[]> {
    return this.prisma.logstashPipelineLog.findMany(params)
  }

  async countLogstashLogs(where: Record<string, unknown>): Promise<number> {
    return this.prisma.logstashPipelineLog.count({ where })
  }

  async createLogstashLog(
    data: Prisma.LogstashPipelineLogUncheckedCreateInput
  ): Promise<LogstashPipelineLog> {
    return this.prisma.logstashPipelineLog.create({ data })
  }

  /* Shuffle */

  async findManyShuffleWorkflows(params: {
    where: Record<string, unknown>
    orderBy: Record<string, string>
    skip: number
    take: number
  }): Promise<ShuffleWorkflow[]> {
    return this.prisma.shuffleWorkflow.findMany(params)
  }

  async countShuffleWorkflows(where: Record<string, unknown>): Promise<number> {
    return this.prisma.shuffleWorkflow.count({ where })
  }

  async upsertShuffleWorkflow(params: Prisma.ShuffleWorkflowUpsertArgs): Promise<ShuffleWorkflow> {
    return this.prisma.shuffleWorkflow.upsert(params)
  }
}
