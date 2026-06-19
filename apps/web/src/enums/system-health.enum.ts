export enum ServiceType {
  CONNECTOR = 'connector',
  DATABASE = 'database',
  API = 'api',
  QUEUE = 'queue',
  STORAGE = 'storage',
}

export enum HealthCheckStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown',
}

export enum MetricType {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  QUEUE_DEPTH = 'queue_depth',
  LATENCY = 'latency',
}
