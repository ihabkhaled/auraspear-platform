import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { HealthRepository } from './health.repository'
import {
  buildComponentCheckResult,
  buildFailedServiceHealthResult,
  buildOverallHealthResponse,
  buildServiceHealthResult,
  countUnhealthy,
  determineConnectorHealthStatus,
  determineOverallStatus,
  extractErrorMessage,
} from './health.utilities'
import { AppLogFeature, HealthStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowMs, elapsedMs } from '../../common/utils/date-time.utility'
import { REDIS_CLIENT } from '../../redis'
import { ConnectorsService } from '../connectors/connectors.service'
import type { ServiceHealthResult, OverallHealth, ComponentCheck } from './health.types'

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: HealthRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly connectorsService: ConnectorsService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.SYSTEM, 'HealthService')
  }

  async getOverallHealthOrThrow(): Promise<OverallHealth> {
    this.log.entry('getOverallHealthOrThrow', '')
    const health = await this.getOverallHealth()

    if (health.status === HealthStatus.DOWN) {
      this.log.error('getOverallHealthOrThrow', '', new Error('System is down'), {
        status: health.status,
      })
      throw new BusinessException(503, 'System is down', 'errors.health.serviceUnavailable')
    }

    return health
  }

  async getOverallHealth(): Promise<OverallHealth> {
    this.log.entry('getOverallHealth', '')
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()])
    const status = determineOverallStatus(database, redis)

    this.log.debug('getOverallHealth', '', 'Overall health check completed', {
      status,
      databaseStatus: database.status,
      databaseLatencyMs: database.latencyMs,
      redisStatus: redis.status,
      redisLatencyMs: redis.latencyMs,
    })

    return buildOverallHealthResponse(status, database, redis)
  }

  async getAllServiceHealth(tenantId: string): Promise<ServiceHealthResult[]> {
    this.log.entry('getAllServiceHealth', tenantId)
    const connectors = await this.connectorsService.getEnabledConnectors(tenantId)

    const results = await Promise.all(
      connectors.map(async connector => this.checkConnectorHealth(tenantId, connector))
    )

    const unhealthyCount = countUnhealthy(results)
    this.log.debug('getAllServiceHealth', tenantId, 'Service health check completed', {
      totalConnectors: connectors.length,
      unhealthyCount,
    })

    return results
  }

  private async checkConnectorHealth(
    tenantId: string,
    connector: { name: string; type: string }
  ): Promise<ServiceHealthResult> {
    try {
      const test = await this.connectorsService.testConnection(tenantId, connector.type)
      const status = determineConnectorHealthStatus(test.ok, test.latencyMs)
      return buildServiceHealthResult(connector.name, connector.type, status, test.latencyMs)
    } catch (error) {
      const message = extractErrorMessage(error)
      this.logger.error(`Health check failed for connector ${connector.type}: ${message}`)
      this.log.error('getAllServiceHealth', tenantId, error, {
        connectorType: connector.type,
        connectorName: connector.name,
      })
      return buildFailedServiceHealthResult(connector.name, connector.type)
    }
  }

  private async checkDatabase(): Promise<ComponentCheck> {
    const start = nowMs()
    try {
      await this.repository.pingDatabase()
      return buildComponentCheckResult(HealthStatus.HEALTHY, elapsedMs(start))
    } catch (error) {
      const message = extractErrorMessage(error)
      this.logger.error(`Database health check failed: ${message}`)
      this.log.error('checkDatabase', '', error, { error: message })
      return buildComponentCheckResult(HealthStatus.DOWN, elapsedMs(start))
    }
  }

  private async checkRedis(): Promise<ComponentCheck> {
    const start = nowMs()
    try {
      await this.redis.ping()
      return buildComponentCheckResult(HealthStatus.HEALTHY, elapsedMs(start))
    } catch (error) {
      const message = extractErrorMessage(error)
      this.logger.error(`Redis health check failed: ${message}`)
      this.log.error('checkRedis', '', error, { error: message })
      return buildComponentCheckResult(HealthStatus.DOWN, elapsedMs(start))
    }
  }
}
