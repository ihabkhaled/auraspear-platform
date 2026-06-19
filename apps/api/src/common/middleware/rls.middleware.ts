import { Injectable, Logger } from '@nestjs/common'
import type { NestMiddleware } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { setTenantContext } from '../utils/rls.utility'
import type { Request, Response, NextFunction } from 'express'

interface RequestWithUser extends Request {
  user?: {
    tenantId?: string
  }
}

/**
 * NestJS middleware that sets the PostgreSQL `app.current_tenant_id`
 * session variable before every request so that Row-Level Security
 * policies enforce tenant isolation at the database level.
 *
 * This middleware must run AFTER the AuthGuard has populated `req.user`.
 * Because guards run before middleware-registered interceptors but after
 * middleware, this is typically applied as a global interceptor or called
 * explicitly after auth resolution.
 *
 * **Important**: `set_config(..., true)` scopes the setting to the
 * current transaction. For Prisma's default behaviour (implicit
 * transactions per query), each `$executeRawUnsafe` call is its own
 * transaction. To make RLS effective across multiple Prisma calls within
 * a single request, wrap them in an explicit `prisma.$transaction()` or
 * use Prisma's interactive transactions.
 */
@Injectable()
export class RlsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RlsMiddleware.name)

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const request = req as RequestWithUser
    const tenantId = request.user?.tenantId

    if (tenantId) {
      try {
        await setTenantContext(this.prisma, tenantId)
      } catch (error: unknown) {
        this.logger.error(
          `Failed to set tenant RLS context for tenant ${tenantId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }

    next()
  }
}
