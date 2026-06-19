import { Injectable, Logger } from '@nestjs/common'
import { CaseSeverity, CaseStatus, IncidentCategory, IncidentSeverity, IncidentStatus } from '@prisma/client'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { buildNextSequenceNumber } from '../../../common/utils/sequence-number.utility'
import { getYear } from '../../../common/utils/date-time.utility'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiExecutionFinding, AiFindingOutputLink } from '@prisma/client'

export interface PromoteInput {
  tenantId: string
  findingId: string
  targetModule: string
  actorUserId: string
  actorEmail: string
  title?: string
  description?: string
}

export interface PromoteResult {
  finding: AiExecutionFinding
  link: AiFindingOutputLink
  createdEntityId: string
  targetModule: string
}

export interface HandoffHistoryItem {
  id: string
  findingId: string
  findingTitle: string
  findingType: string
  severity: string | null
  agentId: string | null
  sourceModule: string | null
  linkedModule: string
  linkedEntityType: string
  linkedEntityId: string
  createdAt: Date
}

export interface HandoffStats {
  totalPromotions: number
  byTarget: Array<{ linkedModule: string; count: number }>
  byAgent: Array<{ agentId: string; count: number }>
  last24h: number
}

@Injectable()
export class AiHandoffService {
  private readonly logger = new Logger(AiHandoffService.name)

  constructor(private readonly prisma: PrismaService) {}

  async promote(input: PromoteInput): Promise<PromoteResult> {
    const finding = await this.prisma.aiExecutionFinding.findFirst({
      where: { id: input.findingId, tenantId: input.tenantId },
    })

    if (!finding) {
      throw new BusinessException(404, 'Finding not found', 'errors.handoff.findingNotFound')
    }

    if (finding.status !== 'proposed') {
      throw new BusinessException(400, 'Only proposed findings can be promoted', 'errors.handoff.invalidStatus')
    }

    let createdEntityId: string
    let linkedEntityType: string

    if (input.targetModule === 'case') {
      const result = await this.prisma.$transaction(async (tx) => {
        const year = getYear()
        const prefix = `SOC-${String(year)}-`
        const latestCase = await tx.case.findFirst({
          where: { caseNumber: { startsWith: prefix } },
          orderBy: { caseNumber: 'desc' },
          select: { caseNumber: true },
        })
        const caseNumber = buildNextSequenceNumber(latestCase?.caseNumber, prefix, 3)

        return tx.case.create({
          data: {
            tenantId: input.tenantId,
            caseNumber,
            title: input.title ?? finding.title,
            description: input.description ?? finding.summary ?? '',
            severity: this.mapCaseSeverity(finding.severity),
            status: CaseStatus.open,
            ownerUserId: input.actorUserId,
            createdBy: input.actorEmail,
          },
        })
      })
      createdEntityId = result.id
      linkedEntityType = 'Case'
      this.logger.log(`Promoted finding ${finding.id} to Case ${result.id} (${result.caseNumber})`)
    } else if (input.targetModule === 'incident') {
      const result = await this.prisma.$transaction(async (tx) => {
        const year = getYear()
        const prefix = `INC-${String(year)}-`
        const latestIncident = await tx.incident.findFirst({
          where: { incidentNumber: { startsWith: prefix } },
          orderBy: { incidentNumber: 'desc' },
          select: { incidentNumber: true },
        })
        const incidentNumber = buildNextSequenceNumber(latestIncident?.incidentNumber, prefix, 3)

        return tx.incident.create({
          data: {
            tenantId: input.tenantId,
            incidentNumber,
            title: input.title ?? finding.title,
            description: input.description ?? finding.summary ?? '',
            severity: this.mapIncidentSeverity(finding.severity),
            status: IncidentStatus.open,
            category: IncidentCategory.other,
            createdBy: input.actorEmail,
          },
        })
      })
      createdEntityId = result.id
      linkedEntityType = 'Incident'
      this.logger.log(`Promoted finding ${finding.id} to Incident ${result.id} (${result.incidentNumber})`)
    } else {
      throw new BusinessException(400, `Unsupported target module: ${input.targetModule}`, 'errors.handoff.unsupportedTarget')
    }

    // Create the output link
    const link = await this.prisma.aiFindingOutputLink.create({
      data: {
        tenantId: input.tenantId,
        findingId: finding.id,
        linkedModule: input.targetModule,
        linkedEntityType,
        linkedEntityId: createdEntityId,
        relationshipType: 'promoted_by',
      },
    })

    // Update finding status to applied
    const updatedFinding = await this.prisma.aiExecutionFinding.update({
      where: { id: finding.id },
      data: { status: 'applied', appliedAt: new Date() },
    })

    return {
      finding: updatedFinding,
      link,
      createdEntityId,
      targetModule: input.targetModule,
    }
  }

