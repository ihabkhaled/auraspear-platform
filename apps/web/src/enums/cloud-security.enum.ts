export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  OCI = 'oci',
}

export enum CloudAccountStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export enum CloudFindingSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum CloudFindingStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}
