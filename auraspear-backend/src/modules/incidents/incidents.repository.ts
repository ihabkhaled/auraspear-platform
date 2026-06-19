import { Injectable } from '@nestjs/common'
import { getYear } from '../../common/utils/date-time.utility'
import { buildNextSequenceNumber } from '../../common/utils/sequence-number.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { IncidentWithTenant, IncidentWithTenantAndTimeline } from './incidents.types'
import type { Prisma, IncidentTimeline } from '@prisma/client'

@Injectable()
export class IncidentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* INCIDENT QUERIES                                                   */
  /* ---------------------------------------------------------------- */

  async findManyWithTenant(params: {
    where: Prisma.IncidentWhereInput
    orderBy: Prisma.IncidentOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<IncidentWithTenant[]> {
    return this.prisma.incident.findMany({
      ...params,
      include: { tenant: { select: { name: true } } },
    })
  }

  async count(where: Prisma.IncidentWhereInput): Promise<number> {
    return this.prisma.incident.count({ where })
  }

  async findFirstWithRelations(
    where: Prisma.IncidentWhereInput
  ): Promise<IncidentWithTenantAndTimeline | null> {
    return this.prisma.incident.findFirst({
      where,
      include: {
        timeline: { orderBy: { timestamp: 'desc' } },
        tenant: { select: { name: true } },
      },
    })
  }

  async deleteMany(where: Prisma.IncidentWhereInput): Promise<Prisma.BatchPayload> {
    return this.prisma.incident.deleteMany({ where })
  }

  /* ---------------------------------------------------------------- */
  /* INCIDENT TIMELINE QUERIES                                          */
  /* ---------------------------------------------------------------- */

  async findManyTimeline(params: {
    where: Prisma.IncidentTimelineWhereInput
    orderBy: Prisma.IncidentTimelineOrderByWithRelationInput
  }): Promise<IncidentTimeline[]> {
    return this.prisma.incidentTimeline.findMany(params)
  }

  async createTimelineEntry(
    data: Prisma.IncidentTimelineUncheckedCreateInput
  ): Promise<IncidentTimeline> {
    return this.prisma.incidentTimeline.create({ data })
  }

  /* ---------------------------------------------------------------- */
  /* USER LOOKUPS                                                       */
  /* ---------------------------------------------------------------- */

  async findUserById(userId: string): Promise<{ name: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })
  }

  async findUserByEmail(email: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })
  }

  async findUsersByIds(ids: string[]): Promise<{ id: string; name: string; email: string }[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    })
  }

  async findUsersByEmails(emails: string[]): Promise<{ email: string; name: string }[]> {
    return this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true },
    })
  }

  async findUserNameById(userId: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
  }

  /* ---------------------------------------------------------------- */
  /* VALIDATION QUERIES                                                 */
  /* ---------------------------------------------------------------- */

  async countAlertsByIdsAndTenant(alertIds: string[], tenantId: string): Promise<number> {
    return this.prisma.alert.count({
      where: { id: { in: alertIds }, tenantId },
    })
  }

  async countCasesByIdAndTenant(caseId: string, tenantId: string): Promise<number> {
    return this.prisma.case.count({
      where: { id: caseId, tenantId },
    })
  }

  async findActiveTenantMembership(
    userId: string,
    tenantId: string
  ): Promise<{ id: string } | null> {
    return this.prisma.tenantMembership.findFirst({
      where: {
        userId,
        tenantId,
        status: 'active',
      },
      select: { id: true },
    })
  }

  /* ---------------------------------------------------------------- */
  /* TRANSACTION: CREATE INCIDENT                                       */
  /* ---------------------------------------------------------------- */

  async createIncidentWithTimeline(params: {
    data: Prisma.IncidentUncheckedCreateInput
    timelineEvent: string
    actorEmail: string
  }): Promise<IncidentWithTenantAndTimeline> {
    return this.prisma.$transaction(async tx => {
      const incidentNumber = await this.generateIncidentNumber(tx, params.data.tenantId)

      const newIncident = await tx.incident.create({
        data: {
          ...params.data,
          incidentNumber,
        },
      })

      await tx.incidentTimeline.create({
        data: {
          incidentId: newIncident.id,
          event: params.timelineEvent,
          actorType: 'user',
          actorName: params.actorEmail,
        },
      })

      return tx.incident.findUniqueOrThrow({
        where: { id: newIncident.id },
        include: {
          timeline: { orderBy: { timestamp: 'desc' } },
          tenant: { select: { name: true } },
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* TRANSACTION: UPDATE INCIDENT                                       */
  /* ---------------------------------------------------------------- */

  async updateIncidentWithTimeline(params: {
    id: string
    tenantId: string
    updateData: Record<string, unknown>
    timelineEvent: string
    actorEmail: string
  }): Promise<IncidentWithTenantAndTimeline | null> {
    return this.prisma.$transaction(async tx => {
      const updated = await tx.incident.updateMany({
        where: { id: params.id, tenantId: params.tenantId },
        data: params.updateData,
      })

      if (updated.count === 0) {
        return null
      }

      await tx.incidentTimeline.create({
        data: {
          incidentId: params.id,
          event: params.timelineEvent,
          actorType: 'user',
          actorName: params.actorEmail,
        },
      })

      return tx.incident.findUniqueOrThrow({
        where: { id: params.id },
        include: {
          timeline: { orderBy: { timestamp: 'desc' } },
          tenant: { select: { name: true } },
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* STATS QUERIES                                                      */
  /* ---------------------------------------------------------------- */

  async countByStatus(tenantId: string, status: string): Promise<number> {
    return this.prisma.incident.count({
      where: { tenantId, status: status as Prisma.IncidentWhereInput['status'] },
    })
  }

  async countResolvedSince(tenantId: string, statuses: string[], since: Date): Promise<number> {
    return this.prisma.incident.count({
      where: {
        tenantId,
        status: { in: statuses as Prisma.EnumIncidentStatusFilter['in'] },
        resolvedAt: { gte: since },
      },
    })
  }

  async getAvgResolveHours(tenantId: string): Promise<number | null> {
    const result = await this.prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float as avg_hours
      FROM incidents
      WHERE tenant_id = ${tenantId}::uuid
        AND resolved_at IS NOT NULL
    `
    const avgHours = result[0]?.avg_hours
    if (avgHours === null || avgHours === undefined) return null
    return Math.round(avgHours * 100) / 100
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: NUMBER GENERATION                                         */
  /* ---------------------------------------------------------------- */

  private async generateIncidentNumber(
    tx: Prisma.TransactionClient,
    _tenantId: string
  ): Promise<string> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('incident_number_gen'))::text`

    const year = getYear()
    const prefix = `INC-${year}-`

    const latestIncident = await tx.incident.findFirst({
      where: {
        incidentNumber: { startsWith: prefix },
      },
      orderBy: { incidentNumber: 'desc' },
      select: { incidentNumber: true },
    })

    return buildNextSequenceNumber(latestIncident?.incidentNumber, prefix, 4)
  }
}
