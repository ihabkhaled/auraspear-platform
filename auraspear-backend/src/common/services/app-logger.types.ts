export interface AppLogContext {
  feature: string
  action: string
  functionName?: string
  className?: string
  tenantId?: string
  actorUserId?: string
  actorEmail?: string
  requestId?: string
  targetResource?: string
  targetResourceId?: string
  outcome?: string
  metadata?: Record<string, unknown>
  stackTrace?: string
  httpMethod?: string
  httpRoute?: string
  httpStatusCode?: number
  sourceType?: string
  ipAddress?: string
}
