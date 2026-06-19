import { mapAlertToOcsfFinding } from '../../../common/ocsf'
import { toIso } from '../../../common/utils/date-time.utility'
import type { OcsfSecurityFinding } from '../../../common/ocsf'

/**
 * Maps a Graylog alert/message to OCSF SecurityFinding format.
 */
export function mapGraylogAlertToOcsf(
  event: Record<string, unknown>,
  tenantId?: string
): OcsfSecurityFinding {
  return mapAlertToOcsfFinding({
    title: (event['message'] as string) ?? 'Graylog Event',
    description: (event['full_message'] as string) ?? undefined,
    severity: (event['level'] as string) ?? 'medium',
    timestamp: (event['timestamp'] as string) ?? toIso(),
    source: { product: 'Graylog', vendor: 'Graylog Inc.' },
    tenantId,
    eventId: (event['_id'] as string) ?? undefined,
    rawData: JSON.stringify(event),
    affectedAsset: (event['source'] as string) ?? undefined,
  })
}
