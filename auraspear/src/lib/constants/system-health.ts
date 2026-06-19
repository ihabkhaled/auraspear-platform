import { HealthCheckStatus, MetricType, ServiceStatus, ServiceType, StatusDotSize } from '@/enums'

export const SERVICE_TYPE_LABEL_KEYS: Record<ServiceType, string> = {
  [ServiceType.CONNECTOR]: 'serviceConnector',
  [ServiceType.DATABASE]: 'serviceDatabase',
  [ServiceType.API]: 'serviceApi',
  [ServiceType.QUEUE]: 'serviceQueue',
  [ServiceType.STORAGE]: 'serviceStorage',
}

export const HEALTH_CHECK_STATUS_LABEL_KEYS: Record<HealthCheckStatus, string> = {
  [HealthCheckStatus.HEALTHY]: 'statusHealthy',
  [HealthCheckStatus.DEGRADED]: 'statusDegraded',
  [HealthCheckStatus.DOWN]: 'statusDown',
  [HealthCheckStatus.UNKNOWN]: 'statusUnknown',
}

export const HEALTH_CHECK_STATUS_CLASSES: Record<HealthCheckStatus, string> = {
  [HealthCheckStatus.HEALTHY]: 'bg-status-success text-white',
  [HealthCheckStatus.DEGRADED]: 'bg-status-warning text-white',
  [HealthCheckStatus.DOWN]: 'bg-status-error text-white',
  [HealthCheckStatus.UNKNOWN]: 'bg-muted text-muted-foreground',
}

export const METRIC_TYPE_LABEL_KEYS: Record<MetricType, string> = {
  [MetricType.CPU]: 'metricCpu',
  [MetricType.MEMORY]: 'metricMemory',
  [MetricType.DISK]: 'metricDisk',
  [MetricType.NETWORK]: 'metricNetwork',
  [MetricType.QUEUE_DEPTH]: 'metricQueueDepth',
  [MetricType.LATENCY]: 'metricLatency',
}

export const STATUS_DOT_COLOR_MAP: Record<ServiceStatus, string> = {
  [ServiceStatus.HEALTHY]: 'bg-status-success',
  [ServiceStatus.DEGRADED]: 'bg-status-warning',
  [ServiceStatus.DOWN]: 'bg-status-error',
  [ServiceStatus.MAINTENANCE]: 'bg-status-info',
}

export const STATUS_DOT_PING_COLOR_MAP: Record<ServiceStatus, string> = {
  [ServiceStatus.HEALTHY]: 'bg-status-success',
  [ServiceStatus.DEGRADED]: 'bg-status-warning',
  [ServiceStatus.DOWN]: 'bg-status-error',
  [ServiceStatus.MAINTENANCE]: 'bg-status-info',
}

export const STATUS_DOT_SIZE_MAP: Record<StatusDotSize, string> = {
  [StatusDotSize.SM]: 'h-2 w-2',
  [StatusDotSize.MD]: 'h-3 w-3',
}

export const HEALTH_POLL_INTERVAL = 30_000
