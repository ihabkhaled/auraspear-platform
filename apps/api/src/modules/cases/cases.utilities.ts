import { CASE_SORT_FIELDS } from './cases.constants'
import { CaseStatus, CaseTaskStatus, CaseTimelineType } from '../../common/enums'
import { diffMs, nowDate, toIso } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  CaseCommentResponse,
  CaseListItemInput,
  CaseListItemOutput,
  CreateCasePayload,
  TimelineEntry,
} from './cases.types'
import type { CreateCaseDto } from './dto/create-case.dto'
import type { UpdateCaseDto } from './dto/update-case.dto'
import type { CaseSeverity, Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildCaseWhereClause(
  tenantId: string,
  filters: {
    status?: string
    severity?: string
    query?: string
    cycleId?: string
    ownerUserId?: string
  }
): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = { tenantId }

  if (filters.status) {
    where.status = filters.status as CaseStatus
  }

  if (filters.severity) {
    where.severity = filters.severity as CaseSeverity
  }

  if (filters.cycleId === 'none') {
    where.cycleId = null
  } else if (filters.cycleId) {
    where.cycleId = filters.cycleId
  }

  if (filters.ownerUserId) {
    where.ownerUserId = filters.ownerUserId
  }

  if (filters.query && filters.query.trim().length > 0) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { caseNumber: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildCaseOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.CaseOrderByWithRelationInput {
  return buildOrderBy(
    CASE_SORT_FIELDS,
    'createdAt',
    sortBy,
    sortOrder
  ) as Prisma.CaseOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildCaseUpdateData(
  dto: UpdateCaseDto,
  isReopening: boolean
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}
  if (dto.title !== undefined) updateData['title'] = dto.title
  if (dto.description !== undefined) updateData['description'] = dto.description
  if (dto.severity !== undefined) updateData['severity'] = dto.severity
  if (dto.status !== undefined) updateData['status'] = dto.status
  if (dto.ownerUserId !== undefined) updateData['ownerUserId'] = dto.ownerUserId
  if (dto.cycleId !== undefined) updateData['cycleId'] = dto.cycleId
  if (dto.status === CaseStatus.CLOSED) updateData['closedAt'] = nowDate()
  if (isReopening) updateData['closedAt'] = null
  return updateData
}

/* ---------------------------------------------------------------- */
/* TIMELINE DESCRIPTION BUILDING                                     */
/* ---------------------------------------------------------------- */

export function buildFieldChangeDescription(
  dto: UpdateCaseDto,
  existing: { title: string; description: string | null; severity: string },
  actorLabel: string
): string {
  if (dto.title !== undefined && dto.title !== existing.title) {
    return JSON.stringify({ key: 'caseTitleChanged', params: { actorLabel, newTitle: dto.title } })
  }
  if (dto.severity !== undefined && dto.severity !== existing.severity) {
    return JSON.stringify({
      key: 'caseSeverityChanged',
      params: { actorLabel, oldSeverity: existing.severity, newSeverity: dto.severity },
    })
  }
  if (dto.description !== undefined && dto.description !== existing.description) {
    return JSON.stringify({ key: 'caseDescriptionUpdated', params: { actorLabel } })
  }
  return JSON.stringify({ key: 'caseUpdatedGeneric', params: { actorLabel } })
}

/* ---------------------------------------------------------------- */
/* STATS CALCULATION                                                 */
/* ---------------------------------------------------------------- */

export function calculateAvgResolutionHours(
  closedCases: Array<{ closedAt: Date | null; createdAt: Date }>
): number | null {
  if (closedCases.length === 0) return null

  let totalHours = 0
  let count = 0
  for (const c of closedCases) {
    if (c.closedAt) {
      totalHours += diffMs(c.createdAt, c.closedAt) / (1000 * 60 * 60)
      count++
    }
  }

  if (count === 0) return null
  return Math.round((totalHours / count) * 10) / 10
}

/* ---------------------------------------------------------------- */
/* COMMENT → RESPONSE MAPPING                                        */
/* ---------------------------------------------------------------- */

export function mapCommentToResponseShape(
  comment: {
    id: string
    caseId: string
    authorId: string
    body: string
    isEdited: boolean
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    mentions: Array<{ userId: string }>
  },
  userMap: Map<string, { id: string; name: string; email: string }>
): CaseCommentResponse {
  const author = userMap.get(comment.authorId)

  return {
    id: comment.id,
    caseId: comment.caseId,
    body: comment.body,
    isEdited: comment.isEdited,
    isDeleted: comment.isDeleted,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.authorId,
      name: author?.name ?? 'Unknown',
      email: author?.email ?? '',
    },
    mentions: comment.mentions.map(m => {
      const mentionUser = userMap.get(m.userId)
      return {
        id: m.userId,
        name: mentionUser?.name ?? 'Unknown',
        email: mentionUser?.email ?? '',
      }
    }),
  }
}

/* ---------------------------------------------------------------- */
/* CASE LIST ITEM MAPPING                                            */
/* ---------------------------------------------------------------- */

export function mapCaseListItem(
  caseItem: CaseListItemInput,
  ownersMap: Map<string, { name: string; email: string }>,
  creatorsMap: Map<string, string>
): CaseListItemOutput {
  const owner = caseItem.ownerUserId ? ownersMap.get(caseItem.ownerUserId) : undefined
  return {
    ...caseItem,
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
    createdByName: caseItem.createdBy ? (creatorsMap.get(caseItem.createdBy) ?? null) : null,
    tenantName: caseItem.tenant.name,
  }
}

/* ---------------------------------------------------------------- */
/* REOPEN / CLOSED GUARD HELPERS                                     */
/* ---------------------------------------------------------------- */

export function isReopeningCase(existingStatus: string, newStatus: string | undefined): boolean {
  return (
    existingStatus === CaseStatus.CLOSED &&
    newStatus !== undefined &&
    newStatus !== CaseStatus.CLOSED
  )
}

export function shouldBlockClosedCaseUpdate(
  existingStatus: string,
  isReopening: boolean,
  isAssigneeChange: boolean
): boolean {
  return existingStatus === CaseStatus.CLOSED && !isReopening && !isAssigneeChange
}

/* ---------------------------------------------------------------- */
/* TIMELINE TYPE RESOLUTION                                          */
/* ---------------------------------------------------------------- */

export function resolveTimelineType(isStatusChange: boolean): string {
  return isStatusChange ? CaseTimelineType.STATUS_CHANGED : CaseTimelineType.UPDATED
}

/* ---------------------------------------------------------------- */
/* ASSIGNEE TIMELINE DESCRIPTION                                     */
/* ---------------------------------------------------------------- */

export function buildAssigneeTimelineDescription(
  dto: { ownerUserId?: string | null },
  previousOwnerLabel: string | null,
  newOwnerLabel: string | null,
  actorLabel: string
): string {
  if (dto.ownerUserId === null) {
    if (previousOwnerLabel) {
      return JSON.stringify({
        key: 'assigneeRemovedWas',
        params: { previousOwnerLabel, actorLabel },
      })
    }
    return JSON.stringify({ key: 'assigneeRemoved', params: { actorLabel } })
  }

  const ownerLabel = newOwnerLabel ?? dto.ownerUserId ?? 'unknown'
  if (previousOwnerLabel) {
    return JSON.stringify({
      key: 'reassignedTo',
      params: { ownerLabel, previousOwnerLabel, actorLabel },
    })
  }
  return JSON.stringify({ key: 'assignedTo', params: { ownerLabel, actorLabel } })
}

/* ---------------------------------------------------------------- */
/* CYCLE TIMELINE DESCRIPTION                                        */
/* ---------------------------------------------------------------- */

export function buildCycleTimelineDescription(
  cycleId: string | null | undefined,
  cycleName: string | null,
  actorLabel: string
): string {
  if (cycleId === null) {
    return JSON.stringify({ key: 'removedFromCycle', params: { actorLabel } })
  }
  return JSON.stringify({
    key: 'addedToCycle',
    params: { cycleName: cycleName ?? cycleId ?? '', actorLabel },
  })
}

/* ---------------------------------------------------------------- */
/* STATUS TIMELINE DESCRIPTION                                       */
/* ---------------------------------------------------------------- */

export function buildStatusTimelineDescription(
  isReopening: boolean,
  newStatus: string | undefined,
  actorLabel: string
): string {
  if (isReopening) {
    return JSON.stringify({ key: 'caseReopened', params: { actorLabel } })
  }
  return JSON.stringify({ key: 'statusChanged', params: { status: newStatus ?? '', actorLabel } })
}

/* ---------------------------------------------------------------- */
/* TASK UPDATE DATA                                                  */
/* ---------------------------------------------------------------- */

export function buildTaskUpdateData(dto: {
  title?: string
  status?: string
  assignee?: string | null
}): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}
  if (dto.title !== undefined) updateData['title'] = dto.title
  if (dto.status !== undefined) updateData['status'] = dto.status
  if (dto.assignee !== undefined) updateData['assignee'] = dto.assignee
  return updateData
}

