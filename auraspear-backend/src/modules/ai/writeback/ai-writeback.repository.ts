import { Injectable } from '@nestjs/common'
import { FINDINGS_SORT_COLUMN_MAP } from './ai-writeback.constants'
import { AiFindingStatus } from '../../../common/enums'
import {
  buildPaginationMeta,
  type PaginatedResponse,
} from '../../../common/interfaces/pagination.interface'
import { nowDate } from '../../../common/utils/date-time.utility'
import { PrismaService } from '../../../prisma/prisma.service'
import type {
  AlertAiFieldsData,
  CreateCaseNoteData,
  CreateFindingData,
  CreateIncidentTimelineData,
  CreateJobRunSummaryData,
  CreateNotificationData,
  SearchFindingsOptions,
  SearchFindingsResult,
} from './ai-writeback.types'
import type { ListFindingsQueryDto } from './dto/list-findings-query.dto'
import type { UserRole } from '../../../common/interfaces/authenticated-request.interface'
import type { AiExecutionFinding } from '@prisma/client'

@Injectable()
export class AiWritebackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listFindings(
    tenantId: string,
    dto: ListFindingsQueryDto
  ): Promise<PaginatedResponse<AiExecutionFinding>> {
    const result = await this.searchFindings(tenantId, {
      query: dto.query,
      sourceModule: dto.sourceModule,
      agentId: dto.agentId,
      status: dto.status,
      findingType: dto.findingType,
      sourceEntityId: dto.sourceEntityId,
      confidenceMin: dto.confidenceMin,
      confidenceMax: dto.confidenceMax,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      severity: dto.severity,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
      page: dto.page,
      limit: dto.limit,
    })

    return {
      data: result.data as AiExecutionFinding[],
      pagination: buildPaginationMeta(dto.page, dto.limit, result.total),
    }
  }

  /**
   * Full-text search for AI findings with ranking, filters, sorting, and pagination.
   * Uses raw SQL with parameterized queries for safety.
   */
  async searchFindings(
    tenantId: string,
    options: SearchFindingsOptions
  ): Promise<SearchFindingsResult> {
    const conditions: string[] = ['f."tenant_id" = $1::uuid']
    const params: unknown[] = [tenantId]
    let parameterIndex = 2
    let hasSearchQuery = false
    let searchParameterIndex = 0

    // Full-text search / ILIKE fallback
    if (options.query && options.query.trim().length > 0) {
      const trimmed = options.query.trim()

      if (trimmed.length < 3) {
        // Short queries: fallback to ILIKE
        const likeParameter = `%${trimmed}%`
        conditions.push(
          `(f."title" ILIKE $${parameterIndex} OR f."summary" ILIKE $${parameterIndex})`
        )
        params.push(likeParameter)
        parameterIndex++
      } else {
        hasSearchQuery = true
        searchParameterIndex = parameterIndex

        // Detect quoted phrases
        const hasQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
        if (hasQuotes) {
          conditions.push(`f."search_vector" @@ phraseto_tsquery('english', $${parameterIndex})`)
          params.push(trimmed.slice(1, -1))
        } else {
          // Strip non-alphanumeric chars, split into words, build safe tsquery
          const sanitized = trimmed.replaceAll(/[^\w\s]/g, ' ')
          const words = sanitized.split(/\s+/).filter(w => w.length > 0)
          if (words.length === 0) {
            // All special chars — fall back to ILIKE
            conditions.push(
              `(f."title" ILIKE $${parameterIndex} OR f."summary" ILIKE $${parameterIndex})`
            )
            params.push(`%${trimmed}%`)
          } else {
            const tsqueryText = words.map(w => `${w}:*`).join(' & ')
            conditions.push(`f."search_vector" @@ to_tsquery('english', $${parameterIndex})`)
            params.push(tsqueryText)
          }
        }
        parameterIndex++
      }
    }

    // Filter: sourceModule
    if (options.sourceModule) {
      conditions.push(`f."source_module" = $${parameterIndex}`)
      params.push(options.sourceModule)
      parameterIndex++
    }

    // Filter: agentId
    if (options.agentId) {
      conditions.push(`f."agent_id" = $${parameterIndex}`)
      params.push(options.agentId)
      parameterIndex++
    }

    // Filter: status
    if (options.status) {
      conditions.push(`f."status" = $${parameterIndex}`)
      params.push(options.status)
      parameterIndex++
    }

    // Filter: findingType
    if (options.findingType) {
      conditions.push(`f."finding_type" = $${parameterIndex}`)
      params.push(options.findingType)
      parameterIndex++
    }

    // Filter: severity
    if (options.severity) {
      conditions.push(`f."severity" = $${parameterIndex}`)
      params.push(options.severity)
      parameterIndex++
    }

    // Filter: sourceEntityId
    if (options.sourceEntityId) {
      conditions.push(`f."source_entity_id" = $${parameterIndex}`)
      params.push(options.sourceEntityId)
      parameterIndex++
    }

    // Filter: confidenceMin
    if (options.confidenceMin !== undefined && options.confidenceMin !== null) {
      conditions.push(`f."confidence_score" >= $${parameterIndex}`)
      params.push(options.confidenceMin)
      parameterIndex++
    }

    // Filter: confidenceMax
    if (options.confidenceMax !== undefined && options.confidenceMax !== null) {
      conditions.push(`f."confidence_score" <= $${parameterIndex}`)
      params.push(options.confidenceMax)
      parameterIndex++
    }

    // Filter: dateFrom
    if (options.dateFrom) {
      conditions.push(`f."created_at" >= $${parameterIndex}::timestamptz`)
      params.push(options.dateFrom)
      parameterIndex++
    }

    // Filter: dateTo
    if (options.dateTo) {
      conditions.push(`f."created_at" <= $${parameterIndex}::timestamptz`)
      params.push(options.dateTo)
      parameterIndex++
    }

    const whereClause = conditions.join(' AND ')

    // Sorting
    let orderClause: string
    if (hasSearchQuery && (!options.sortBy || options.sortBy === 'createdAt')) {
      // Default to relevance sort when searching
      orderClause = `ts_rank(f."search_vector", to_tsquery('english', $${searchParameterIndex})) DESC, f."created_at" DESC`
    } else {
      const sortColumn =
        (Reflect.get(FINDINGS_SORT_COLUMN_MAP, options.sortBy ?? 'createdAt') as
          | string
          | undefined) ?? 'created_at'
      const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC'
      orderClause = `f."${sortColumn}" ${sortDirection}`
    }

    // Pagination
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    // Count query
    const countSql = `SELECT COUNT(*)::int AS total FROM "ai_execution_findings" f WHERE ${whereClause}`

    // Data query
    const dataSql = `
      SELECT f."id", f."tenant_id" AS "tenantId", f."session_id" AS "sessionId",
             f."agent_id" AS "agentId", f."source_module" AS "sourceModule",
             f."source_entity_id" AS "sourceEntityId", f."finding_type" AS "findingType",
             f."title", f."summary", f."confidence_score" AS "confidenceScore",
             f."severity", f."evidence_json" AS "evidenceJson",
             f."recommended_action" AS "recommendedAction",
             f."status", f."applied_at" AS "appliedAt", f."created_at" AS "createdAt"
      FROM "ai_execution_findings" f
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${parameterIndex} OFFSET $${parameterIndex + 1}
    `

    const dataParameters = [...params, limit, offset]

    const [countResult, data] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ total: number }>>(countSql, ...params),
      this.prisma.$queryRawUnsafe<unknown[]>(dataSql, ...dataParameters),
    ])

    const total = countResult[0]?.total ?? 0

    return { data, total }
  }

  /**
   * Get aggregated stats for AI findings, grouped by status, severity, agent, and module.
   */
  async getFindingsStats(tenantId: string): Promise<{
    total: number
    proposed: number
    applied: number
    dismissed: number
    failed: number
    highConfidence: number
    bySeverity: Record<string, number>
    byAgent: Array<{ agentId: string; count: number }>
    byModule: Array<{ sourceModule: string; count: number }>
  }> {
    const [statusCounts, highConfigCount, severityCounts, agentCounts, moduleCounts] =
      await Promise.all([
        this.prisma.$queryRawUnsafe<Array<{ status: string; count: number }>>(
          `SELECT "status", COUNT(*)::int AS "count"
           FROM "ai_execution_findings"
           WHERE "tenant_id" = $1::uuid
           GROUP BY "status"`,
          tenantId
        ),
        this.prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*)::int AS "count"
           FROM "ai_execution_findings"
           WHERE "tenant_id" = $1::uuid AND "confidence_score" >= 0.8`,
          tenantId
        ),
        this.prisma.$queryRawUnsafe<Array<{ severity: string; count: number }>>(
          `SELECT "severity", COUNT(*)::int AS "count"
           FROM "ai_execution_findings"
           WHERE "tenant_id" = $1::uuid AND "severity" IS NOT NULL
           GROUP BY "severity"`,
          tenantId
        ),
        this.prisma.$queryRawUnsafe<Array<{ agentId: string; count: number }>>(
          `SELECT "agent_id" AS "agentId", COUNT(*)::int AS "count"
           FROM "ai_execution_findings"
           WHERE "tenant_id" = $1::uuid
           GROUP BY "agent_id"
           ORDER BY "count" DESC
           LIMIT 50`,
          tenantId
        ),
        this.prisma.$queryRawUnsafe<Array<{ sourceModule: string; count: number }>>(
          `SELECT "source_module" AS "sourceModule", COUNT(*)::int AS "count"
           FROM "ai_execution_findings"
           WHERE "tenant_id" = $1::uuid
           GROUP BY "source_module"
           ORDER BY "count" DESC
           LIMIT 50`,
          tenantId
        ),
      ])

    let total = 0
    let proposed = 0
    let applied = 0
    let dismissed = 0
    let failed = 0

    for (const row of statusCounts) {
      total += row.count
      switch (row.status) {
        case AiFindingStatus.PROPOSED:
          proposed = row.count
          break
        case AiFindingStatus.APPLIED:
          applied = row.count
          break
        case AiFindingStatus.DISMISSED:
          dismissed = row.count
          break
        case AiFindingStatus.FAILED:
          failed = row.count
          break
      }
    }

    const bySeverity: Record<string, number> = {}
    for (const row of severityCounts) {
      if (row.severity) {
        Reflect.set(bySeverity, row.severity, row.count)
      }
    }

    return {
      total,
      proposed,
      applied,
      dismissed,
      failed,
      highConfidence: highConfigCount[0]?.count ?? 0,
      bySeverity,
      byAgent: agentCounts,
      byModule: moduleCounts,
    }
  }

  async getFindingById(tenantId: string, id: string): Promise<AiExecutionFinding | null> {
    return this.prisma.aiExecutionFinding.findFirst({
      where: { id, tenantId },
    })
  }

  async findingsByEntity(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<AiExecutionFinding[]> {
    return this.prisma.aiExecutionFinding.findMany({
      where: {
        tenantId,
        sourceModule: entityType,
        sourceEntityId: entityId,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Export findings (no pagination, with optional filters). */
  async exportFindings(
    tenantId: string,
    filters?: { status?: string; agentId?: string; sourceModule?: string }
  ): Promise<AiExecutionFinding[]> {
    const where: Record<string, unknown> = { tenantId }
    if (filters?.status) where['status'] = filters.status
    if (filters?.agentId) where['agentId'] = filters.agentId
    if (filters?.sourceModule) where['sourceModule'] = filters.sourceModule

    return this.prisma.aiExecutionFinding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })
  }

  /**
   * Update the status of a finding. Returns the updated finding or null if not found.
   */
  async updateFindingStatus(
    tenantId: string,
    id: string,
    newStatus: string
  ): Promise<AiExecutionFinding | null> {
    const finding = await this.prisma.aiExecutionFinding.findFirst({
      where: { id, tenantId },
    })

    if (!finding) {
      return null
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === AiFindingStatus.APPLIED) {
      updateData['appliedAt'] = nowDate()
    }

    return this.prisma.aiExecutionFinding.update({
      where: { id },
      data: updateData,
    })
  }

  /* ------------------------------------------------------------------ */
  /* Writeback persistence methods                                       */
  /* ------------------------------------------------------------------ */

  /** Bulk-create AI execution findings. */
  async createFindings(data: CreateFindingData[]): Promise<{ count: number }> {
    return this.prisma.aiExecutionFinding.createMany({ data })
  }

  /** Bulk update status for multiple findings. */
  async bulkUpdateStatus(
    tenantId: string,
    ids: string[],
    data: Record<string, unknown>
  ): Promise<{ count: number }> {
    return this.prisma.aiExecutionFinding.updateMany({
      where: { id: { in: ids }, tenantId },
      data,
    })
  }

  /** Update alert AI-related fields for a given tenant + alert ID. */
  async updateAlertAiFields(
    tenantId: string,
    alertId: string,
    data: AlertAiFieldsData
  ): Promise<void> {
    await this.prisma.alert.updateMany({
      where: { id: alertId, tenantId },
      data,
    })
  }

  /** Create an incident timeline entry (AI writeback). */
  async createIncidentTimelineEntry(data: CreateIncidentTimelineData): Promise<void> {
    await this.prisma.incidentTimeline.create({ data })
  }

  /** Create a case note (AI writeback). */
  async createCaseNote(data: CreateCaseNoteData): Promise<void> {
    await this.prisma.caseNote.create({ data })
  }

  /** Persist an AI job run summary record. */
  async createJobRunSummary(data: CreateJobRunSummaryData): Promise<void> {
    await this.prisma.aiJobRunSummary.create({ data })
  }

  /** Update finding and writeback counts on an AI agent session. */
  async updateSessionCounts(
    sessionId: string,
    findingsCount: number,
    writebacksCount: number
  ): Promise<void> {
    await this.prisma.aiAgentSession.update({
      where: { id: sessionId },
      data: { findingsCount, writebacksCount },
    })
  }

  /** Find the first active tenant membership for a given role. */
  async findTenantAdmin(tenantId: string, role: UserRole): Promise<{ userId: string } | null> {
    return this.prisma.tenantMembership.findFirst({
      where: { tenantId, role, status: 'active' },
      select: { userId: true },
    })
  }

  /** Create a notification record. */
  async createNotification(data: CreateNotificationData): Promise<void> {
    await this.prisma.notification.create({ data })
  }
}
