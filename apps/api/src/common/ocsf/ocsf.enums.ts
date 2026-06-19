/**
 * OCSF Category IDs (top-level event grouping)
 * See: https://schema.ocsf.io/1.3.0/categories
 */
export enum OcsfCategory {
  SYSTEM_ACTIVITY = 1,
  FINDINGS = 2,
  IDENTITY_ACCESS = 3,
  NETWORK_ACTIVITY = 4,
  DISCOVERY = 5,
  APPLICATION_ACTIVITY = 6,
}

/**
 * OCSF Activity IDs (what happened)
 */
export enum OcsfActivity {
  UNKNOWN = 0,
  CREATE = 1,
  READ = 2,
  UPDATE = 3,
  DELETE = 4,
  LOGIN = 5,
  LOGOUT = 6,
  OTHER = 99,
}

/**
 * OCSF Severity IDs (how important)
 */
export enum OcsfSeverity {
  UNKNOWN = 0,
  INFORMATIONAL = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  CRITICAL = 5,
  FATAL = 6,
}

/**
 * OCSF Status IDs (outcome)
 */
export enum OcsfStatus {
  UNKNOWN = 0,
  SUCCESS = 1,
  FAILURE = 2,
  OTHER = 99,
}

/**
 * OCSF Class UIDs relevant to SOC platform
 */
export enum OcsfClassUid {
  // Findings
  SECURITY_FINDING = 2001,
  VULNERABILITY_FINDING = 2002,
  COMPLIANCE_FINDING = 2003,
  DETECTION_FINDING = 2004,
  INCIDENT_FINDING = 2005,

  // Identity & Access
  AUTHENTICATION = 3002,
  AUTHORIZE_SESSION = 3003,
  ENTITY_MANAGEMENT = 3004,

  // Network Activity
  NETWORK_ACTIVITY = 4001,
  HTTP_ACTIVITY = 4002,
  DNS_ACTIVITY = 4003,
  EMAIL_ACTIVITY = 4009,

  // System Activity
  PROCESS_ACTIVITY = 1007,
  FILE_ACTIVITY = 1001,
  REGISTRY_ACTIVITY = 1006,

  // Application Activity
  API_ACTIVITY = 6003,
  WEB_RESOURCE_ACTIVITY = 6001,
}
