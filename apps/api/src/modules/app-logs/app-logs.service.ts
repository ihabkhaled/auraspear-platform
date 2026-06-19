import { Injectable, Logger } from '@nestjs/common'
import { AppLogsRepository } from './app-logs.repository'
import { buildAppLogsOrderBy, buildAppLogsWhereClause } from './app-logs.utilities'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import type { PaginatedApplicationLogs, ApplicationLogRecord } from './app-logs.types'
import type { SearchAppLogsDto } from './dto/search-app-logs.dto'

@Injectable()
export class AppLogsService {
  private readonly logger = new Logger(AppLogsService.name)

  constructor(private readonly appLogsRepository: AppLogsRepository) {}

  async search(dto: SearchAppLogsDto, scopedTenantId?: string): Promise<PaginatedApplicationLogs> {
    const where = buildAppLogsWhereClause(dto, scopedTenantId)

    const [data, total] = await this.appLogsRepository.findManyAndCount({
      where,
      orderBy: buildAppLogsOrderBy(dto.sortBy, dto.sortOrder),
      skip: (dto.page - 1) * dto.limit,
      take: dto.limit,
    })

    return {
      data,
      pagination: buildPaginationMeta(dto.page, dto.limit, total),
    }
  }

  async findById(id: string, scopedTenantId?: string): Promise<ApplicationLogRecord> {
    const log = await this.appLogsRepository.findById(id)

    if (!log) {
      throw new BusinessException(404, 'Application log not found', 'errors.appLogs.notFound')
    }

    // Tenant scoping enforcement
    if (scopedTenantId && log.tenantId !== scopedTenantId) {
      throw new BusinessException(403, 'Access denied to this log entry', 'errors.forbidden')
    }

    return log
  }
}
