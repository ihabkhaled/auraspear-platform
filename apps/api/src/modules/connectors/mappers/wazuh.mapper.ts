import { mapAlertToOcsfFinding } from '../../../common/ocsf'
import { toIso } from '../../../common/utils/date-time.utility'
import type { OcsfSecurityFinding } from '../../../common/ocsf'

/**
 * Determines severity string from Wazuh numeric rule level.
 * Wazuh levels: 0-3 (low), 4-7 (medium), 8-11 (high), 12+ (critical)
 */
function getWazuhSeverity(level: number): string {
  if (level >= 12) {
    return 'critical'
  }
  if (level >= 8) {
    return 'high'
  }
  if (level >= 5) {
    return 'medium'
  }
  return 'low'
}

/**
 * Maps a Wazuh alert to OCSF SecurityFinding format.
 */
export function mapWazuhAlertToOcsf(
  alert: Record<string, unknown>,
  tenantId?: string
): OcsfSecurityFinding {
  const rule = (alert['rule'] as Record<string, unknown>) ?? {}
  const agent = (alert['agent'] as Record<string, unknown>) ?? {}
  const mitre = (rule['mitre'] as Record<string, unknown>) ?? {}
  const tactics = (mitre['tactic'] as string[]) ?? []
  const techniques = (mitre['id'] as string[]) ?? []
  const ruleLevel = (rule['level'] as number) ?? 0

  return mapAlertToOcsfFinding({
    title: (rule['description'] as string) ?? 'Wazuh Alert',
    description: (rule['description'] as string) ?? undefined,
    severity: getWazuhSeverity(ruleLevel),
    timestamp: (alert['timestamp'] as string) ?? toIso(),
    source: { product: 'Wazuh', vendor: 'Wazuh Inc.' },
    tenantId,
    eventId: alert['id'] as string,
    rawData: JSON.stringify(alert),
    mitreTacticName: tactics[0],
    mitreTechniqueId: techniques[0],
    affectedAsset: (agent['name'] as string) ?? undefined,
  })
}
