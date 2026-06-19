import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common'
import { IncidentsRepository } from './incidents.repository'
import {
  buildIncidentWhereClause,
  buildIncidentOrderBy,
  buildIncidentUpdateData,
  describeIncidentChanges,
  buildAssigneesMap,
  buildCreatorsMap,
  mapIncidentListItem,
} from './incidents.utilities'
import { AppLogFeature, IncidentStatus, SortOrder } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { daysAgo } from '../../common/utils/date-time.utility'
import { AgentEventListenerService } from '../ai/orchestrator/agent-event-listener.service'
import type { AddTimelineEntryDto } from './dto/add-timeline-entry.dto'
import type { CreateIncidentDto } from './dto/create-incident.dto'
import type { UpdateIncidentDto } from './dto/update-incident.dto'
import type {
  IncidentRecord,
  IncidentStats,
  IncidentWithTenant,
  IncidentWithTenantAndTimeline,
  PaginatedIncidents,
} from './incidents.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { IncidentTimeline } from '@prisma/client'

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: IncidentsRepository,
    private readonly appLogger: AppLoggerService,
    @Optional()
    @Inject(forwardRef(() => AgentEventListenerService))
    private readonly agentEventListener: AgentEventListenerService | null
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.INCIDENTS, 'IncidentsService')
  }

  /* ---------------------------------------------------------------- */
  /* RESOLVE HELPERS                                                    */
  /* ---------------------------------------------------------------- */

  private async resolveAssignee(
    assigneeId: string | null
  ): Promise<{ assigneeName: string | null; assigneeEmail: string | null }> {
    if (!assigneeId) {
      return { assigneeName: null, assigneeEmail: null }
    }
    const assignee = await this.repository.findUserById(assigneeId)
    return {
      assigneeName: assignee?.name ?? null,
      assigneeEmail: assignee?.email ?? null,
    }
  }

  private async resolveCreatorName(email: string | null): Promise<string | null> {
    if (!email) return null
    const user = await this.repository.findUserByEmail(email)
    return user?.name ?? null
  }

  private async resolveAssigneesBatch(
    assigneeIds: (string | null)[]
  ): Promise<Map<string, { name: string; email: string }>> {
    const ids = [...new Set(assigneeIds.filter((id): id is string => id !== null))]
    if (ids.length === 0) return new Map()
    const assignees = await this.repository.findUsersByIds(ids)
    return buildAssigneesMap(assignees)
  }

  private async resolveCreatorNamesBatch(emails: (string | null)[]): Promise<Map<string, string>> {
    const uniqueEmails = [...new Set(emails.filter((e): e is string => e !== null))]
    if (uniqueEmails.length === 0) return new Map()
    const users = await this.repository.findUsersByEmails(uniqueEmails)
    return buildCreatorsMap(users)
  }

  /* ---------------------------------------------------------------- */
  /* LIST (paginated, tenant-scoped)                                   */
  /* ---------------------------------------------------------------- */

  async listIncidents(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    status?: string,
    severity?: string,
    category?: string,
    query?: string
  ): Promise<PaginatedIncidents> {
    this.log.entry('listIncidents', tenantId, { page, limit, status, severity, category, query })

    const where = buildIncidentWhereClause(tenantId, { status, severity, category, query })

    const [incidents, total] = await Promise.all([
      this.repository.findManyWithTenant({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: buildIncidentOrderBy(sortBy, sortOrder),
      }),
      this.repository.count(where),
    ])

    const data = await this.enrichIncidentListItems(incidents)

    this.log.success('listIncidents', tenantId, { total, returnedCount: data.length })

    return { data, pagination: buildPaginationMeta(page, limit, total) }
  }

  private async enrichIncidentListItems(
    incidents: IncidentWithTenant[]
  ): Promise<ReturnType<typeof mapIncidentListItem>[]> {
    const [assigneesMap, creatorsMap] = await Promise.all([
      this.resolveAssigneesBatch(incidents.map(index => index.assigneeId)),
      this.resolveCreatorNamesBatch(incidents.map(index => index.createdBy)),
    ])
    return incidents.map(index => mapIncidentListItem(index, assigneesMap, creatorsMap))
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getIncidentById(id: string, tenantId: string): Promise<IncidentRecord> {
    const incident = await this.repository.findFirstWithRelations({ id, tenantId })

    if (!incident) {
      this.log.warn('getIncidentById', tenantId, 'Incident not found', { incidentId: id })
      throw new BusinessException(404, `Incident ${id} not found`, 'errors.incidents.notFound')
    }

    const [{ assigneeName, assigneeEmail }, createdByName] = await Promise.all([
      this.resolveAssignee(incident.assigneeId),
      this.resolveCreatorName(incident.createdBy),
    ])

    return {
      ...incident,
      assigneeName,
      assigneeEmail,
      createdByName,
      tenantName: incident.tenant.name,
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createIncident(dto: CreateIncidentDto, user: JwtPayload): Promise<IncidentRecord> {
    const linkedAlertIds = dto.linkedAlertIds ?? []

    if (dto.assigneeId) {
      await this.validateAssigneeInTenant(dto.assigneeId, user.tenantId)
    }
    if (linkedAlertIds.length > 0) {
      await this.validateLinkedAlerts(linkedAlertIds, user)
    }
    if (dto.linkedCaseId) {
      await this.validateLinkedCase(dto.linkedCaseId, user.tenantId)
    }

    const result = await this.executeCreateIncident(dto, linkedAlertIds, user)
    this.log.success('createIncident', user.tenantId, {
      incidentId: result.id,
      incidentNumber: result.incidentNumber,
      severity: result.severity,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    return this.enrichIncidentRecord(result)
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updateIncident(
    id: string,
    dto: UpdateIncidentDto,
    user: JwtPayload
  ): Promise<IncidentRecord> {
    const existing = await this.getIncidentById(id, user.tenantId)
    this.guardClosedIncidentUpdate(existing, dto, id, user)

    if (dto.assigneeId) {
      await this.validateAssigneeInTenant(dto.assigneeId, user.tenantId)
    }

    const actorLabel = await this.resolveActorLabel(user)
    const timelineEvent = describeIncidentChanges(dto, existing, actorLabel)
    const updateData = buildIncidentUpdateData(dto, existing.status, existing.resolvedAt)

    const result = await this.executeUpdateIncident(
      id,
      user.tenantId,
      updateData,
      timelineEvent,
      user.email
    )
    this.log.success('updateIncident', user.tenantId, {
      incidentId: id,
      actorEmail: user.email,
      actorUserId: user.sub,
    })

    // Fire-and-forget — notify AI when incident status changes
    if (dto.status && dto.status !== existing.status) {
      this.dispatchIncidentStatusChanged(user.tenantId, id, dto.status)
    }

    return this.enrichIncidentRecord(result)
  }

  /* ---------------------------------------------------------------- */
  /* CHANGE STATUS                                                     */
  /* ---------------------------------------------------------------- */

  async changeStatus(
    id: string,
    status: UpdateIncidentDto['status'],
    user: JwtPayload
  ): Promise<IncidentRecord> {
    this.log.entry('changeStatus', user.tenantId, {
      incidentId: id,
      newStatus: status,
      actorEmail: user.email,
    })

    const dto: UpdateIncidentDto = { status }
    return this.updateIncident(id, dto, user)
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deleteIncident(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    const existing = await this.getIncidentById(id, tenantId)

    await this.repository.deleteMany({ id, tenantId })

    this.log.success('deleteIncident', tenantId, {
      incidentNumber: existing.incidentNumber,
      actorEmail: actor,
      incidentId: id,
    })

    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* TIMELINE                                                          */
  /* ---------------------------------------------------------------- */

  async getIncidentTimeline(id: string, tenantId: string): Promise<IncidentTimeline[]> {
    this.log.entry('getIncidentTimeline', tenantId, { incidentId: id })

    // Verify incident exists and belongs to tenant
    await this.getIncidentById(id, tenantId)

    const timeline = await this.repository.findManyTimeline({
      where: { incidentId: id },
      orderBy: { timestamp: SortOrder.DESC },
    })

    this.log.success('getIncidentTimeline', tenantId, {
      incidentId: id,
      entryCount: timeline.length,
    })

    return timeline
  }

  async addTimelineEntry(
    id: string,
    dto: AddTimelineEntryDto,
    user: JwtPayload
  ): Promise<IncidentTimeline> {
    // Verify incident exists and belongs to tenant
    await this.getIncidentById(id, user.tenantId)

    const entry = await this.repository.createTimelineEntry({
      incidentId: id,
      event: dto.event,
      actorType: dto.actorType ?? 'user',
      actorName: user.email,
    })

    this.log.success('addTimelineEntry', user.tenantId, {
      incidentId: id,
      timelineEntryId: entry.id,
      actorEmail: user.email,
    })

    return entry
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getIncidentStats(tenantId: string): Promise<IncidentStats> {
    this.log.entry('getIncidentStats', tenantId)

    const thirtyDaysAgo = daysAgo(30)

    const [open, inProgress, contained, resolved30d, avgResolveHours] = await Promise.all([
      this.repository.countByStatus(tenantId, IncidentStatus.OPEN),
      this.repository.countByStatus(tenantId, IncidentStatus.IN_PROGRESS),
      this.repository.countByStatus(tenantId, IncidentStatus.CONTAINED),
      this.repository.countResolvedSince(
        tenantId,
        [IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
        thirtyDaysAgo
      ),
      this.repository.getAvgResolveHours(tenantId),
    ])

    this.log.success('getIncidentStats', tenantId, {
      open,
      inProgress,
      contained,
      resolved30d,
      avgResolveHours,
    })

    return {
      open,
      inProgress,
      contained,
      resolved30d,
      avgResolveHours,
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE HELPERS                                                   */
  /* ---------------------------------------------------------------- */

  private async validateAssigneeInTenant(assigneeId: string, tenantId: string): Promise<void> {
    const membership = await this.repository.findActiveTenantMembership(assigneeId, tenantId)

    if (!membership) {
      this.log.warn(
        'validateAssigneeInTenant',
        tenantId,
        'Invalid assignee: user is not an active member of the tenant',
        { assigneeId }
      )
      throw new BusinessException(
        400,
        'Assignee is not an active member of this tenant',
        'errors.incidents.invalidAssignee'
      )
    }
  }

  private async validateLinkedAlerts(linkedAlertIds: string[], user: JwtPayload): Promise<void> {
    const validAlerts = await this.repository.countAlertsByIdsAndTenant(
      linkedAlertIds,
      user.tenantId
    )
    if (validAlerts !== linkedAlertIds.length) {
      this.log.warn(
        'createIncident',
        user.tenantId,
        'Invalid linked alerts: some do not belong to tenant',
        {
          linkedAlertIds,
          validCount: validAlerts,
          actorEmail: user.email,
        }
      )
      throw new BusinessException(
        400,
        'One or more linked alerts do not belong to this tenant',
        'errors.incidents.invalidLinkedAlerts'
      )
    }
  }

  private async validateLinkedCase(linkedCaseId: string, tenantId: string): Promise<void> {
    const caseExists = await this.repository.countCasesByIdAndTenant(linkedCaseId, tenantId)
    if (caseExists === 0) {
      throw new BusinessException(
        400,
        'Linked case does not belong to this tenant',
        'errors.incidents.invalidLinkedCase'
      )
    }
  }

  private guardClosedIncidentUpdate(
    existing: IncidentRecord,
    dto: UpdateIncidentDto,
    id: string,
    user: JwtPayload
  ): void {
    if (
      existing.status === IncidentStatus.CLOSED &&
      dto.status !== IncidentStatus.OPEN &&
      dto.status !== IncidentStatus.IN_PROGRESS
    ) {
      this.log.warn('updateIncident', user.tenantId, 'Update incident denied: incident is closed', {
        incidentId: id,
        actorEmail: user.email,
      })
      throw new BusinessException(
        400,
        'Cannot update a closed incident',
        'errors.incidents.alreadyClosed'
      )
    }
  }

  private async resolveActorLabel(user: JwtPayload): Promise<string> {
    const actorUser = await this.repository.findUserNameById(user.sub)
    return actorUser ? `${actorUser.name} (${user.email})` : user.email
  }

  private async executeCreateIncident(
    dto: CreateIncidentDto,
    linkedAlertIds: string[],
    user: JwtPayload
  ): Promise<IncidentWithTenantAndTimeline> {
    return this.repository.createIncidentWithTimeline({
      data: {
        tenantId: user.tenantId,
        incidentNumber: '',
        title: dto.title,
        description: dto.description ?? null,
        severity: dto.severity,
        status: IncidentStatus.OPEN,
        category: dto.category,
        assigneeId: dto.assigneeId ?? null,
        linkedAlertIds,
        linkedCaseId: dto.linkedCaseId ?? null,
        mitreTactics: dto.mitreTactics ?? [],
        mitreTechniques: dto.mitreTechniques ?? [],
        createdBy: user.email,
      },
      timelineEvent: `Incident created by ${user.email}`,
      actorEmail: user.email,
    })
  }

  private async executeUpdateIncident(
    id: string,
    tenantId: string,
    updateData: Record<string, unknown>,
    timelineEvent: string,
    actorEmail: string
  ): Promise<IncidentWithTenantAndTimeline> {
    const result = await this.repository.updateIncidentWithTimeline({
      id,
      tenantId,
      updateData,
      timelineEvent,
      actorEmail,
    })

    if (!result) {
      this.log.warn('updateIncident', tenantId, 'Incident not found during update transaction', {
        incidentId: id,
      })
      throw new BusinessException(404, `Incident ${id} not found`, 'errors.incidents.notFound')
    }

    return result
  }

  private async enrichIncidentRecord(
    result: IncidentWithTenantAndTimeline
  ): Promise<IncidentRecord> {
    const [{ assigneeName, assigneeEmail }, createdByName] = await Promise.all([
      this.resolveAssignee(result.assigneeId),
      this.resolveCreatorName(result.createdBy),
    ])
    return { ...result, assigneeName, assigneeEmail, createdByName, tenantName: result.tenant.name }
  }

  /**
   * Fire-and-forget: notify AI agent when incident status changes.
   * Never blocks the update flow and never throws.
   */
  private dispatchIncidentStatusChanged(
    tenantId: string,
    incidentId: string,
    newStatus: string
  ): void {
    if (!this.agentEventListener) return
    // Fire-and-forget — don't block incident update on AI
    void this.agentEventListener.onIncidentStatusChanged(tenantId, incidentId, newStatus)
  }
}
