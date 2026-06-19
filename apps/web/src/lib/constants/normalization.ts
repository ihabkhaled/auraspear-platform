import { NormalizationPipelineStatus, NormalizationSourceType } from '@/enums'

export const NORMALIZATION_SOURCE_TYPE_LABEL_KEYS: Record<NormalizationSourceType, string> = {
  [NormalizationSourceType.SYSLOG]: 'sourceSyslog',
  [NormalizationSourceType.JSON]: 'sourceJson',
  [NormalizationSourceType.CSV]: 'sourceCsv',
  [NormalizationSourceType.CEF]: 'sourceCef',
  [NormalizationSourceType.LEEF]: 'sourceLeef',
  [NormalizationSourceType.CUSTOM]: 'sourceCustom',
}

export const NORMALIZATION_PIPELINE_STATUS_LABEL_KEYS: Record<NormalizationPipelineStatus, string> =
  {
    [NormalizationPipelineStatus.ACTIVE]: 'statusActive',
    [NormalizationPipelineStatus.INACTIVE]: 'statusInactive',
    [NormalizationPipelineStatus.ERROR]: 'statusError',
  }

export const NORMALIZATION_PIPELINE_STATUS_CLASSES: Record<NormalizationPipelineStatus, string> = {
  [NormalizationPipelineStatus.ACTIVE]: 'bg-status-success text-white',
  [NormalizationPipelineStatus.INACTIVE]: 'bg-muted text-muted-foreground',
  [NormalizationPipelineStatus.ERROR]: 'bg-status-error text-white',
}
