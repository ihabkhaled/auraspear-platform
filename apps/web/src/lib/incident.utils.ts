import { IncidentSeverity } from '@/enums'
import { ALERT_SEVERITY_TO_INCIDENT } from '@/lib/constants/incidents'
import { lookup } from '@/lib/utils'

const RESOLVE_HOURS_FALLBACK = '-'

export function mapAlertSeverityToIncident(alertSeverity: string): IncidentSeverity {
  return lookup(ALERT_SEVERITY_TO_INCIDENT, alertSeverity) ?? IncidentSeverity.MEDIUM
}

export function formatAvgResolveHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) {
    return RESOLVE_HOURS_FALLBACK
  }
  return `${Math.round(hours)}h`
}
