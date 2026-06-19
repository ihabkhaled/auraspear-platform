import { Injectable } from '@nestjs/common'
import { getYear, nowDate } from '../../common/utils/date-time.utility'
import { buildNextSequenceNumber } from '../../common/utils/sequence-number.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  CaseCommentWithMentions,
  CaseWithRelations,
  CaseWithTenant,
  MembershipWithUser,
} from './cases.types'
import type {
  CaseArtifact,
  CaseComment,
  CaseNote,
  CaseSeverity,
  CaseStatus,
  CaseTask,
  CaseTimeline,
  Prisma,
  UserStatus,
} from '@prisma/client'

@Injectable()
export class CasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* USER LOOKUPS                                                      */
  /* ---------------------------------------------------------------- */

  async findUserById(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
  }

  async findUserNameById(userId: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
  }

  async findUserByEmail(email: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })
  }

  async findUsersByEmails(emails: string[]): Promise<{ email: string; name: string }[]> {
    return this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, name: true },
    })
  }

  async findUsersByIds(ids: string[]): Promise<{ id: string; name: string; email: string }[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    })
  }

  /* ---------------------------------------------------------------- */
  /* CASE QUERIES                                                      */
  /* ---------------------------------------------------------------- */

  async findCasesAndCount(params: {
    where: Prisma.CaseWhereInput
    orderBy: Prisma.CaseOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[CaseWithTenant[], number]> {
    return Promise.all([
      this.prisma.case.findMany({
        ...params,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.case.count({ where: params.where }),
    ])
  }

  async findCaseByIdAndTenant(id: string, tenantId: string): Promise<CaseWithRelations | null> {
    return this.prisma.case.findFirst({
      where: { id, tenantId },
      include: {
        notes: { orderBy: { createdAt: 'asc' } },
        timeline: { orderBy: { timestamp: 'asc' } },
        tasks: true,
        artifacts: true,
        tenant: { select: { name: true } },
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* ALERT VALIDATION                                                  */
  /* ---------------------------------------------------------------- */

  async countAlertsByTenantAndIds(tenantId: string, alertIds: string[]): Promise<number> {
    return this.prisma.alert.count({
      where: { id: { in: alertIds }, tenantId },
    })
  }

  async countAlertByTenantAndId(tenantId: string, alertId: string): Promise<number> {
    return this.prisma.alert.count({
      where: { id: alertId, tenantId },
    })
  }

  /* ---------------------------------------------------------------- */
  /* MEMBERSHIP VALIDATION                                             */
  /* ---------------------------------------------------------------- */

  async findMembershipByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<{ status: UserStatus } | null> {
    return this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { status: true },
    })
  }

  async countActiveMentionMemberships(
    userIds: string[],
    tenantId: string,
    status: UserStatus
  ): Promise<number> {
    return this.prisma.tenantMembership.count({
      where: {
        userId: { in: userIds },
        tenantId,
        status,
      },
    })
  }

  async searchMentionableMembers(
    tenantId: string,
    query: string,
    status: UserStatus,
    limit: number
  ): Promise<MembershipWithUser[]> {
    return this.prisma.tenantMembership.findMany({
      where: {
        tenantId,
        status,
        user: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: limit,
    })
  }

  /* ---------------------------------------------------------------- */
  /* CREATE CASE TRANSACTION                                           */
  /* ---------------------------------------------------------------- */

  async createCaseTransaction(
    params: {
      tenantId: string
      cycleId?: string | null
      title: string
      description: string
      severity: CaseSeverity
      status: CaseStatus
      ownerUserId?: string | null
      createdBy: string
      linkedAlerts: string[]
    },
    timelineData: {
      type: string
      actor: string
      description: string
    },
    linkedAlertTimelineData?: {
      type: string
      actor: string
      description: string
    }
  ): Promise<CaseWithRelations | null> {
    return this.prisma.$transaction(async tx => {
      let resolvedCycleId: string | null = null
      if (params.cycleId) {
        const cycle = await tx.caseCycle.findFirst({
          where: { id: params.cycleId, tenantId: params.tenantId },
          select: { id: true },
        })
        if (!cycle) {
          return null
        }
        resolvedCycleId = params.cycleId
      } else {
        const activeCycle = await tx.caseCycle.findFirst({
          where: { tenantId: params.tenantId, status: 'active' },
          select: { id: true },
        })
        resolvedCycleId = activeCycle?.id ?? null
      }

      // Generate case number with advisory lock
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('case_number_gen'))::text`
      const year = getYear()
      const prefix = `SOC-${year}-`
      const latestCase = await tx.case.findFirst({
        where: { caseNumber: { startsWith: prefix } },
        orderBy: { caseNumber: 'desc' },
        select: { caseNumber: true },
      })
      const caseNumber = buildNextSequenceNumber(latestCase?.caseNumber, prefix, 3)

      const newCase = await tx.case.create({
        data: {
          tenantId: params.tenantId,
          caseNumber,
          title: params.title,
          description: params.description,
          severity: params.severity,
          status: params.status,
          ownerUserId: params.ownerUserId ?? null,
          createdBy: params.createdBy,
          cycleId: resolvedCycleId,
          ...(params.linkedAlerts.length > 0 ? { linkedAlerts: params.linkedAlerts } : {}),
        },
      })

      await tx.caseTimeline.create({
        data: {
          caseId: newCase.id,
          type: timelineData.type,
          actor: timelineData.actor,
          description: JSON.stringify({
            key: 'caseCreated',
            params: { caseRef: caseNumber, title: params.title },
          }),
        },
      })

      if (linkedAlertTimelineData && params.linkedAlerts.length > 0) {
        await tx.caseTimeline.create({
          data: {
            caseId: newCase.id,
            type: linkedAlertTimelineData.type,
            actor: linkedAlertTimelineData.actor,
            description: linkedAlertTimelineData.description,
          },
        })
      }

      return tx.case.findUniqueOrThrow({
        where: { id: newCase.id },
        include: {
          notes: true,
          timeline: { orderBy: { timestamp: 'asc' } },
          tasks: true,
          artifacts: true,
          tenant: { select: { name: true } },
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE CASE TRANSACTION                                           */
  /* ---------------------------------------------------------------- */

  async updateCaseTransaction(
    id: string,
    tenantId: string,
    updateData: Record<string, unknown>,
    timelineData: { type: string; actor: string; description: string }
  ): Promise<CaseWithRelations | null> {
    return this.prisma.$transaction(async tx => {
      const updated = await tx.case.updateMany({
        where: { id, tenantId },
        data: updateData,
      })

      if (updated.count === 0) {
        return null
      }

      await tx.caseTimeline.create({
        data: {
          caseId: id,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })

      return tx.case.findUniqueOrThrow({
        where: { id },
        include: {
          notes: true,
          timeline: { orderBy: { timestamp: 'asc' } },
          tasks: true,
          artifacts: true,
          tenant: { select: { name: true } },
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* DELETE CASE TRANSACTION                                           */
  /* ---------------------------------------------------------------- */

  async softDeleteCaseTransaction(
    id: string,
    tenantId: string,
    status: CaseStatus,
    timelineData: { type: string; actor: string; description: string }
  ): Promise<void> {
    return this.prisma.$transaction(async tx => {
      await tx.case.updateMany({
        where: { id, tenantId },
        data: { status, closedAt: nowDate() },
      })
      await tx.caseTimeline.create({
        data: {
          caseId: id,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* LINK ALERT TRANSACTION                                            */
  /* ---------------------------------------------------------------- */

  async linkAlertTransaction(
    caseId: string,
    tenantId: string,
    linkedAlerts: string[],
    timelineData: { type: string; actor: string; description: string }
  ): Promise<CaseWithRelations | null> {
    return this.prisma.$transaction(async tx => {
      const updated = await tx.case.updateMany({
        where: { id: caseId, tenantId },
        data: { linkedAlerts },
      })

      if (updated.count === 0) {
        return null
      }

      await tx.caseTimeline.create({
        data: {
          caseId,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })

      return tx.case.findUniqueOrThrow({
        where: { id: caseId },
        include: {
          notes: true,
          timeline: { orderBy: { timestamp: 'asc' } },
          tasks: true,
          artifacts: true,
          tenant: { select: { name: true } },
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* NOTES                                                             */
  /* ---------------------------------------------------------------- */

  async findCaseNotesAndCount(
    caseId: string,
    skip: number,
    take: number
  ): Promise<[CaseNote[], number]> {
    const where = { caseId }
    return Promise.all([
      this.prisma.caseNote.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.caseNote.count({ where }),
    ])
  }

  async addNoteTransaction(
    caseId: string,
    author: string,
    body: string,
    timelineData: { type: string; actor: string; description: string }
  ): Promise<CaseNote> {
    return this.prisma.$transaction(async tx => {
      const createdNote = await tx.caseNote.create({
        data: { caseId, author, body },
      })
      await tx.caseTimeline.create({
        data: {
          caseId,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })
      return createdNote
    })
  }

  /* ---------------------------------------------------------------- */
  /* COMMENTS                                                          */
  /* ---------------------------------------------------------------- */

  async findCommentsAndCount(
    caseId: string,
    skip: number,
    take: number
  ): Promise<[CaseCommentWithMentions[], number]> {
    const where = { caseId, isDeleted: false }
    return Promise.all([
      this.prisma.caseComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: { mentions: true },
      }),
      this.prisma.caseComment.count({ where }),
    ])
  }

  async findCommentByIdAndCase(commentId: string, caseId: string): Promise<CaseComment | null> {
    return this.prisma.caseComment.findFirst({
      where: { id: commentId, caseId, isDeleted: false },
    })
  }

  async addCommentTransaction(
    caseId: string,
    authorId: string,
    body: string,
    mentionUserIds: string[],
    timelineData: { type: string; actor: string; description: string }
  ): Promise<CaseCommentWithMentions> {
    return this.prisma.$transaction(async tx => {
      const createdComment = await tx.caseComment.create({
        data: { caseId, authorId, body },
      })

      if (mentionUserIds.length > 0) {
        await tx.caseCommentMention.createMany({
          data: mentionUserIds.map(userId => ({
            commentId: createdComment.id,
            userId,
          })),
        })
      }

      await tx.caseTimeline.create({
        data: {
          caseId,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })

      return tx.caseComment.findUniqueOrThrow({
        where: { id: createdComment.id },
        include: { mentions: true },
      })
    })
  }

  async updateCommentTransaction(
    commentId: string,
    caseId: string,
    body: string,
    mentionUserIds: string[],
    timelineData: { type: string; actor: string; description: string }
  ): Promise<CaseCommentWithMentions> {
    return this.prisma.$transaction(async tx => {
      await tx.caseComment.updateMany({
        where: { id: commentId, caseId },
        data: { body, isEdited: true },
      })

      await tx.caseCommentMention.deleteMany({ where: { commentId } })
      if (mentionUserIds.length > 0) {
        await tx.caseCommentMention.createMany({
          data: mentionUserIds.map(userId => ({
            commentId,
            userId,
          })),
        })
      }

      await tx.caseTimeline.create({
        data: {
          caseId,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })

      return tx.caseComment.findUniqueOrThrow({
        where: { id: commentId },
        include: { mentions: true },
      })
    })
  }

  async softDeleteCommentTransaction(
    commentId: string,
    caseId: string,
    timelineData: { type: string; actor: string; description: string }
  ): Promise<void> {
    return this.prisma.$transaction(async tx => {
      await tx.caseComment.updateMany({
        where: { id: commentId, caseId },
        data: { isDeleted: true },
      })

      await tx.caseTimeline.create({
        data: {
          caseId,
          type: timelineData.type,
          actor: timelineData.actor,
          description: timelineData.description,
        },
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* TASKS                                                             */
  /* ---------------------------------------------------------------- */

  async createTask(data: {
    caseId: string
    title: string
    status: string
    assignee: string | null
  }): Promise<CaseTask> {
    return this.prisma.caseTask.create({ data })
  }

  async findTaskByIdAndCase(taskId: string, caseId: string): Promise<CaseTask | null> {
    return this.prisma.caseTask.findFirst({
      where: { id: taskId, caseId },
    })
  }

  async updateTask(
    taskId: string,
    caseId: string,
    data: Record<string, unknown>
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.caseTask.updateMany({
      where: { id: taskId, caseId },
      data,
    })
  }

  async deleteTask(taskId: string, caseId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.caseTask.deleteMany({ where: { id: taskId, caseId } })
  }

  async createTimeline(data: {
    caseId: string
    type: string
    actor: string
    description: string
  }): Promise<CaseTimeline> {
    return this.prisma.caseTimeline.create({ data })
  }

  /* ---------------------------------------------------------------- */
  /* ARTIFACTS                                                         */
  /* ---------------------------------------------------------------- */

  async findArtifactDuplicate(
    caseId: string,
    type: string,
    value: string
  ): Promise<CaseArtifact | null> {
    return this.prisma.caseArtifact.findFirst({
      where: { caseId, type, value },
    })
  }

  async createArtifact(data: {
    caseId: string
    type: string
    value: string
    source: string
  }): Promise<CaseArtifact> {
    return this.prisma.caseArtifact.create({ data })
  }

  async findArtifactByIdAndCase(artifactId: string, caseId: string): Promise<CaseArtifact | null> {
    return this.prisma.caseArtifact.findFirst({
      where: { id: artifactId, caseId },
    })
  }

  async deleteArtifact(artifactId: string, caseId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.caseArtifact.deleteMany({ where: { id: artifactId, caseId } })
  }

  /* ---------------------------------------------------------------- */
  /* STATS QUERIES                                                     */
  /* ---------------------------------------------------------------- */

  async countByStatus(tenantId: string, status: string): Promise<number> {
    return this.prisma.case.count({
      where: { tenantId, status: status as CaseStatus },
    })
  }

  async countBySeverity(tenantId: string, severity: string): Promise<number> {
    return this.prisma.case.count({
      where: { tenantId, severity: severity as CaseSeverity },
    })
  }

  async countTotal(tenantId: string): Promise<number> {
    return this.prisma.case.count({
      where: { tenantId },
    })
  }

  async countClosedSince(tenantId: string, since: Date): Promise<number> {
    return this.prisma.case.count({
      where: {
        tenantId,
        status: 'closed',
        closedAt: { gte: since },
      },
    })
  }

  async getAvgResolutionHours(tenantId: string): Promise<number | null> {
    const result = await this.prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)::float as avg_hours
      FROM cases
      WHERE tenant_id = ${tenantId}::uuid
        AND closed_at IS NOT NULL
    `
    const avgHours = result[0]?.avg_hours
    if (avgHours === null || avgHours === undefined) return null
    return Math.round(avgHours * 10) / 10
  }

  /* ---------------------------------------------------------------- */
  /* CASE CYCLE LOOKUP                                                 */
  /* ---------------------------------------------------------------- */

  async findCaseCycleById(cycleId: string): Promise<{ name: string } | null> {
    return this.prisma.caseCycle.findUnique({
      where: { id: cycleId },
      select: { name: true },
    })
  }
}
