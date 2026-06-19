import { AlertSeverity, AlertStatus } from '../../common/enums'

export const VALID_SEVERITIES = new Set<string>(Object.values(AlertSeverity))
export const VALID_STATUSES = new Set<string>(Object.values(AlertStatus))

export const ALERT_SORT_FIELDS: Record<string, string> = {
  timestamp: 'timestamp',
  severity: 'severity',
  status: 'status',
  source: 'source',
  agentName: 'agentName',
  sourceIp: 'sourceIp',
  title: 'title',
  createdAt: 'createdAt',
}
