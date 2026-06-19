import { Injectable, Logger } from '@nestjs/common'
import { AuditLogsRepository } from './audit-logs.repository'
import {
  buildAuditLogCreateInput,
  buildAuditLogsOrderBy,
  buildAuditLogsWhereClause,
} from './audit-logs.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import type { AuditLogRecord, CreateAuditLogData, PaginatedAuditLogs } from './audit-logs.types'
import type { SearchAuditLogsDto } from './dto/search-audit-logs.dto'

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name)

  constructor(
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly appLogger: AppLoggerService
  ) {}

  async search(tenantId: string, query: SearchAuditLogsDto): Promise<PaginatedAuditLogs> {
    const where = buildAuditLogsWhereClause(tenantId, query)

    try {
      const [data, total] = await this.auditLogsRepository.findManyAndCount({
        where,
        orderBy: buildAuditLogsOrderBy(query.sortBy, query.sortOrder),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      })

      this.logSearchSuccess(tenantId, query, total)

      return {
        data,
        pagination: buildPaginationMeta(query.page, query.limit, total),
      }
    } catch (error: unknown) {
      this.logSearchFailure(tenantId, error)
      throw error
    }
  }

  async create(data: CreateAuditLogData): Promise<AuditLogRecord> {
    try {
      const entry = await this.auditLogsRepository.create(buildAuditLogCreateInput(data))

      this.logger.log(
        `Audit log created: ${data.action} on ${data.resource} by ${data.actor} in tenant ${data.tenantId}`
      )
      this.logCreateSuccess(data)

      return entry
    } catch (error: unknown) {
      this.logCreateFailure(data, error)
      throw error
    }
  }

  private logSearchSuccess(
    tenantId: string,
    query: SearchAuditLogsDto,
    total: number
  ): void {
    this.appLogger.info(`Searched audit logs page=${query.page} total=${total}`, {
      feature: AppLogFeature.SYSTEM,
      action: 'search',
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AuditLogsService',
      functionName: 'search',
      metadata: {
        page: query.page,
        limit: query.limit,
        total,
        actor: query.actor ?? null,
        filterAction: query.action ?? null,
        resource: query.resource ?? null,
      },
    })
  }

  private logSearchFailure(tenantId: string, error: unknown): void {
    this.appLogger.error('Failed to search audit logs', {
      feature: AppLogFeature.SYSTEM,
      action: 'search',
      outcome: AppLogOutcome.FAILURE,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AuditLogsService',
      functionName: 'search',
      stackTrace: error instanceof Error ? error.stack : undefined,
    })
  }

  private logCreateSuccess(data: CreateAuditLogData): void {
    this.appLogger.info(`Created audit log: ${data.action} on ${data.resource}`, {
      feature: AppLogFeature.SYSTEM,
      action: 'create',
      outcome: AppLogOutcome.SUCCESS,
      tenantId: data.tenantId,
      actorEmail: data.actor,
      targetResource: data.resource,
      targetResourceId: data.resourceId ?? undefined,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AuditLogsService',
      functionName: 'create',
      metadata: { auditAction: data.action, role: data.role },
    })
  }

  private logCreateFailure(data: CreateAuditLogData, error: unknown): void {
    this.appLogger.error(`Failed to create audit log: ${data.action} on ${data.resource}`, {
      feature: AppLogFeature.SYSTEM,
      action: 'create',
      outcome: AppLogOutcome.FAILURE,
      tenantId: data.tenantId,
      actorEmail: data.actor,
      targetResource: data.resource,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AuditLogsService',
      functionName: 'create',
      stackTrace: error instanceof Error ? error.stack : undefined,
    })
  }
}
