import {
  CloudAccountStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
  CloudProvider,
} from '@/enums'

export const CLOUD_PROVIDER_LABEL_KEYS: Record<CloudProvider, string> = {
  [CloudProvider.AWS]: 'providerAws',
  [CloudProvider.AZURE]: 'providerAzure',
  [CloudProvider.GCP]: 'providerGcp',
  [CloudProvider.OCI]: 'providerOci',
}

export const CLOUD_ACCOUNT_STATUS_LABEL_KEYS: Record<CloudAccountStatus, string> = {
  [CloudAccountStatus.CONNECTED]: 'statusConnected',
  [CloudAccountStatus.DISCONNECTED]: 'statusDisconnected',
  [CloudAccountStatus.ERROR]: 'statusError',
}

export const CLOUD_ACCOUNT_STATUS_CLASSES: Record<CloudAccountStatus, string> = {
  [CloudAccountStatus.CONNECTED]: 'bg-status-success text-white',
  [CloudAccountStatus.DISCONNECTED]: 'bg-muted text-muted-foreground',
  [CloudAccountStatus.ERROR]: 'bg-status-error text-white',
}

export const CLOUD_FINDING_SEVERITY_LABEL_KEYS: Record<CloudFindingSeverity, string> = {
  [CloudFindingSeverity.CRITICAL]: 'severityCritical',
  [CloudFindingSeverity.HIGH]: 'severityHigh',
  [CloudFindingSeverity.MEDIUM]: 'severityMedium',
  [CloudFindingSeverity.LOW]: 'severityLow',
  [CloudFindingSeverity.INFO]: 'severityInfo',
}

export const CLOUD_FINDING_SEVERITY_CLASSES: Record<CloudFindingSeverity, string> = {
  [CloudFindingSeverity.CRITICAL]: 'bg-severity-critical text-white',
  [CloudFindingSeverity.HIGH]: 'bg-severity-high text-white',
  [CloudFindingSeverity.MEDIUM]: 'bg-severity-medium text-white',
  [CloudFindingSeverity.LOW]: 'bg-severity-low text-white',
  [CloudFindingSeverity.INFO]: 'bg-severity-info text-white',
}

export const CLOUD_FINDING_STATUS_LABEL_KEYS: Record<CloudFindingStatus, string> = {
  [CloudFindingStatus.OPEN]: 'findingStatusOpen',
  [CloudFindingStatus.RESOLVED]: 'findingStatusResolved',
  [CloudFindingStatus.SUPPRESSED]: 'findingStatusSuppressed',
}

export const CLOUD_FINDING_STATUS_CLASSES: Record<CloudFindingStatus, string> = {
  [CloudFindingStatus.OPEN]: 'bg-status-error text-white',
  [CloudFindingStatus.RESOLVED]: 'bg-status-success text-white',
  [CloudFindingStatus.SUPPRESSED]: 'bg-muted text-muted-foreground',
}
