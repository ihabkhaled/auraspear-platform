import { Injectable } from '@nestjs/common'
import {
  AppLogFeature,
  AppLogOutcome,
  AppLogSourceType,
  HuntTimeRange,
} from '../../../common/enums'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { toIso } from '../../../common/utils/date-time.utility'
import { HuntsService } from '../../hunts/hunts.service'
import type { Job } from '@prisma/client'

@Injectable()
export class HuntExecutionHandler {
  constructor(
    private readonly huntsService: HuntsService,
    private readonly appLogger: AppLoggerService
  ) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const query = payload?.['query'] as string | undefined
    const timeRange = (payload?.['timeRange'] as HuntTimeRange | undefined) ?? HuntTimeRange.H24
    const startedBy = (payload?.['startedBy'] as string | undefined) ?? 'system'

    if (!query) {
      throw new Error('query is required in job payload')
    }

    this.appLogger.info('Executing hunt query via job', {
      feature: AppLogFeature.JOBS,
      action: 'huntExecution',
      sourceType: AppLogSourceType.JOB,
      className: 'HuntExecutionHandler',
      functionName: 'handle',
      tenantId: job.tenantId,
      targetResource: 'HuntSession',
      metadata: {
        jobType: job.type,
        query,
        timeRange,
        startedBy,
      },
    })

    const session = await this.huntsService.runHunt(job.tenantId, { query, timeRange }, startedBy)

    this.appLogger.info('Hunt execution completed', {
      feature: AppLogFeature.JOBS,
      action: 'huntExecution',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.JOB,
      className: 'HuntExecutionHandler',
      functionName: 'handle',
      tenantId: job.tenantId,
      targetResource: 'HuntSession',
      targetResourceId: session.id,
      metadata: {
        jobType: job.type,
        sessionStatus: session.status,
        eventsFound: session.eventsFound,
        uniqueIps: session.uniqueIps,
        threatScore: session.threatScore,
      },
    })

    return {
      sessionId: session.id,
      status: session.status,
      eventsFound: session.eventsFound,
      uniqueIps: session.uniqueIps,
      threatScore: session.threatScore,
      executedAt: toIso(),
    }
  }
}
