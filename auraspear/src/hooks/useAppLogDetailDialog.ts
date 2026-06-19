import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  APP_LOG_EXTRACTED_METADATA_KEYS,
  APP_LOG_METADATA_FIELD_CONFIGS,
} from '@/lib/constants/app-log'
import type { AppLogExtractedMetadataField, ApplicationLogEntry } from '@/types'

export function useAppLogDetailDialog(log: ApplicationLogEntry | null) {
  const t = useTranslations('admin.appLogs')

  const { extractedFields, remainingMetadata } = useMemo(() => {
    if (!log?.metadata || Object.keys(log.metadata).length === 0) {
      return { extractedFields: [] as AppLogExtractedMetadataField[], remainingMetadata: null }
    }

    const { metadata } = log
    const fields: AppLogExtractedMetadataField[] = []

    for (const config of APP_LOG_METADATA_FIELD_CONFIGS) {
      const rawValue = Reflect.get(metadata, config.key) as unknown
      if (rawValue === null || rawValue === undefined) {
        continue
      }

      fields.push({
        key: config.key,
        label: t(config.labelKey),
        value: `${String(rawValue)}${config.suffix ?? ''}`,
        isError: config.isError ?? false,
      })
    }

    const extractedKeySet = new Set<string>(APP_LOG_EXTRACTED_METADATA_KEYS)
    const remaining = Object.fromEntries(
      Object.entries(metadata).filter(([key]) => !extractedKeySet.has(key))
    )

    const hasRemaining = Object.keys(remaining).length > 0

    return {
      extractedFields: fields,
      remainingMetadata: hasRemaining ? remaining : null,
    }
  }, [log, t])

  return { t, extractedFields, remainingMetadata }
}
