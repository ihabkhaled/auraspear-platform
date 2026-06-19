import { Injectable } from '@nestjs/common'
import { nowDate } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  TenantAgentConfigRecord,
  OsintSourceConfigRecord,
  AiApprovalRequestRecord,
} from './agent-config.types'
import type { Prisma } from '@prisma/client'

@Injectable()
export class AgentConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Agent Configs ──────────────────────────────────────────

  async findAllAgentConfigs(tenantId: string): Promise<TenantAgentConfigRecord[]> {
    return this.prisma.tenantAgentConfig.findMany({
      where: { tenantId },
      orderBy: { agentId: 'asc' },
    })
  }

  async findAgentConfig(
    tenantId: string,
    agentId: string
  ): Promise<TenantAgentConfigRecord | null> {
    return this.prisma.tenantAgentConfig.findUnique({
      where: { tenantId_agentId: { tenantId, agentId } },
    })
  }

  async upsertAgentConfig(
    tenantId: string,
    agentId: string,
    data: Prisma.TenantAgentConfigUpdateInput
  ): Promise<TenantAgentConfigRecord> {
    return this.prisma.tenantAgentConfig.upsert({
      where: { tenantId_agentId: { tenantId, agentId } },
      update: data,
      create: {
        tenant: { connect: { id: tenantId } },
        agentId,
        isEnabled: true,
        ...data,
      } as Prisma.TenantAgentConfigCreateInput,
    })
  }

  async resetTokenCounters(
    tenantId: string,
    agentId: string,
    updateData: Prisma.TenantAgentConfigUpdateInput
  ): Promise<TenantAgentConfigRecord> {
    return this.prisma.tenantAgentConfig.update({
      where: { tenantId_agentId: { tenantId, agentId } },
      data: updateData,
    })
  }

  async incrementTokenUsage(
    tenantId: string,
    agentId: string,
    tokens: number
  ): Promise<TenantAgentConfigRecord> {
    return this.prisma.tenantAgentConfig.upsert({
      where: { tenantId_agentId: { tenantId, agentId } },
      update: {
        tokensUsedHour: { increment: tokens },
        tokensUsedDay: { increment: tokens },
        tokensUsedMonth: { increment: tokens },
      },
      create: {
        tenant: { connect: { id: tenantId } },
        agentId,
        isEnabled: true,
        tokensUsedHour: tokens,
        tokensUsedDay: tokens,
        tokensUsedMonth: tokens,
      },
    })
  }

  // ─── OSINT Sources ─────────────────────────────────────────

  async findAllOsintSources(tenantId: string): Promise<OsintSourceConfigRecord[]> {
    return this.prisma.osintSourceConfig.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async findOsintSource(id: string, tenantId: string): Promise<OsintSourceConfigRecord | null> {
    return this.prisma.osintSourceConfig.findFirst({
      where: { id, tenantId },
    })
  }

  async createOsintSource(
    data: Prisma.OsintSourceConfigCreateInput
  ): Promise<OsintSourceConfigRecord> {
    return this.prisma.osintSourceConfig.create({ data })
  }

  async updateOsintSource(
    id: string,
    tenantId: string,
    data: Prisma.OsintSourceConfigUpdateInput
  ): Promise<OsintSourceConfigRecord> {
    await this.prisma.osintSourceConfig.updateMany({
      where: { id, tenantId },
      data: data as Prisma.OsintSourceConfigUncheckedUpdateManyInput,
    })

    const updated = await this.prisma.osintSourceConfig.findFirst({
      where: { id, tenantId },
    })

    return updated as OsintSourceConfigRecord
  }

  async updateOsintSourceHealth(
    id: string,
    tenantId: string,
    ok: boolean,
    error: string | null
  ): Promise<void> {
    await this.prisma.osintSourceConfig.updateMany({
      where: { id, tenantId },
      data: { lastTestAt: nowDate(), lastTestOk: ok, lastError: error },
    })
  }

  async findOsintSourceByTypeAndName(
    tenantId: string,
    sourceType: string,
    name: string
  ): Promise<OsintSourceConfigRecord | null> {
    return this.prisma.osintSourceConfig.findFirst({
      where: { tenantId, sourceType, name },
    })
  }

  async deleteOsintSource(id: string, tenantId: string): Promise<void> {
    await this.prisma.osintSourceConfig.deleteMany({
      where: { id, tenantId },
    })
  }

  // ─── Approval Requests ─────────────────────────────────────

  async findAllApprovals(tenantId: string, status?: string): Promise<AiApprovalRequestRecord[]> {
    const where: Prisma.AiApprovalRequestWhereInput = { tenantId }

    if (status) {
      where.status = status
    }

    return this.prisma.aiApprovalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findApproval(id: string, tenantId: string): Promise<AiApprovalRequestRecord | null> {
    return this.prisma.aiApprovalRequest.findFirst({
      where: { id, tenantId },
    })
  }

  async createApproval(
    data: Prisma.AiApprovalRequestCreateInput
  ): Promise<AiApprovalRequestRecord> {
    return this.prisma.aiApprovalRequest.create({ data })
  }

  async updateApprovalStatus(
    id: string,
    tenantId: string,
    data: Prisma.AiApprovalRequestUpdateInput
  ): Promise<AiApprovalRequestRecord> {
    await this.prisma.aiApprovalRequest.updateMany({
      where: { id, tenantId },
      data: data as Prisma.AiApprovalRequestUncheckedUpdateManyInput,
    })

    const updated = await this.prisma.aiApprovalRequest.findFirst({
      where: { id, tenantId },
    })

    return updated as AiApprovalRequestRecord
  }

  async bulkToggleAgents(tenantId: string, enabled: boolean): Promise<Prisma.BatchPayload> {
    return this.prisma.tenantAgentConfig.updateMany({
      where: { tenantId },
      data: { isEnabled: enabled },
    })
  }

  async bulkToggleOsintSources(tenantId: string, enabled: boolean): Promise<Prisma.BatchPayload> {
    return this.prisma.osintSourceConfig.updateMany({
      where: { tenantId },
      data: { isEnabled: enabled },
    })
  }
}