/* ---------------------------------------------------------------- */
/* TASK TIMELINE DESCRIPTION                                         */
/* ---------------------------------------------------------------- */

export function buildTaskStatusTimelineDescription(
  taskTitle: string,
  newStatus: string,
  actorLabel: string
): string {
  if (newStatus === CaseTaskStatus.COMPLETED) {
    return JSON.stringify({ key: 'taskCompleted', params: { taskTitle, actorLabel } })
  }
  return JSON.stringify({
    key: 'taskStatusChanged',
    params: { taskTitle, status: newStatus, actorLabel },
  })
}

/* ---------------------------------------------------------------- */
/* TEXT HELPERS                                                       */
/* ---------------------------------------------------------------- */

export function truncateBody(body: string, maxLength = 80): string {
  return body.length > maxLength ? `${body.slice(0, maxLength)}...` : body
}

export function formatActorLabel(userName: string | null, email: string): string {
  return userName ? `${userName} (${email})` : email
}

export function formatUserLabel(
  user: { name: string; email: string } | null,
  fallbackId: string
): string {
  return user ? `${user.name} (${user.email})` : fallbackId
}

/* ---------------------------------------------------------------- */
/* NOTIFICATION HELPERS                                              */
/* ---------------------------------------------------------------- */

export function hasFieldChangesOnly(dto: UpdateCaseDto, isStatusChange: boolean): boolean {
  return (
    !isStatusChange &&
    dto.ownerUserId === undefined &&
    dto.cycleId === undefined &&
    (dto.title !== undefined || dto.description !== undefined || dto.severity !== undefined)
  )
}

