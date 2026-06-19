import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common'
import {
  parseException,
  buildErrorResponse,
} from './http-exception.utilities'
import type { Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<{ url: string }>()

    const parsed = parseException(exception)
    this.logParsedException(parsed.logAction, parsed.logMessage, parsed.logStack)

    const errorResponse = buildErrorResponse(parsed, request.url)
    response.status(parsed.status).json(errorResponse)
  }

  private logParsedException(
    action: string,
    message: string | undefined,
    stack: string | undefined
  ): void {
    switch (action) {
      case 'warn': {
        this.logger.warn(message)
        break
      }
      case 'error': {
        this.logger.error(message)
        break
      }
      case 'errorWithStack': {
        this.logger.error(message, stack)
        break
      }
      case 'unknownError': {
        this.logger.error(message)
        break
      }
      default: {
        break
      }
    }
  }
}