  async getHistory(
    tenantId: string,
    options?: { limit?: number; offset?: number; targetModule?: string; agentId?: string }
  ): Promise<{ data: HandoffHistoryItem[]; total: number }> {
    const where: Record<string, unknown> = { tenantId }
    if (options?.targetModule) {
      where['linkedModule'] = options.targetModule
    }

    const findingWhere: Record<string, unknown> = {}
    if (options?.agentId) {
      findingWhere['agentId'] = options.agentId
    }

    const [links, total] = await Promise.all([
      this.prisma.aiFindingOutputLink.findMany({
        where: { ...where, finding: findingWhere },
        include: {
          finding: {
            select: { title: true, findingType: true, severity: true, agentId: true, sourceModule: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 25,
        skip: options?.offset ?? 0,
      }),
      this.prisma.aiFindingOutputLink.count({
        where: { ...where, finding: findingWhere },
      }),
    ])

    const data: HandoffHistoryItem[] = links.map(link => {
      const f = (link as Record<string, unknown>)['finding'] as
        | { title: string; findingType: string; severity: string | null; agentId: string | null; sourceModule: string | null }
        | undefined
      return {
        id: link.id,
        findingId: link.findingId,
        findingTitle: f?.title ?? '',
        findingType: f?.findingType ?? '',
        severity: f?.severity ?? null,
        agentId: f?.agentId ?? null,
        sourceModule: f?.sourceModule ?? null,
        linkedModule: link.linkedModule,
        linkedEntityType: link.linkedEntityType,
        linkedEntityId: link.linkedEntityId,
        createdAt: link.createdAt,
      }
    })

    return { data, total }
  }

  async getStats(tenantId: string): Promise<HandoffStats> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [totalPromotions, byTarget, byAgent, last24h] = await Promise.all([
      this.prisma.aiFindingOutputLink.count({ where: { tenantId } }),
      this.prisma.$queryRaw<Array<{ linked_module: string; count: bigint }>>`
        SELECT linked_module, COUNT(*) as count
        FROM ai_finding_output_links
        WHERE tenant_id = ${tenantId}::uuid
        GROUP BY linked_module
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<Array<{ agent_id: string; count: bigint }>>`
        SELECT f.agent_id, COUNT(*) as count
        FROM ai_finding_output_links l
        JOIN ai_execution_findings f ON l.finding_id = f.id
        WHERE l.tenant_id = ${tenantId}::uuid
        GROUP BY f.agent_id
        ORDER BY count DESC
        LIMIT 10
      `,
      this.prisma.aiFindingOutputLink.count({
        where: { tenantId, createdAt: { gte: dayAgo } },
      }),
    ])

    return {
      totalPromotions,
      byTarget: byTarget.map(r => ({ linkedModule: r.linked_module, count: Number(r.count) })),
      byAgent: byAgent.map(r => ({ agentId: r.agent_id, count: Number(r.count) })),
      last24h,
    }
  }

  async getFindingLinks(tenantId: string, findingId: string): Promise<AiFindingOutputLink[]> {
    return this.prisma.aiFindingOutputLink.findMany({
      where: { tenantId, findingId },
      orderBy: { createdAt: 'desc' },
    })
  }

  private mapCaseSeverity(severity: string | null): CaseSeverity {
    if (!severity) return CaseSeverity.medium
    const map: Record<string, CaseSeverity> = {
      critical: CaseSeverity.critical,
      high: CaseSeverity.high,
      medium: CaseSeverity.medium,
      low: CaseSeverity.low,
      info: CaseSeverity.low,
    }
    return map[severity] ?? CaseSeverity.medium
  }

  private mapIncidentSeverity(severity: string | null): IncidentSeverity {
    if (!severity) return IncidentSeverity.medium
    const map: Record<string, IncidentSeverity> = {
      critical: IncidentSeverity.critical,
      high: IncidentSeverity.high,
      medium: IncidentSeverity.medium,
      low: IncidentSeverity.low,
      info: IncidentSeverity.low,
    }
    return map[severity] ?? IncidentSeverity.medium
  }
}
