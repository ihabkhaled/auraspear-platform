import { Injectable, Logger } from '@nestjs/common'
import { CasesRepository } from './cases.repository'
import {
  buildAlertLinkedTimelineEntry,
  buildAssigneeTimelineDescription,
  buildCaseOrderBy,
  buildCaseUpdateData,
  buildCaseWhereClause,
  buildCreateCasePayload,
  buildCycleNotificationMessage,
  buildCycleTimelineDescription,
  buildFieldChangeDescription,
  buildStatusTimelineDescription,
  buildTaskStatusTimelineDescription,
  buildTaskUpdateData,
  collectCommentUserIds,
  formatActorLabel,
  formatUserLabel,
  hasFieldChangesOnly,
  isReopeningCase,
  mapCaseListItem,
  mapCommentToResponseShape,
  resolveTimelineType,
  shouldBlockClosedCaseUpdate,
  truncateBody,
} from './cases.utilities'
import {
  AppLogFeature,
  CaseStatus,
  CaseTaskStatus,
  CaseTimelineType,
  NotificationType,
} from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { MembershipStatus, UserRole } from '../../common/interfaces/authenticated-request.interface'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { daysAgo } from '../../common/utils/date-time.utility'
import { hasRoleAtLeast } from '../../common/utils/role.utility'
import { AlertsRepository } from '../alerts/alerts.repository'
import { EntityExtractionService } from '../entities/entity-extraction.service'
import { NotificationsService } from '../notifications/notifications.service'
import type {
  AddCommentResult,
  CaseCommentResponse,
  CaseRecord,
  MentionableUser,
  PaginatedCaseComments,
  PaginatedCaseNotes,
  PaginatedCases,
  CaseStats,
} from './cases.types'
import type { CreateArtifactDto } from './dto/create-artifact.dto'
import type { CreateCaseDto } from './dto/create-case.dto'
import type { CreateCommentDto } from './dto/create-comment.dto'
import type { CreateNoteDto } from './dto/create-note.dto'
import type { CreateTaskDto } from './dto/create-task.dto'
import type { LinkAlertDto } from './dto/link-alert.dto'
import type { UpdateCaseDto } from './dto/update-case.dto'
import type { UpdateCommentDto } from './dto/update-comment.dto'
import type { UpdateTaskDto } from './dto/update-task.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type {
  Case,
  CaseArtifact,
  CaseComment,
  CaseNote,
  CaseTask,
  CaseTimeline,
} from '@prisma/client'

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly casesRepository: CasesRepository,
    private readonly appLogger: AppLoggerService,
    private readonly notificationsService: NotificationsService,
    private readonly entityExtractionService: EntityExtractionService,
    private readonly alertsRepository: AlertsRepository
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CASES, 'CasesService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST (paginated, tenant-scoped)                                   */
  /* ---------------------------------------------------------------- */

  async listCases(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    status?: string,
    severity?: string,
    query?: string,
    cycleId?: string,
    ownerUserId?: string
  ): Promise<PaginatedCases> {
    this.log.entry('listCases', tenantId, {
      page,
      limit,
      status,
      severity,
      query,
      cycleId,
      ownerUserId,
    })

    const where = buildCaseWhereClause(tenantId, { status, severity, query, cycleId, ownerUserId })

    const [cases, total] = await this.casesRepository.findCasesAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: buildCaseOrderBy(sortBy, sortOrder),
    })

    const [ownersMap, creatorsMap] = await Promise.all([
      this.resolveOwnersBatch(cases.map(c => c.ownerUserId)),
      this.resolveCreatorNamesBatch(cases.map(c => c.createdBy)),
    ])

    const data = cases.map(c => mapCaseListItem(c, ownersMap, creatorsMap))

    this.log.success('listCases', tenantId, { total, returnedCount: data.length })

    return { data, pagination: buildPaginationMeta(page, limit, total) }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getCaseStats(tenantId: string): Promise<CaseStats> {
    this.log.entry('getCaseStats', tenantId)

    const thirtyDaysAgo = daysAgo(30)

    const [statusCounts, severityCounts, closedLast30d, avgResolutionHours] = await Promise.all([
      this.fetchStatusCounts(tenantId),
      this.fetchSeverityCounts(tenantId),
      this.casesRepository.countClosedSince(tenantId, thirtyDaysAgo),
      this.casesRepository.getAvgResolutionHours(tenantId),
    ])

    this.log.success('getCaseStats', tenantId)

    return {
      ...statusCounts,
      bySeverity: severityCounts,
      closedLast30d,
      avgResolutionHours,
    }
  }

  private async fetchStatusCounts(
    tenantId: string
  ): Promise<{ total: number; open: number; inProgress: number; closed: number }> {
    const [total, open, inProgress, closed] = await Promise.all([
      this.casesRepository.countTotal(tenantId),
      this.casesRepository.countByStatus(tenantId, CaseStatus.OPEN),
      this.casesRepository.countByStatus(tenantId, CaseStatus.IN_PROGRESS),
      this.casesRepository.countByStatus(tenantId, CaseStatus.CLOSED),
    ])
    return { total, open, inProgress, closed }
  }

  private async fetchSeverityCounts(
    tenantId: string
  ): Promise<{ critical: number; high: number; medium: number; low: number }> {
    const [critical, high, medium, low] = await Promise.all([
      this.casesRepository.countBySeverity(tenantId, 'critical'),
      this.casesRepository.countBySeverity(tenantId, 'high'),
      this.casesRepository.countBySeverity(tenantId, 'medium'),
      this.casesRepository.countBySeverity(tenantId, 'low'),
    ])
    return { critical, high, medium, low }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createCase(dto: CreateCaseDto, user: JwtPayload): Promise<CaseRecord> {
    if (dto.ownerUserId) {
      await this.validateOwnerInTenant(dto.ownerUserId, user.tenantId)
    }

    const linkedAlerts = dto.linkedAlertIds ?? []
    if (linkedAlerts.length > 0) {
      await this.validateLinkedAlerts(linkedAlerts, user)
    }

    const result = await this.executeCreateCase(dto, linkedAlerts, user)
    this.log.success('createCase', user.tenantId, {
      caseId: result.id,
      caseNumber: result.caseNumber,
      severity: result.severity,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    // Best-effort entity extraction from linked alerts
    if (linkedAlerts.length > 0) {
      this.extractEntitiesFromLinkedAlerts(user.tenantId, linkedAlerts).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        this.logger.warn(
          `Entity extraction from linked alerts failed for case ${result.id}: ${message}`
        )
      })
    }

    return this.enrichCaseRecord(result)
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getCaseById(id: string, tenantId: string): Promise<CaseRecord> {
    const caseRecord = await this.casesRepository.findCaseByIdAndTenant(id, tenantId)
    if (!caseRecord) {
      this.log.warn('getCaseById', tenantId, 'Case not found', { caseId: id })
      throw new BusinessException(404, `Case ${id} not found`, 'errors.cases.notFound')
    }
    return this.enrichCaseRecord(caseRecord)
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updateCase(id: string, dto: UpdateCaseDto, user: JwtPayload): Promise<CaseRecord> {
    const existing = await this.getCaseById(id, user.tenantId)
    const isReopening = isReopeningCase(existing.status, dto.status)

    this.guardClosedCaseUpdate(existing, isReopening, dto, id, user)
    if (dto.ownerUserId) {
      await this.validateOwnerInTenant(dto.ownerUserId, user.tenantId)
    }
    this.guardStatusChangePermission(dto, existing, user, id)

    const result = await this.performCaseUpdate(id, dto, existing, isReopening, user)

    this.log.success('updateCase', user.tenantId, {
      caseId: id,
      caseNumber: existing.caseNumber,
      changedFields: Object.keys(dto).join(', '),
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    await this.sendUpdateNotifications(dto, existing, user, id)
    return this.enrichCaseRecord(result)
  }

  private async performCaseUpdate(
    id: string,
    dto: UpdateCaseDto,
    existing: CaseRecord,
    isReopening: boolean,
    user: JwtPayload
  ): Promise<NonNullable<Awaited<ReturnType<CasesRepository['updateCaseTransaction']>>>> {
    const actorLabel = await this.resolveActorLabel(user)
    const timelineDescription = await this.buildUpdateTimelineDescription(
      dto,
      existing,
      isReopening,
      actorLabel
    )
    const timelineType = resolveTimelineType(
      dto.status !== undefined && dto.status !== existing.status
    )

    return this.executeUpdateCase(id, user.tenantId, buildCaseUpdateData(dto, isReopening), {
      type: timelineType,
      actor: user.email,
      description: timelineDescription,
    })
  }

  /* ---------------------------------------------------------------- */
  /* ASSIGN                                                            */
  /* ---------------------------------------------------------------- */

  async assignCase(id: string, ownerUserId: string | null, user: JwtPayload): Promise<CaseRecord> {
    const existing = await this.getCaseById(id, user.tenantId)
    this.ensureNotClosed(existing.status, 'assignCase', user, id, 'Cannot reassign a closed case')

    if (ownerUserId) {
      await this.validateOwnerInTenant(ownerUserId, user.tenantId)
    }

    const result = await this.executeAssignCase(id, ownerUserId, existing, user)

    this.log.success('assignCase', user.tenantId, {
      caseId: id,
      caseNumber: existing.caseNumber,
      previousOwner: existing.ownerUserId,
      newOwner: ownerUserId,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    await this.notifyAssignmentChange(ownerUserId, existing, user, id)
    return this.enrichCaseRecord(result)
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deleteCase(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.log.entry('deleteCase', tenantId, { caseId: id, actorEmail: actor })

    const existing = await this.getCaseById(id, tenantId)
    await this.casesRepository.softDeleteCaseTransaction(id, tenantId, CaseStatus.CLOSED, {
      type: CaseTimelineType.DELETED,
      actor,
      description: JSON.stringify({ key: 'caseDeleted', params: { caseRef: existing.caseNumber } }),
    })

    this.log.success('deleteCase', tenantId, {
      caseId: id,
      caseNumber: existing.caseNumber,
      actorEmail: actor,
    })

    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* LINK ALERT                                                        */
  /* ---------------------------------------------------------------- */

  async linkAlert(caseId: string, dto: LinkAlertDto, user: JwtPayload): Promise<CaseRecord> {
    this.log.entry('linkAlert', user.tenantId, {
      caseId,
      alertId: dto.alertId,
      actorEmail: user.email,
    })

    const existing = await this.getCaseById(caseId, user.tenantId)
    this.ensureNotClosed(
      existing.status,
      'linkAlert',
      user,
      caseId,
      'Cannot link alerts to a closed case'
    )
    await this.validateAlertBelongsToTenant(dto.alertId, user, caseId)
    this.ensureAlertNotDuplicate(existing.linkedAlerts, dto.alertId, user, caseId)

    const result = await this.executeLinkAlert(caseId, user, existing.linkedAlerts, dto)

    this.log.success('linkAlert', user.tenantId, {
      caseId,
      caseNumber: existing.caseNumber,
      alertId: dto.alertId,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    return this.enrichCaseRecord(result)
  }

  /* ---------------------------------------------------------------- */
  /* NOTES                                                             */
  /* ---------------------------------------------------------------- */

  async getCaseNotes(
    caseId: string,
    tenantId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedCaseNotes> {
    this.log.entry('getCaseNotes', tenantId, { caseId, page, limit })

    await this.getCaseById(caseId, tenantId)
    const [notes, total] = await this.casesRepository.findCaseNotesAndCount(
      caseId,
      (page - 1) * limit,
      limit
    )

    this.log.success('getCaseNotes', tenantId, { caseId, total, returnedCount: notes.length })

    return { data: notes, pagination: buildPaginationMeta(page, limit, total) }
  }

  async addCaseNote(caseId: string, dto: CreateNoteDto, user: JwtPayload): Promise<CaseNote> {
    this.log.entry('addCaseNote', user.tenantId, { caseId, actorEmail: user.email })

    const existing = await this.getCaseById(caseId, user.tenantId)
    this.ensureNotClosed(
      existing.status,
      'addCaseNote',
      user,
      caseId,
      'Cannot add notes to a closed case'
    )

    const note = await this.casesRepository.addNoteTransaction(caseId, user.email, dto.body, {
      type: CaseTimelineType.NOTE_ADDED,
      actor: user.email,
      description: JSON.stringify({
        key: 'noteAdded',
        params: { content: truncateBody(dto.body) },
      }),
    })

    this.log.success('addCaseNote', user.tenantId, {
      noteId: note.id,
      caseId,
      caseNumber: existing.caseNumber,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    return note
  }

  /* ---------------------------------------------------------------- */
  /* COMMENTS                                                          */
  /* ---------------------------------------------------------------- */

  async listCaseComments(
    caseId: string,
    tenantId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedCaseComments> {
    this.log.entry('listCaseComments', tenantId, { caseId, page, limit })

    await this.getCaseById(caseId, tenantId)
    const [comments, total] = await this.casesRepository.findCommentsAndCount(
      caseId,
      (page - 1) * limit,
      limit
    )
    const userMap = await this.buildCommentUserMap(comments)
    const data = comments.map(c => mapCommentToResponseShape(c, userMap))

    this.log.success('listCaseComments', tenantId, { caseId, total, returnedCount: data.length })

    return { data, pagination: buildPaginationMeta(page, limit, total) }
  }

  async addCaseComment(
    caseId: string,
    dto: CreateCommentDto,
    user: JwtPayload
  ): Promise<CaseCommentResponse> {
    const existing = await this.getCaseById(caseId, user.tenantId)
    this.ensureNotClosed(
      existing.status,
      'addCaseComment',
      user,
      caseId,
      'Cannot add comments to a closed case'
    )

    const uniqueMentionIds = [...new Set(dto.mentionedUserIds)]
    this.validateSelfMention(uniqueMentionIds, user.sub)
    await this.validateMentionedUsers(uniqueMentionIds, user.tenantId)

    const comment = await this.executeAddComment(caseId, user, dto.body, uniqueMentionIds)

    this.log.success('addCaseComment', user.tenantId, {
      commentId: comment.id,
      caseId,
      caseNumber: existing.caseNumber,
      mentionCount: uniqueMentionIds.length,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    await this.sendCommentNotifications(
      user,
      caseId,
      existing,
      comment.id,
      uniqueMentionIds,
      dto.body
    )
    return this.mapCommentToResponse(comment, user.sub)
  }

  async updateCaseComment(
    caseId: string,
    commentId: string,
    dto: UpdateCommentDto,
    user: JwtPayload
  ): Promise<CaseCommentResponse> {
    await this.getCaseById(caseId, user.tenantId)
    const existing = await this.findCommentOrThrow(commentId, caseId)
    this.ensureCommentAuthorOrAdmin(existing.authorId, user, 'edit')

    const uniqueMentionIds = [...new Set(dto.mentionedUserIds)]
    await this.validateMentionedUsers(uniqueMentionIds, user.tenantId)

    const comment = await this.casesRepository.updateCommentTransaction(
      commentId,
      caseId,
      dto.body,
      uniqueMentionIds,
      {
        type: CaseTimelineType.COMMENT_EDITED,
        actor: user.email,
        description: JSON.stringify({ key: 'commentEdited', params: {} }),
      }
    )
    this.log.success('updateCaseComment', user.tenantId, {
      commentId,
      caseId,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return this.mapCommentToResponse(comment, user.sub)
  }

  async deleteCaseComment(
    caseId: string,
    commentId: string,
    user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    const caseRecord = await this.getCaseById(caseId, user.tenantId)
    const existing = await this.findCommentOrThrow(commentId, caseId)
    this.ensureCommentAuthorOrAdmin(existing.authorId, user, 'delete')

    await this.casesRepository.softDeleteCommentTransaction(commentId, caseId, {
      type: CaseTimelineType.COMMENT_DELETED,
      actor: user.email,
      description: JSON.stringify({ key: 'commentDeleted', params: {} }),
    })
    this.log.success('deleteCaseComment', user.tenantId, {
      commentId,
      caseId,
      caseNumber: caseRecord.caseNumber,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return { deleted: true }
  }

  async searchMentionableUsers(
    tenantId: string,
    query: string,
    limit = 10
  ): Promise<MentionableUser[]> {
    this.log.entry('searchMentionableUsers', tenantId, { query, limit })

    const memberships = await this.casesRepository.searchMentionableMembers(
      tenantId,
      query,
      MembershipStatus.ACTIVE,
      limit
    )
    const results = memberships.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }))

    this.log.success('searchMentionableUsers', tenantId, { resultCount: results.length })

    return results
  }

  /* ---------------------------------------------------------------- */
  /* TASKS                                                             */
  /* ---------------------------------------------------------------- */

  async createTask(caseId: string, dto: CreateTaskDto, user: JwtPayload): Promise<CaseTask> {
    const caseRecord = await this.getCaseById(caseId, user.tenantId)
    this.ensureNotClosed(
      caseRecord.status,
      'createTask',
      user,
      caseId,
      'Cannot add tasks to a closed case'
    )

    const task = await this.executeCreateTask(caseId, dto, user)

    this.log.success('createTask', user.tenantId, {
      taskId: task.id,
      caseId,
      caseNumber: caseRecord.caseNumber,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    await this.notifyTaskAdded(user, caseId, caseRecord, dto.title)
    return task
  }

  async updateTask(
    caseId: string,
    taskId: string,
    dto: UpdateTaskDto,
    user: JwtPayload
  ): Promise<CaseTask> {
    this.log.entry('updateTask', user.tenantId, { caseId, taskId, actorEmail: user.email })

    await this.getCaseById(caseId, user.tenantId)
    const existing = await this.findTaskOrThrow(taskId, caseId)
    await this.casesRepository.updateTask(taskId, caseId, buildTaskUpdateData(dto))

    const task = await this.findTaskOrThrow(taskId, caseId)
    if (dto.status !== undefined && dto.status !== existing.status) {
      const actorLabel = await this.resolveActorLabel(user)
      await this.casesRepository.createTimeline({
        caseId,
        type: CaseTimelineType.UPDATED,
        actor: user.email,
        description: buildTaskStatusTimelineDescription(existing.title, dto.status, actorLabel),
      })
    }

    this.log.success('updateTask', user.tenantId, {
      taskId,
      caseId,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    return task
  }

  async deleteTask(
    caseId: string,
    taskId: string,
    user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    const caseRecord = await this.getCaseById(caseId, user.tenantId)
    const existing = await this.findTaskOrThrow(taskId, caseId)
    await this.casesRepository.deleteTask(taskId, caseId)

    const actorLabel = await this.resolveActorLabel(user)
    await this.casesRepository.createTimeline({
      caseId,
      type: CaseTimelineType.UPDATED,
      actor: user.email,
      description: JSON.stringify({
        key: 'taskRemoved',
        params: { taskTitle: existing.title, actorLabel },
      }),
    })
    this.log.success('deleteTask', user.tenantId, {
      taskId,
      caseId,
      caseNumber: caseRecord.caseNumber,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* ARTIFACTS                                                         */
  /* ---------------------------------------------------------------- */

  async createArtifact(
    caseId: string,
    dto: CreateArtifactDto,
    user: JwtPayload
  ): Promise<CaseArtifact> {
    const caseRecord = await this.getCaseById(caseId, user.tenantId)
    this.ensureNotClosed(
      caseRecord.status,
      'createArtifact',
      user,
      caseId,
      'Cannot add artifacts to a closed case'
    )
    await this.ensureNoDuplicateArtifact(caseId, dto)

    const artifact = await this.executeCreateArtifact(caseId, dto, user)
    this.triggerArtifactEntityExtraction(user.tenantId, dto)

    this.log.success('createArtifact', user.tenantId, {
      artifactId: artifact.id,
      caseId,
      caseNumber: caseRecord.caseNumber,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    await this.notifyArtifactAdded(user, caseId, caseRecord, dto)
    return artifact
  }

  async deleteArtifact(
    caseId: string,
    artifactId: string,
    user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    const caseRecord = await this.getCaseById(caseId, user.tenantId)
    const existing = await this.findArtifactOrThrow(artifactId, caseId)
    await this.casesRepository.deleteArtifact(artifactId, caseId)

    const actorLabel = await this.resolveActorLabel(user)
    await this.casesRepository.createTimeline({
      caseId,
      type: CaseTimelineType.UPDATED,
      actor: user.email,
      description: JSON.stringify({
        key: 'artifactRemoved',
        params: { artifactValue: `${existing.type}:${existing.value}`, actorLabel },
      }),
    })
    this.log.success('deleteArtifact', user.tenantId, {
      artifactId,
      caseId,
      caseNumber: caseRecord.caseNumber,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Enrichment                                               */
  /* ---------------------------------------------------------------- */

  private async enrichCaseRecord(
    record: Case & {
      notes: CaseNote[]
      timeline: CaseTimeline[]
      tasks: CaseTask[]
      artifacts: CaseArtifact[]
      tenant: { name: string }
    }
  ): Promise<CaseRecord> {
    const [{ ownerName, ownerEmail }, createdByName] = await Promise.all([
      this.resolveOwner(record.ownerUserId),
      this.resolveCreatorName(record.createdBy),
    ])
    return { ...record, ownerName, ownerEmail, createdByName, tenantName: record.tenant.name }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: User Resolution                                          */
  /* ---------------------------------------------------------------- */

  private async resolveOwner(
    ownerUserId: string | null
  ): Promise<{ ownerName: string | null; ownerEmail: string | null }> {
    if (!ownerUserId) return { ownerName: null, ownerEmail: null }
    const owner = await this.casesRepository.findUserById(ownerUserId)
    return { ownerName: owner?.name ?? null, ownerEmail: owner?.email ?? null }
  }

  private async resolveCreatorName(email: string | null): Promise<string | null> {
    if (!email) return null
    const user = await this.casesRepository.findUserByEmail(email)
    return user?.name ?? null
  }

  private async resolveCreatorNamesBatch(emails: (string | null)[]): Promise<Map<string, string>> {
    const uniqueEmails = [...new Set(emails.filter((e): e is string => e !== null))]
    if (uniqueEmails.length === 0) return new Map()
    const users = await this.casesRepository.findUsersByEmails(uniqueEmails)
    return new Map(users.map(u => [u.email, u.name]))
  }

  private async resolveOwnersBatch(
    ownerUserIds: (string | null)[]
  ): Promise<Map<string, { name: string; email: string }>> {
    const ids = [...new Set(ownerUserIds.filter((id): id is string => id !== null))]
    if (ids.length === 0) return new Map()
    const owners = await this.casesRepository.findUsersByIds(ids)
    return new Map(owners.map(o => [o.id, { name: o.name, email: o.email }]))
  }

  private async resolveActorLabel(user: JwtPayload): Promise<string> {
    const actorUser = await this.casesRepository.findUserNameById(user.sub)
    return formatActorLabel(actorUser?.name ?? null, user.email)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Validation Guards                                        */
  /* ---------------------------------------------------------------- */

  private async validateOwnerInTenant(ownerUserId: string, tenantId: string): Promise<void> {
    const membership = await this.casesRepository.findMembershipByUserAndTenant(
      ownerUserId,
      tenantId
    )
    if (membership?.status !== MembershipStatus.ACTIVE) {
      this.log.warn('validateOwnerInTenant', tenantId, 'Owner is not an active member', {
        ownerUserId,
        membershipStatus: membership?.status ?? null,
      })
      throw new BusinessException(
        400,
        'Assigned owner is not an active member of this tenant',
        'errors.cases.invalidOwner'
      )
    }
  }

  private async validateLinkedAlerts(linkedAlerts: string[], user: JwtPayload): Promise<void> {
    const validAlerts = await this.casesRepository.countAlertsByTenantAndIds(
      user.tenantId,
      linkedAlerts
    )
    if (validAlerts !== linkedAlerts.length) {
      this.log.warn('createCase', user.tenantId, 'Invalid linked alerts', {
        linkedAlertIds: linkedAlerts,
        validCount: validAlerts,
        actorEmail: user.email,
      })
      throw new BusinessException(
        400,
        'One or more linked alerts do not belong to this tenant',
        'errors.cases.invalidLinkedAlerts'
      )
    }
  }

  private async extractEntitiesFromLinkedAlerts(
    tenantId: string,
    alertIds: string[]
  ): Promise<void> {
    const results = await Promise.allSettled(
      alertIds.map(async alertId => {
        const alert = await this.alertsRepository.findFirstByIdAndTenant(alertId, tenantId)
        if (alert) {
          await this.entityExtractionService.extractFromAlert({
            tenantId,
            id: alert.id,
            sourceIp: alert.sourceIp,
            destinationIp: alert.destinationIp,
            agentName: alert.agentName,
            rawEvent: alert.rawEvent,
            title: alert.title,
            source: alert.source,
          })
        }
      })
    )

    const failedCount = results.filter(r => r.status === 'rejected').length
    if (failedCount > 0) {
      this.logger.warn(
        `Entity extraction failed for ${String(failedCount)}/${String(alertIds.length)} linked alerts`
      )
    }
  }

  private async validateAlertBelongsToTenant(
    alertId: string,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    const alertExists = await this.casesRepository.countAlertByTenantAndId(user.tenantId, alertId)
    if (alertExists === 0) {
      this.log.warn('linkAlert', user.tenantId, 'Alert does not belong to tenant', {
        caseId,
        alertId,
        actorEmail: user.email,
      })
      throw new BusinessException(
        400,
        'The linked alert does not belong to this tenant',
        'errors.cases.invalidLinkedAlerts'
      )
    }
  }

  private validateSelfMention(mentionIds: string[], userId: string): void {
    if (mentionIds.includes(userId)) {
      throw new BusinessException(
        400,
        'You cannot mention yourself in a comment',
        'errors.cases.cannotMentionSelf'
      )
    }
  }

  private async validateMentionedUsers(mentionIds: string[], tenantId: string): Promise<void> {
    if (mentionIds.length === 0) return
    const validMentions = await this.casesRepository.countActiveMentionMemberships(
      mentionIds,
      tenantId,
      MembershipStatus.ACTIVE
    )
    if (validMentions !== mentionIds.length) {
      throw new BusinessException(
        400,
        'One or more mentioned users are not active members of this tenant',
        'errors.cases.invalidMentionedUsers'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Case-Closed Guards                                       */
  /* ---------------------------------------------------------------- */

  private ensureNotClosed(
    status: string,
    action: string,
    user: JwtPayload,
    caseId: string,
    message: string
  ): void {
    if (status !== CaseStatus.CLOSED) return
    this.log.warn(action, user.tenantId, 'Case is closed', {
      caseId,
      status,
      actorEmail: user.email,
    })
    throw new BusinessException(400, message, 'errors.cases.alreadyClosed')
  }

  private guardClosedCaseUpdate(
    existing: CaseRecord,
    isReopening: boolean,
    dto: UpdateCaseDto,
    id: string,
    user: JwtPayload
  ): void {
    const isAssigneeChange = dto.ownerUserId !== undefined
    if (!shouldBlockClosedCaseUpdate(existing.status, isReopening, isAssigneeChange)) return
    this.log.warn('updateCase', user.tenantId, 'Update denied: case is closed', {
      caseId: id,
      actorEmail: user.email,
    })
    throw new BusinessException(400, 'Cannot update a closed case', 'errors.cases.alreadyClosed')
  }

  private guardStatusChangePermission(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    user: JwtPayload,
    id: string
  ): void {
    const isStatusChange = dto.status !== undefined && dto.status !== existing.status
    if (!isStatusChange) return
    const isAdmin = hasRoleAtLeast(user.role, UserRole.TENANT_ADMIN)
    if (isAdmin || user.sub === existing.ownerUserId) return
    this.log.warn('updateCase', user.tenantId, 'Status change denied: not owner or admin', {
      caseId: id,
      actorEmail: user.email,
    })
    throw new BusinessException(
      403,
      'Only case owner or admin can change case status',
      'errors.cases.statusChangeNotAllowed'
    )
  }

  private ensureAlertNotDuplicate(
    linkedAlerts: string[],
    alertId: string,
    user: JwtPayload,
    caseId: string
  ): void {
    if (!linkedAlerts.includes(alertId)) return
    this.log.warn('linkAlert', user.tenantId, 'Duplicate alert link attempt', {
      caseId,
      alertId,
      actorEmail: user.email,
    })
    throw new BusinessException(
      409,
      `Alert ${alertId} is already linked to this case`,
      'errors.cases.duplicateAlert'
    )
  }

  private async ensureNoDuplicateArtifact(caseId: string, dto: CreateArtifactDto): Promise<void> {
    const duplicate = await this.casesRepository.findArtifactDuplicate(caseId, dto.type, dto.value)
    if (duplicate) {
      throw new BusinessException(409, 'Duplicate artifact', 'errors.cases.duplicateArtifact')
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Entity Finders (or-throw)                                */
  /* ---------------------------------------------------------------- */

  private async findCommentOrThrow(commentId: string, caseId: string): Promise<CaseComment> {
    const comment = await this.casesRepository.findCommentByIdAndCase(commentId, caseId)
    if (!comment) {
      throw new BusinessException(404, 'Comment not found', 'errors.cases.commentNotFound')
    }
    return comment
  }

  private async findTaskOrThrow(taskId: string, caseId: string): Promise<CaseTask> {
    const task = await this.casesRepository.findTaskByIdAndCase(taskId, caseId)
    if (!task) {
      throw new BusinessException(404, 'Task not found', 'errors.cases.taskNotFound')
    }
    return task
  }

  private async findArtifactOrThrow(artifactId: string, caseId: string): Promise<CaseArtifact> {
    const artifact = await this.casesRepository.findArtifactByIdAndCase(artifactId, caseId)
    if (!artifact) {
      throw new BusinessException(404, 'Artifact not found', 'errors.cases.artifactNotFound')
    }
    return artifact
  }

  private ensureCommentAuthorOrAdmin(authorId: string, user: JwtPayload, action: string): void {
    if (authorId === user.sub || hasRoleAtLeast(user.role, UserRole.TENANT_ADMIN)) return
    const verb = action === 'edit' ? 'edit' : 'delete'
    throw new BusinessException(
      403,
      `You can only ${verb} your own comments`,
      `errors.cases.comment${action === 'edit' ? 'Edit' : 'Delete'}NotAllowed`
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Transaction Executors                                    */
  /* ---------------------------------------------------------------- */

  private async executeCreateCase(
    dto: CreateCaseDto,
    linkedAlerts: string[],
    user: JwtPayload
  ): Promise<NonNullable<Awaited<ReturnType<CasesRepository['createCaseTransaction']>>>> {
    const caseData = buildCreateCasePayload(dto, linkedAlerts, user.tenantId, user.email)
    const alertTimeline = buildAlertLinkedTimelineEntry(linkedAlerts, user.email)

    const result = await this.casesRepository.createCaseTransaction(
      caseData,
      { type: CaseTimelineType.CREATED, actor: user.email, description: '' },
      alertTimeline
    )

    if (!result) {
      throw new BusinessException(
        400,
        'The specified cycle does not belong to this tenant',
        'errors.cases.invalidCycle'
      )
    }

    return result
  }

  private async executeUpdateCase(
    id: string,
    tenantId: string,
    updateData: Record<string, unknown>,
    timeline: { type: string; actor: string; description: string }
  ): Promise<NonNullable<Awaited<ReturnType<CasesRepository['updateCaseTransaction']>>>> {
    const result = await this.casesRepository.updateCaseTransaction(
      id,
      tenantId,
      updateData,
      timeline
    )

    if (!result) {
      this.log.warn('updateCase', tenantId, 'Case not found during update', { caseId: id })
      throw new BusinessException(404, `Case ${id} not found`, 'errors.cases.notFound')
    }

    return result
  }

  private async executeLinkAlert(
    caseId: string,
    user: JwtPayload,
    existingAlerts: string[],
    dto: LinkAlertDto
  ): Promise<NonNullable<Awaited<ReturnType<CasesRepository['linkAlertTransaction']>>>> {
    const result = await this.casesRepository.linkAlertTransaction(
      caseId,
      user.tenantId,
      [...existingAlerts, dto.alertId],
      {
        type: CaseTimelineType.ALERT_LINKED,
        actor: user.email,
        description: JSON.stringify({
          key: 'alertLinked',
          params: { alertId: dto.alertId, indexName: dto.indexName },
        }),
      }
    )

    if (!result) {
      this.log.warn('linkAlert', user.tenantId, 'Case not found during link alert', { caseId })
      throw new BusinessException(404, `Case ${caseId} not found`, 'errors.cases.notFound')
    }

    return result
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Timeline Description Builders                            */
  /* ---------------------------------------------------------------- */

  private async buildUpdateTimelineDescription(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    isReopening: boolean,
    actorLabel: string
  ): Promise<string> {
    const isStatusChange = dto.status !== undefined && dto.status !== existing.status

    if (isReopening || isStatusChange) {
      return buildStatusTimelineDescription(isReopening, dto.status, actorLabel)
    }
    if (dto.ownerUserId !== undefined) {
      return this.buildOwnerChangeDescription(dto, existing, actorLabel)
    }
    if (dto.cycleId !== undefined) {
      return this.buildCycleChangeDescription(dto.cycleId, actorLabel)
    }
    return buildFieldChangeDescription(dto, existing, actorLabel)
  }

  private async buildOwnerChangeDescription(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    actorLabel: string
  ): Promise<string> {
    const previousOwner = existing.ownerUserId
      ? await this.casesRepository.findUserById(existing.ownerUserId)
      : null
    const previousLabel = previousOwner ? formatUserLabel(previousOwner, '') : null
    const newOwner = dto.ownerUserId
      ? await this.casesRepository.findUserById(dto.ownerUserId)
      : null
    const newLabel = newOwner ? formatUserLabel(newOwner, dto.ownerUserId ?? '') : null

    return buildAssigneeTimelineDescription(dto, previousLabel, newLabel, actorLabel)
  }

  private async buildCycleChangeDescription(
    cycleId: string | null | undefined,
    actorLabel: string
  ): Promise<string> {
    if (cycleId === null) {
      return buildCycleTimelineDescription(cycleId, null, actorLabel)
    }
    const cycle = cycleId ? await this.casesRepository.findCaseCycleById(cycleId) : null
    return buildCycleTimelineDescription(cycleId, cycle?.name ?? null, actorLabel)
  }

  private async buildAssignTimelineDescription(
    newOwnerId: string | null,
    previousOwnerId: string | null,
    actorLabel: string
  ): Promise<string> {
    const previousOwner = previousOwnerId
      ? await this.casesRepository.findUserById(previousOwnerId)
      : null
    const previousLabel = previousOwner ? formatUserLabel(previousOwner, '') : null
    const newOwner = newOwnerId ? await this.casesRepository.findUserById(newOwnerId) : null
    const newLabel = newOwner && newOwnerId ? formatUserLabel(newOwner, newOwnerId) : null

    return buildAssigneeTimelineDescription(
      { ownerUserId: newOwnerId },
      previousLabel,
      newLabel,
      actorLabel
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Assignment Execution                                     */
  /* ---------------------------------------------------------------- */

  private async executeAssignCase(
    id: string,
    ownerUserId: string | null,
    existing: CaseRecord,
    user: JwtPayload
  ): Promise<NonNullable<Awaited<ReturnType<CasesRepository['updateCaseTransaction']>>>> {
    const actorLabel = await this.resolveActorLabel(user)
    const timelineDescription = await this.buildAssignTimelineDescription(
      ownerUserId,
      existing.ownerUserId,
      actorLabel
    )

    return this.executeUpdateCase(
      id,
      user.tenantId,
      { ownerUserId },
      {
        type: CaseTimelineType.UPDATED,
        actor: user.email,
        description: timelineDescription,
      }
    )
  }

  private async notifyAssignmentChange(
    ownerUserId: string | null,
    existing: CaseRecord,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    if (ownerUserId && ownerUserId !== existing.ownerUserId) {
      await this.notificationsService.notifyCaseActivity(
        user.tenantId,
        caseId,
        existing.caseNumber,
        ownerUserId,
        NotificationType.CASE_ASSIGNED,
        JSON.stringify({ key: 'caseAssignedMessage', params: { caseRef: existing.caseNumber } }),
        user.sub,
        user.email
      )
    }

    if (!ownerUserId && existing.ownerUserId) {
      await this.notificationsService.notifyCaseUnassigned(
        user.tenantId,
        caseId,
        existing.caseNumber,
        existing.ownerUserId,
        user.sub,
        user.email
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Notification Dispatchers                                 */
  /* ---------------------------------------------------------------- */

  private async sendUpdateNotifications(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    await this.notifyAssigneeChanges(dto, existing, user, caseId)
    await this.notifyStatusChange(dto, existing, user, caseId)
    await this.notifyCycleChange(dto, existing, user, caseId)
    await this.notifyFieldChanges(dto, existing, user, caseId)
  }

  private async notifyAssigneeChanges(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    if (dto.ownerUserId === undefined || dto.ownerUserId === existing.ownerUserId) return
    if (dto.ownerUserId !== null) {
      await this.notificationsService.notifyCaseAssigned(
        user.tenantId,
        caseId,
        existing.caseNumber,
        dto.ownerUserId,
        user.sub,
        user.email
      )
    }
    if (existing.ownerUserId) {
      await this.notificationsService.notifyCaseUnassigned(
        user.tenantId,
        caseId,
        existing.caseNumber,
        existing.ownerUserId,
        user.sub,
        user.email
      )
    }
  }

  private async notifyStatusChange(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    if (dto.status === undefined || dto.status === existing.status) return
    await this.notificationsService.notifyCaseActivity(
      user.tenantId,
      caseId,
      existing.caseNumber,
      existing.ownerUserId,
      NotificationType.CASE_STATUS_CHANGED,
      JSON.stringify({
        key: 'caseStatusChangedMessage',
        params: { caseRef: existing.caseNumber, status: dto.status },
      }),
      user.sub,
      user.email
    )
  }

  private async notifyCycleChange(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    if (dto.cycleId === undefined || dto.cycleId === existing.cycleId) return
    await this.notificationsService.notifyCaseActivity(
      user.tenantId,
      caseId,
      existing.caseNumber,
      existing.ownerUserId,
      NotificationType.CASE_UPDATED,
      buildCycleNotificationMessage(existing.caseNumber, dto.cycleId),
      user.sub,
      user.email
    )
  }

  private async notifyFieldChanges(
    dto: UpdateCaseDto,
    existing: CaseRecord,
    user: JwtPayload,
    caseId: string
  ): Promise<void> {
    const isStatusChange = dto.status !== undefined && dto.status !== existing.status
    if (!hasFieldChangesOnly(dto, isStatusChange)) return
    await this.notificationsService.notifyCaseActivity(
      user.tenantId,
      caseId,
      existing.caseNumber,
      existing.ownerUserId,
      NotificationType.CASE_UPDATED,
      JSON.stringify({
        key: 'caseUpdatedMessage',
        params: { caseRef: existing.caseNumber, detail: 'has been updated' },
      }),
      user.sub,
      user.email
    )
  }

  private async sendCommentNotifications(
    user: JwtPayload,
    caseId: string,
    existing: CaseRecord,
    commentId: string,
    mentionIds: string[],
    body: string
  ): Promise<void> {
    await this.sendMentionNotifications(user, caseId, commentId, mentionIds)
    await this.notifyCaseCommentAdded(user, caseId, existing, body)
  }

  private async sendMentionNotifications(
    user: JwtPayload,
    caseId: string,
    commentId: string,
    mentionIds: string[]
  ): Promise<void> {
    if (mentionIds.length === 0) return
    await this.notificationsService.createMentionNotifications(
      user.tenantId,
      caseId,
      commentId,
      mentionIds,
      user
    )
  }

  private async notifyCaseCommentAdded(
    user: JwtPayload,
    caseId: string,
    existing: CaseRecord,
    body: string
  ): Promise<void> {
    await this.notificationsService.notifyCaseActivity(
      user.tenantId,
      caseId,
      existing.caseNumber,
      existing.ownerUserId,
      NotificationType.CASE_COMMENT_ADDED,
      JSON.stringify({
        key: 'caseCommentMessage',
        params: { caseRef: existing.caseNumber, content: truncateBody(body) },
      }),
      user.sub,
      user.email
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Task Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeCreateTask(
    caseId: string,
    dto: CreateTaskDto,
    user: JwtPayload
  ): Promise<CaseTask> {
    const task = await this.casesRepository.createTask({
      caseId,
      title: dto.title,
      status: dto.status ?? CaseTaskStatus.PENDING,
      assignee: dto.assignee ?? null,
    })
    const actorLabel = await this.resolveActorLabel(user)
    await this.casesRepository.createTimeline({
      caseId,
      type: CaseTimelineType.UPDATED,
      actor: user.email,
      description: JSON.stringify({
        key: 'taskAdded',
        params: { taskTitle: dto.title, actorLabel },
      }),
    })
    return task
  }

  private async notifyTaskAdded(
    user: JwtPayload,
    caseId: string,
    caseRecord: CaseRecord,
    taskTitle: string
  ): Promise<void> {
    await this.notificationsService.notifyCaseActivity(
      user.tenantId,
      caseId,
      caseRecord.caseNumber,
      caseRecord.ownerUserId,
      NotificationType.CASE_TASK_ADDED,
      JSON.stringify({
        key: 'caseTaskMessage',
        params: { caseRef: caseRecord.caseNumber, taskTitle },
      }),
      user.sub,
      user.email
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Comment Helpers                                          */
  /* ---------------------------------------------------------------- */

  private async executeAddComment(
    caseId: string,
    user: JwtPayload,
    body: string,
    mentionIds: string[]
  ): Promise<AddCommentResult> {
    return this.casesRepository.addCommentTransaction(caseId, user.sub, body, mentionIds, {
      type: CaseTimelineType.COMMENT_ADDED,
      actor: user.email,
      description: JSON.stringify({
        key: 'commentAdded',
        params: { content: truncateBody(body) },
      }),
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Artifact Helpers                                         */
  /* ---------------------------------------------------------------- */

  private async executeCreateArtifact(
    caseId: string,
    dto: CreateArtifactDto,
    user: JwtPayload
  ): Promise<CaseArtifact> {
    const artifact = await this.casesRepository.createArtifact({
      caseId,
      type: dto.type,
      value: dto.value,
      source: dto.source ?? 'manual',
    })
    const actorLabel = await this.resolveActorLabel(user)
    await this.casesRepository.createTimeline({
      caseId,
      type: CaseTimelineType.UPDATED,
      actor: user.email,
      description: JSON.stringify({
        key: 'artifactAdded',
        params: { artifactValue: `${dto.type}:${dto.value}`, actorLabel },
      }),
    })
    return artifact
  }

  private triggerArtifactEntityExtraction(tenantId: string, dto: CreateArtifactDto): void {
    this.entityExtractionService
      .extractFromArtifact({
        tenantId,
        type: dto.type,
        value: dto.value,
        source: dto.source ?? 'manual',
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        this.logger.warn(
          `Entity extraction failed for artifact ${dto.type}:${dto.value}: ${message}`
        )
      })
  }

  private async notifyArtifactAdded(
    user: JwtPayload,
    caseId: string,
    caseRecord: CaseRecord,
    dto: CreateArtifactDto
  ): Promise<void> {
    await this.notificationsService.notifyCaseActivity(
      user.tenantId,
      caseId,
      caseRecord.caseNumber,
      caseRecord.ownerUserId,
      NotificationType.CASE_ARTIFACT_ADDED,
      JSON.stringify({
        key: 'caseArtifactMessage',
        params: { caseRef: caseRecord.caseNumber, artifactValue: `${dto.type}:${dto.value}` },
      }),
      user.sub,
      user.email
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Comment Mapping                                          */
  /* ---------------------------------------------------------------- */

  private async mapCommentToResponse(
    comment: AddCommentResult,
    _requestUserId: string
  ): Promise<CaseCommentResponse> {
    const allUserIds = [comment.authorId, ...comment.mentions.map(m => m.userId)]
    const users = await this.casesRepository.findUsersByIds([...new Set(allUserIds)])
    const userMap = new Map(users.map(u => [u.id, u]))
    return mapCommentToResponseShape(comment, userMap)
  }

  private async buildCommentUserMap(
    comments: Array<{ authorId: string; mentions: Array<{ userId: string }> }>
  ): Promise<Map<string, { id: string; name: string; email: string }>> {
    const allUserIds = collectCommentUserIds(comments)
    if (allUserIds.length === 0) return new Map()
    const users = await this.casesRepository.findUsersByIds(allUserIds)
    return new Map(users.map(u => [u.id, u]))
  }
}
