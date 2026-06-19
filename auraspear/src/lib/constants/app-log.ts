import type { AppLogMetadataFieldConfig } from '@/types'

export const APP_LOG_EXTRACTED_METADATA_KEYS = [
  'remoteError',
  'error',
  'connectorType',
  'status',
  'latencyMs',
  'model',
  'version',
  'count',
] as const

export const APP_LOG_METADATA_FIELD_CONFIGS: AppLogMetadataFieldConfig[] = [
  { key: 'remoteError', labelKey: 'metadataRemoteError', isError: true },
  { key: 'error', labelKey: 'metadataError', isError: true },
  { key: 'connectorType', labelKey: 'metadataConnectorType' },
  { key: 'status', labelKey: 'metadataStatus' },
  { key: 'latencyMs', labelKey: 'metadataLatency', suffix: 'ms' },
  { key: 'model', labelKey: 'metadataModel' },
  { key: 'version', labelKey: 'metadataVersion' },
  { key: 'count', labelKey: 'metadataCount' },
]
