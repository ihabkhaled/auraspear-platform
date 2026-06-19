export enum NormalizationSourceType {
  SYSLOG = 'syslog',
  JSON = 'json',
  CSV = 'csv',
  CEF = 'cef',
  LEEF = 'leef',
  CUSTOM = 'custom',
}

export enum NormalizationPipelineStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}
