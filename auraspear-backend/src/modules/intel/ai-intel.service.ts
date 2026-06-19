import { Injectable } from '@nestjs/common'
import { IntelRepository } from './intel.repository'
import { buildAdvisoryContext, buildIocEnrichContext } from './intel.utilities'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiIntelService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly intelRepository: IntelRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.INTEL, 'AiIntelService')
  }

  async enrichIoc(
    iocId: string,
    tenantId: string,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-enrich-ioc', tenantId, {
      iocId,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const ioc = await this.findIocOrThrow(iocId, tenantId)

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.INTEL_IOC_ENRICH,
        context: buildIocEnrichContext(ioc),
        connector,
      })

      this.log.success('ai-enrich-ioc', tenantId, {
        iocId,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-enrich-ioc', tenantId, error, {
        iocId,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  async draftAdvisory(
    tenantId: string,
    user: JwtPayload,
    iocIds: string[],
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-draft-advisory', tenantId, {
      iocCount: iocIds.length,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const iocs = await this.intelRepository.findManyIOCs({
        where: { id: { in: iocIds }, tenantId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })

      if (iocs.length === 0) {
        throw new BusinessException(404, 'No IOCs found', 'errors.intel.iocNotFound')
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.INTEL_ADVISORY_DRAFT,
        context: buildAdvisoryContext(iocs),
        connector,
      })

      this.log.success('ai-draft-advisory', tenantId, {
        iocCount: iocs.length,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-draft-advisory', tenantId, error, {
        iocCount: iocIds.length,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private async findIocOrThrow(
    iocId: string,
    tenantId: string
  ): Promise<{
    iocType: string
    iocValue: string
    source: string | null
    tags: string[]
    firstSeen: Date | null
    lastSeen: Date | null
    active: boolean
  }> {
    const iocs = await this.intelRepository.findManyIOCs({
      where: { id: iocId, tenantId },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 1,
    })

    const ioc = iocs[0]
    if (!ioc) {
      throw new BusinessException(404, 'IOC not found', 'errors.intel.iocNotFound')
    }

    return ioc
  }
}
