import type { UserRole } from '../../common/interfaces/authenticated-request.interface'
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { AuditLog } from '@prisma/client'

export type AuditLogRecord = AuditLog

export type PaginatedAuditLogs = PaginatedResponse<AuditLogRecord>

export interface CreateAuditLogData {
  tenantId: string
  actor: string
  role: UserRole
  action: string
  resource: string
  resourceId?: string | null
  details?: string | null
  ipAddress?: string | null
}
