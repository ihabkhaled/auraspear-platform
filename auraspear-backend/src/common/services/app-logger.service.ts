import { Injectable, Logger } from '@nestjs/common'
import { formatLogMessage, buildPersistData } from './app-logger.utilities'
import { PrismaService } from '../../prisma/prisma.service'
import type { AppLogContext } from './app-logger.types'

export type { AppLogContext } from './app-logger.types'

@Injectable()
export class AppLoggerService {
  private readonly logger = new Logger(AppLoggerService.name)

  constructor(private readonly prisma: PrismaService) {}

  info(message: string, context: AppLogContext): void {
    this.persist('info', message, context)
    this.logger.log(formatLogMessage(message, context))
  }

  warn(message: string, context: AppLogContext): void {
    this.persist('warn', message, context)
    this.logger.warn(formatLogMessage(message, context))
  }

  error(message: string, context: AppLogContext): void {
    this.persist('error', message, context)
    this.logger.error(formatLogMessage(message, context))
  }

  debug(message: string, context: AppLogContext): void {
    this.persist('debug', message, context)
    this.logger.debug(formatLogMessage(message, context))
  }

  private persist(level: string, message: string, context: AppLogContext): void {
    const data = buildPersistData(level, message, context)

    this.prisma.applicationLog
      .create({ data })
      .catch((error: unknown) => {
        this.logger.error('Failed to persist application log', error)
      })
  }
}
