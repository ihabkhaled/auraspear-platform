import { Injectable } from '@nestjs/common'
import { AiScheduleTemplatesRepository } from './ai-schedule-templates.repository'
import { daysAgo } from '../../../common/utils/date-time.utility'
import type { AiJobRunFilters, AiJobHealthSummary } from './ai-schedule-templates.types'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'
import type { AiJobRunSummary, AiScheduleTemplate } from '@prisma/client'

@Injectable()
export class AiScheduleTemplatesService {
  constructor(private readonly repository: AiScheduleTemplatesRepository) {}

  async listTemplates(): Promise<AiScheduleTemplate[]> {
    return this.repository.listTemplates()
  }

  async listJobRuns(
    tenantId: string,
    filters: AiJobRunFilters,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<AiJobRunSummary>> {
    return this.repository.listJobRuns(tenantId, filters, page, limit)
  }

  async getJobHealthSummary(tenantId: string): Promise<AiJobHealthSummary> {
    const since = daysAgo(1)
    return this.repository.getJobHealthSummary(tenantId, since)
  }
}
