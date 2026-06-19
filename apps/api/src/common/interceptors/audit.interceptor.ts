import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  Logger,
} from '@nestjs/common'
import { type Observable, tap } from 'rxjs'
import { MUTATION_METHODS } from './audit.constants'
import { PrismaService } from '../../prisma/prisma.service'
import { redactSensitiveFields } from '../utils/redaction.utility'
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name)

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const { method } = request

    if (!MUTATION_METHODS.has(method)) {
      return next.handle()
    }

    const { user } = request
    const tenantId = user?.tenantId
    const handler = context.getHandler().name
    const controller = context.getClass().name

    // Build resource ID from all path params
    const params = request.params as Record<string, string> | undefined
    const resourceId = params ? Object.values(params).filter(Boolean).join('/') || null : null

    // Build sanitized details from request body (strip sensitive fields)
    let details: string | null = null
    if (request.body && typeof request.body === 'object') {
      const sanitized = redactSensitiveFields(request.body as Record<string, unknown>)
      details = JSON.stringify(sanitized).slice(0, 2000)
    }

    return next.handle().pipe(
      tap(() => {
        if (!tenantId || !user) return

        this.prisma.auditLog
          .create({
            data: {
              tenantId,
              actor: user.email ?? user.sub,
              role: user.role,
              action: `${method} ${handler}`,
              resource: controller,
              resourceId,
              details,
              ipAddress: request.ip ?? null,
            },
          })
          .catch((error: unknown) => {
            this.logger.error('Failed to write audit log', error)
          })
      })
    )
  }
}
