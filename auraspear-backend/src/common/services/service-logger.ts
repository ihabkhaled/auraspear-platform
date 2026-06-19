import { type AppLogFeature, AppLogOutcome, AppLogSourceType } from '../enums'
import type { AppLoggerService } from './app-logger.service'

export class ServiceLogger {
  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly feature: AppLogFeature,
    private readonly className: string
  ) {}

  entry(action: string, tenantId: string, metadata?: Record<string, unknown>): void {
    this.appLogger.info(`${this.className} => ${action}`, {
      feature: this.feature,
      action,
      outcome: AppLogOutcome.PENDING,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: this.className,
      functionName: action,
      metadata,
    })
  }

  success(action: string, tenantId: string, metadata?: Record<string, unknown>): void {
    this.appLogger.info(`${this.className} => ${action} completed`, {
      feature: this.feature,
      action,
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: this.className,
      functionName: action,
      metadata,
    })
  }

  error(
    action: string,
    tenantId: string,
    error: unknown,
    metadata?: Record<string, unknown>
  ): void {
    const message = error instanceof Error ? error.message : String(error)
    this.appLogger.error(`${this.className} => ${action} failed`, {
      feature: this.feature,
      action,
      outcome: AppLogOutcome.FAILURE,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: this.className,
      functionName: action,
      metadata: { ...metadata, error: message },
    })
  }

  warn(
    action: string,
    tenantId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.appLogger.warn(`${this.className} => ${message}`, {
      feature: this.feature,
      action,
      outcome: AppLogOutcome.WARNING,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: this.className,
      functionName: action,
      metadata,
    })
  }

  debug(
    action: string,
    tenantId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.appLogger.debug(`${this.className} => ${message}`, {
      feature: this.feature,
      action,
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: this.className,
      functionName: action,
      metadata,
    })
  }

  skipped(
    action: string,
    tenantId: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): void {
    this.appLogger.info(`${this.className} => ${action} skipped`, {
      feature: this.feature,
      action,
      outcome: AppLogOutcome.SKIPPED,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: this.className,
      functionName: action,
      metadata: { ...metadata, reason },
    })
  }
}
