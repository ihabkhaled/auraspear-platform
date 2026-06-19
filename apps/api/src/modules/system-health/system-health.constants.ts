export const HEALTH_CHECK_SORT_FIELDS: Record<string, string> = {
  serviceName: 'serviceName',
  status: 'status',
  responseTimeMs: 'responseTimeMs',
  serviceType: 'serviceType',
  checkedAt: 'lastCheckedAt',
}

export const METRIC_SORT_FIELDS: Record<string, string> = {
  metricName: 'metricName',
  value: 'value',
  recordedAt: 'recordedAt',
}
