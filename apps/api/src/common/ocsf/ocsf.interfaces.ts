import type {
  OcsfActivity,
  OcsfCategory,
  OcsfClassUid,
  OcsfSeverity,
  OcsfStatus,
} from './ocsf.enums'

/**
 * Base OCSF event structure.
 * All normalized events conform to this shape.
 */
export interface OcsfBaseEvent {
  /** OCSF category (e.g., FINDINGS, NETWORK_ACTIVITY) */
  category_uid: OcsfCategory
  /** OCSF class (e.g., SECURITY_FINDING, DNS_ACTIVITY) */
  class_uid: OcsfClassUid
  /** What happened */
  activity_id: OcsfActivity
  /** Severity level */
  severity_id: OcsfSeverity
  /** Outcome status */
  status_id: OcsfStatus
  /** Event time (ISO 8601) */
  time: string
  /** Human-readable message */
  message?: string
  /** Raw event data (original format) */
  raw_data?: string
  /** Source metadata */
  metadata: OcsfMetadata
  /** Observables extracted from the event */
  observables?: OcsfObservable[]
  /** Unmapped fields from the original event */
  unmapped?: Record<string, unknown>
}

export interface OcsfMetadata {
  /** OCSF schema version */
  version: string
  /** Product that generated the event */
  product: OcsfProduct
  /** Unique event ID */
  uid?: string
  /** Original event time */
  original_time?: string
  /** Tenant context */
  tenant_uid?: string
}

export interface OcsfProduct {
  /** Product name (e.g., "Wazuh", "Graylog") */
  name: string
  /** Vendor name */
  vendor_name: string
  /** Product version */
  version?: string
}

export interface OcsfObservable {
  /** Observable name/label */
  name: string
  /** Observable type (ip, domain, hash, url, email, etc.) */
  type_id: number
  /** Observable value */
  value: string
}

/**
 * OCSF Security Finding (class_uid = 2001)
 * Used for normalized alerts from any connector.
 */
export interface OcsfSecurityFinding extends OcsfBaseEvent {
  category_uid: OcsfCategory.FINDINGS
  class_uid: OcsfClassUid.SECURITY_FINDING
  /** Finding title */
  finding_info?: {
    title: string
    uid?: string
    desc?: string
    created_time?: string
    modified_time?: string
    src_url?: string
    types?: string[]
  }
  /** MITRE ATT&CK mapping */
  attacks?: Array<{
    tactic: { uid: string; name: string }
    technique: { uid: string; name: string }
  }>
  /** Affected resources */
  resources?: Array<{
    uid?: string
    name?: string
    type?: string
  }>
}

/**
 * OCSF Network Activity (class_uid = 4001)
 * Used for normalized network logs.
 */
export interface OcsfNetworkActivity extends OcsfBaseEvent {
  category_uid: OcsfCategory.NETWORK_ACTIVITY
  class_uid: OcsfClassUid.NETWORK_ACTIVITY
  src_endpoint?: { ip?: string; port?: number; hostname?: string }
  dst_endpoint?: { ip?: string; port?: number; hostname?: string }
  connection_info?: { protocol_num?: number; direction_id?: number }
  traffic?: {
    bytes_in?: number
    bytes_out?: number
    packets_in?: number
    packets_out?: number
  }
}

/**
 * OCSF Authentication (class_uid = 3002)
 * Used for normalized auth events.
 */
export interface OcsfAuthentication extends OcsfBaseEvent {
  category_uid: OcsfCategory.IDENTITY_ACCESS
  class_uid: OcsfClassUid.AUTHENTICATION
  actor?: {
    user?: { name?: string; uid?: string; email_addr?: string }
  }
  auth_protocol?: string
  dst_endpoint?: { ip?: string; port?: number; hostname?: string }
  is_mfa?: boolean
  logon_type?: string
}
