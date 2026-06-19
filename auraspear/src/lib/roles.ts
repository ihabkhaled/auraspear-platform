import { UserRole } from '@/enums'

/**
 * Role hierarchy — higher index = lower privilege.
 * A user can access resources at their level or below.
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

/**
 * Check if `userRole` has at least the privilege of `requiredRole`.
 * Returns true if user's role is equal or higher in hierarchy.
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole)

  if (userIndex === -1 || requiredIndex === -1) {
    return false
  }

  return userIndex <= requiredIndex
}

/**
 * Role options for select dropdowns in admin dialogs.
 */
export const ROLE_OPTIONS = [
  { value: UserRole.GLOBAL_ADMIN, labelKey: 'roles.globalAdmin' },
  { value: UserRole.PLATFORM_OPERATOR, labelKey: 'roles.platformOperator' },
  { value: UserRole.TENANT_ADMIN, labelKey: 'roles.tenantAdmin' },
  { value: UserRole.DETECTION_ENGINEER, labelKey: 'roles.detectionEngineer' },
  { value: UserRole.INCIDENT_RESPONDER, labelKey: 'roles.incidentResponder' },
  { value: UserRole.THREAT_INTEL_ANALYST, labelKey: 'roles.threatIntelAnalyst' },
  { value: UserRole.SOAR_ENGINEER, labelKey: 'roles.soarEngineer' },
  { value: UserRole.THREAT_HUNTER, labelKey: 'roles.threatHunter' },
  { value: UserRole.SOC_ANALYST_L2, labelKey: 'roles.socAnalystL2' },
  { value: UserRole.SOC_ANALYST_L1, labelKey: 'roles.socAnalystL1' },
  { value: UserRole.EXECUTIVE_READONLY, labelKey: 'roles.executiveReadonly' },
  { value: UserRole.AUDITOR_READONLY, labelKey: 'roles.auditorReadonly' },
] as const

/**
 * Custom error for client-side permission checks.
 * Carries a messageKey compatible with the API error format
 * so getErrorKey() can extract the i18n key.
 */
export class PermissionError extends Error {
  readonly messageKey = 'errors.auth.insufficientPermissions'

  constructor(requiredRoles: UserRole[]) {
    super(`Insufficient permissions: requires ${requiredRoles.join(' | ')}`)
    this.name = 'PermissionError'
  }
}

/**
 * Throws PermissionError if user lacks ALL of the required roles.
 * Passes if the user has at least one of the roles in the array.
 * Use in mutation hooks as a client-side guard before API calls.
 */
export function requireRole(userRole: UserRole | undefined, requiredRoles: UserRole[]): void {
  if (userRole === undefined || !requiredRoles.some(role => hasRole(userRole, role))) {
    throw new PermissionError(requiredRoles)
  }
}
