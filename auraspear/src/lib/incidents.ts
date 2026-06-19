import { type IncidentStatus } from '@/enums'
import { INCIDENT_VALID_TRANSITIONS } from '@/lib/constants/incidents'
import { lookup } from '@/lib/utils'

export function buildIncidentStatusOptions(currentStatus: IncidentStatus): IncidentStatus[] {
  return [currentStatus, ...lookup(INCIDENT_VALID_TRANSITIONS, currentStatus)]
}
