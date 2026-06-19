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

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  MAINTENANCE = 'maintenance',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum TenantStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  INACTIVE = 'inactive',
}

export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum SupportedLocale {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  AR = 'ar',
  IT = 'it',
  DE = 'de',
}

export enum SystemAdminTab {
  AUDIT = 'audit',
  APP_LOGS = 'appLogs',
}
