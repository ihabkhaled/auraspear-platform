import { OcsfActivity, OcsfCategory, OcsfClassUid, OcsfSeverity, OcsfStatus } from './ocsf.enums'
import type { OcsfBaseEvent, OcsfMetadata, OcsfSecurityFinding } from './ocsf.interfaces'

const OCSF_VERSION = '1.3.0'

/**
 * Maps connector-specific severity strings to OCSF severity IDs.
 */
export function mapSeverityToOcsf(severity: string): OcsfSeverity {
  const normalized = severity.toLowerCase()
  switch (normalized) {
    case 'critical':
      return OcsfSeverity.CRITICAL
    case 'high':
      return OcsfSeverity.HIGH
    case 'medium':
      return OcsfSeverity.MEDIUM
    case 'low':
      return OcsfSeverity.LOW
    case 'info':
    case 'informational':
      return OcsfSeverity.INFORMATIONAL
    default:
      return OcsfSeverity.UNKNOWN
  }
}

/**
 * Creates OCSF metadata block for a given connector product.
 */
export function buildOcsfMetadata(
  productName: string,
  vendorName: string,
  tenantId?: string,
  eventUid?: string
): OcsfMetadata {
  return {
    version: OCSF_VERSION,
    product: { name: productName, vendor_name: vendorName },
    tenant_uid: tenantId,
    uid: eventUid,
  }
}

interface MapAlertToOcsfParameters {
  title: string
  description?: string
  severity: string
  timestamp: string
  source: { product: string; vendor: string }
  tenantId?: string
  eventId?: string
  rawData?: string
  mitreTacticId?: string
  mitreTacticName?: string
  mitreTechniqueId?: string
  mitreTechniqueName?: string
  affectedAsset?: string
}

/**
 * Maps a generic alert from any connector to OCSF SecurityFinding format.
 */
export function mapAlertToOcsfFinding(params: MapAlertToOcsfParameters): OcsfSecurityFinding {
  const attacks = params.mitreTechniqueId
    ? [
        {
          tactic: {
            uid: params.mitreTacticId ?? '',
            name: params.mitreTacticName ?? '',
          },
          technique: {
            uid: params.mitreTechniqueId,
            name: params.mitreTechniqueName ?? '',
          },
        },
      ]
    : undefined

  const resources = params.affectedAsset
    ? [{ name: params.affectedAsset, type: 'host' }]
    : undefined

  return {
    category_uid: OcsfCategory.FINDINGS,
    class_uid: OcsfClassUid.SECURITY_FINDING,
    activity_id: OcsfActivity.CREATE,
    severity_id: mapSeverityToOcsf(params.severity),
    status_id: OcsfStatus.SUCCESS,
    time: params.timestamp,
    message: params.title,
    raw_data: params.rawData,
    metadata: buildOcsfMetadata(
      params.source.product,
      params.source.vendor,
      params.tenantId,
      params.eventId
    ),
    finding_info: {
      title: params.title,
      desc: params.description,
      uid: params.eventId,
    },
    attacks,
    resources,
  }
}

/**
 * Creates a minimal OCSF base event. Useful for custom event types.
 */
export function buildBaseOcsfEvent(
  category: OcsfCategory,
  classUid: OcsfClassUid,
  activity: OcsfActivity,
  severity: OcsfSeverity,
  time: string,
  productName: string,
  vendorName: string
): OcsfBaseEvent {
  return {
    category_uid: category,
    class_uid: classUid,
    activity_id: activity,
    severity_id: severity,
    status_id: OcsfStatus.UNKNOWN,
    time,
    metadata: buildOcsfMetadata(productName, vendorName),
  }
}
