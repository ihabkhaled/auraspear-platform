import { mapAlertToOcsfFinding } from '../../../common/ocsf'
import { toIso } from '../../../common/utils/date-time.utility'
import type { OcsfSecurityFinding } from '../../../common/ocsf'

/**
 * Maps Grafana alert state to a severity string.
 * Grafana states: alerting, no_data, ok, pending, error
 */
function getGrafanaSeverity(state: string): string {
  const normalized = state.toLowerCase()
  switch (normalized) {
    case 'alerting':
      return 'high'
    case 'error':
      return 'critical'
    case 'no_data':
      return 'medium'
    case 'pending':
      return 'low'
    case 'ok':
    case 'normal':
      return 'info'
    default:
      return 'medium'
  }
}

/**
 * Maps a Grafana alert notification to OCSF SecurityFinding format.
 *
 * Grafana sends alert notifications via webhooks with fields like:
 * title, message, state, ruleId, ruleName, ruleUrl, evalMatches,
 * orgId, dashboardId, panelId, tags.
 */
export function mapGrafanaToOcsf(
  event: Record<string, unknown>,
  tenantId?: string
): OcsfSecurityFinding {
  const state = (event['state'] as string) ?? 'unknown'
  const title = (event['title'] as string) ?? (event['ruleName'] as string) ?? 'Grafana Alert'

  const description = (event['message'] as string) ?? (event['body'] as string) ?? undefined

  const ruleId = event['ruleId'] as string | number | undefined

  return mapAlertToOcsfFinding({
    title,
    description,
    severity: getGrafanaSeverity(state),
    timestamp: (event['timestamp'] as string) ?? (event['evalDate'] as string) ?? toIso(),
    source: { product: 'Grafana', vendor: 'Grafana Labs' },
    tenantId,
    eventId: ruleId === undefined ? undefined : String(ruleId),
    rawData: JSON.stringify(event),
    affectedAsset: (event['host'] as string) ?? (event['dashboardSlug'] as string) ?? undefined,
  })
}
