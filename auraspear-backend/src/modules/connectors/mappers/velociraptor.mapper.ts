import { mapAlertToOcsfFinding } from '../../../common/ocsf'
import { toIso } from '../../../common/utils/date-time.utility'
import type { OcsfSecurityFinding } from '../../../common/ocsf'

/**
 * Determines severity string from Velociraptor alert urgency.
 * Velociraptor urgency: LOW, MEDIUM, HIGH, CRITICAL (string-based)
 * Falls back to 'medium' if the urgency field is missing.
 */
function getVelociraptorSeverity(event: Record<string, unknown>): string {
  const urgency = (event['Urgent'] as string) ?? (event['urgency'] as string)
  if (urgency) {
    return urgency.toLowerCase()
  }

  const level = event['Level'] as number | undefined
  if (typeof level === 'number') {
    if (level >= 4) {
      return 'critical'
    }
    if (level >= 3) {
      return 'high'
    }
    if (level >= 2) {
      return 'medium'
    }
    return 'low'
  }

  return 'medium'
}

/**
 * Maps a Velociraptor endpoint telemetry event to OCSF SecurityFinding format.
 *
 * Velociraptor generates endpoint monitoring events from VQL queries.
 * Typical fields: ArtifactName, ClientId, Hostname, Timestamp, Fqdn,
 * FlowId, HuntId, Urgent/Level.
 */
export function mapVelociraptorToOcsf(
  event: Record<string, unknown>,
  tenantId?: string
): OcsfSecurityFinding {
  const artifactName = (event['ArtifactName'] as string) ?? ''
  const hostname =
    (event['Hostname'] as string) ?? (event['Fqdn'] as string) ?? (event['ClientId'] as string)

  const title = artifactName ? `Velociraptor: ${artifactName}` : 'Velociraptor Alert'

  const description = (event['Description'] as string) ?? (event['Message'] as string) ?? undefined

  return mapAlertToOcsfFinding({
    title,
    description,
    severity: getVelociraptorSeverity(event),
    timestamp: (event['Timestamp'] as string) ?? (event['timestamp'] as string) ?? toIso(),
    source: { product: 'Velociraptor', vendor: 'Rapid7' },
    tenantId,
    eventId: (event['FlowId'] as string) ?? (event['HuntId'] as string) ?? undefined,
    rawData: JSON.stringify(event),
    affectedAsset: hostname ?? undefined,
  })
}
