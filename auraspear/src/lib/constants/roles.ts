import { UserRole } from '@/enums'

export const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  [UserRole.GLOBAL_ADMIN]: 'globalAdmin',
  [UserRole.PLATFORM_OPERATOR]: 'platformOperator',
  [UserRole.TENANT_ADMIN]: 'tenantAdmin',
  [UserRole.DETECTION_ENGINEER]: 'detectionEngineer',
  [UserRole.INCIDENT_RESPONDER]: 'incidentResponder',
  [UserRole.THREAT_INTEL_ANALYST]: 'threatIntelAnalyst',
  [UserRole.SOAR_ENGINEER]: 'soarEngineer',
  [UserRole.THREAT_HUNTER]: 'threatHunter',
  [UserRole.SOC_ANALYST_L2]: 'socAnalystL2',
  [UserRole.SOC_ANALYST_L1]: 'socAnalystL1',
  [UserRole.EXECUTIVE_READONLY]: 'executiveReadonly',
  [UserRole.AUDITOR_READONLY]: 'auditorReadonly',
}