export function buildCycleNotificationMessage(
  caseNumber: string,
  cycleId: string | null | undefined
): string {
  const detail = cycleId === null ? 'removed from cycle' : 'added to a cycle'
  return JSON.stringify({ key: 'caseUpdatedMessage', params: { caseRef: caseNumber, detail } })
}

/* ---------------------------------------------------------------- */
/* AI CONTEXT BUILDING                                               */
/* ---------------------------------------------------------------- */

export function buildCaseAiContext(caseItem: {
  title: string | null
  description: string | null
  severity: string
  status: string
  artifacts?: Array<{ type: string; value: string }>
  tasks?: Array<{ title: string; status: string }>
  timeline?: Array<{ type: string; description: string; timestamp: Date | null }>
}): Record<string, unknown> {
  return {
    caseTitle: caseItem.title ?? '',
    caseDescription: caseItem.description ?? '',
    caseSeverity: caseItem.severity,
    caseStatus: caseItem.status,
    artifacts: (caseItem.artifacts ?? []).slice(0, 10).map(a => ({
      type: a.type,
      value: a.value,
    })),
    tasks: (caseItem.tasks ?? []).slice(0, 10).map(t => ({
      title: t.title,
      status: t.status,
    })),
    timelineEvents: (caseItem.timeline ?? []).slice(0, 20).map(e => ({
      type: e.type,
      description: e.description,
      timestamp: e.timestamp ? toIso(e.timestamp) : '',
    })),
  }
}

/* ---------------------------------------------------------------- */
/* CREATE CASE PAYLOAD BUILDING                                      */
/* ---------------------------------------------------------------- */

export function buildCreateCasePayload(
  dto: CreateCaseDto,
  linkedAlerts: string[],
  tenantId: string,
  email: string
): CreateCasePayload {
  return {
    tenantId,
    cycleId: dto.cycleId,
    title: dto.title,
    description: dto.description,
    severity: dto.severity as CaseSeverity,
    status: CaseStatus.OPEN,
    ownerUserId: dto.ownerUserId ?? null,
    createdBy: email,
    linkedAlerts,
  }
}

/* ---------------------------------------------------------------- */
/* ALERT LINKED TIMELINE ENTRY                                       */
/* ---------------------------------------------------------------- */

export function buildAlertLinkedTimelineEntry(
  linkedAlerts: string[],
  actor: string
): TimelineEntry | undefined {
  if (linkedAlerts.length === 0) return undefined
  return {
    type: CaseTimelineType.ALERT_LINKED,
    actor,
    description: JSON.stringify({
      key: 'alertsLinkedAtCreation',
      params: { count: String(linkedAlerts.length) },
    }),
  }
}

/* ---------------------------------------------------------------- */
/* COMMENT USER ID COLLECTION                                        */
/* ---------------------------------------------------------------- */

export function collectCommentUserIds(
  comments: Array<{ authorId: string; mentions: Array<{ userId: string }> }>
): string[] {
  const authorIds = comments.map(c => c.authorId)
  const mentionUserIds = comments.flatMap(c => c.mentions.map(m => m.userId))
  return [...new Set([...authorIds, ...mentionUserIds])]
}
