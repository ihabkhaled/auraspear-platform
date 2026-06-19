import type { Request } from 'express'

export enum MembershipStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum UserRole {
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',
  PLATFORM_OPERATOR = 'PLATFORM_OPERATOR',
  TENANT_ADMIN = 'TENANT_ADMIN',
  DETECTION_ENGINEER = 'DETECTION_ENGINEER',
  INCIDENT_RESPONDER = 'INCIDENT_RESPONDER',
  THREAT_INTEL_ANALYST = 'THREAT_INTEL_ANALYST',
  SOAR_ENGINEER = 'SOAR_ENGINEER',
  THREAT_HUNTER = 'THREAT_HUNTER',
  SOC_ANALYST_L2 = 'SOC_ANALYST_L2',
  SOC_ANALYST_L1 = 'SOC_ANALYST_L1',
  EXECUTIVE_READONLY = 'EXECUTIVE_READONLY',
  AUDITOR_READONLY = 'AUDITOR_READONLY',
}

/**
 * Ordered role hierarchy from most privileged to least.
 * A role at index N is more privileged than a role at index N+1.
 */
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.GLOBAL_ADMIN,
  UserRole.PLATFORM_OPERATOR,
  UserRole.TENANT_ADMIN,
  UserRole.DETECTION_ENGINEER,
  UserRole.INCIDENT_RESPONDER,
  UserRole.THREAT_INTEL_ANALYST,
  UserRole.SOAR_ENGINEER,
  UserRole.THREAT_HUNTER,
  UserRole.SOC_ANALYST_L2,
  UserRole.SOC_ANALYST_L1,
  UserRole.EXECUTIVE_READONLY,
  UserRole.AUDITOR_READONLY,
]

export interface JwtPayload {
  sub: string
  email: string
  tenantId: string
  tenantSlug: string
  role: UserRole
  jti?: string
  iat?: number
  exp?: number
  /** Present and `true` when this token was issued via impersonation. */
  isImpersonated?: boolean
  /** The `sub` (user ID) of the admin who initiated the impersonation. */
  impersonatorSub?: string
  /** The email of the admin who initiated the impersonation. */
  impersonatorEmail?: string
  /** Refresh token family UUID for rotation tracking. */
  family?: string
  /** Refresh token generation number within the family. */
  generation?: number
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload
}
