export enum SyncJobStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ExplorerConnector {
  GRAYLOG = 'graylog',
  GRAFANA = 'grafana',
  INFLUXDB = 'influxdb',
  MISP = 'misp',
  VELOCIRAPTOR = 'velociraptor',
  SHUFFLE = 'shuffle',
  LOGSTASH = 'logstash',
}

export enum VelociraptorTab {
  ENDPOINTS = 'endpoints',
  HUNTS = 'hunts',
}
