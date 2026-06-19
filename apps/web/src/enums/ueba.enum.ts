export enum UebaEntityType {
  USER = 'user',
  HOST = 'host',
  SERVICE_ACCOUNT = 'service_account',
  APPLICATION = 'application',
}

export enum UebaRiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NORMAL = 'normal',
}

export enum MlModelStatus {
  TRAINING = 'training',
  ACTIVE = 'active',
  DEGRADED = 'degraded',
  INACTIVE = 'inactive',
}

export enum MlModelType {
  ANOMALY_DETECTION = 'anomaly_detection',
  CLASSIFICATION = 'classification',
  CLUSTERING = 'clustering',
  TIME_SERIES = 'time_series',
}

export enum UebaTab {
  ENTITIES = 'entities',
  ANOMALIES = 'anomalies',
  MODELS = 'models',
}
