import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { UseNormalizationDetailPanelParams } from '@/types'

export function useNormalizationDetailPanel({
  pipeline,
  onEdit,
  onDelete,
  onAiVerify,
  aiVerifying,
}: UseNormalizationDetailPanelParams) {
  const t = useTranslations('normalization')
  const tCommon = useTranslations('common')

  const hasData = pipeline !== null

  const handleEdit = useCallback(() => {
    if (pipeline && onEdit) {
      onEdit(pipeline)
    }
  }, [pipeline, onEdit])

  const handleDelete = useCallback(() => {
    if (pipeline && onDelete) {
      onDelete(pipeline)
    }
  }, [pipeline, onDelete])

  const handleAiVerify = useCallback(() => {
    if (pipeline && onAiVerify) {
      onAiVerify(pipeline.id)
    }
  }, [pipeline, onAiVerify])

  return {
    t,
    tCommon,
    hasData,
    handleEdit,
    handleDelete,
    handleAiVerify,
    hasEditAction: Boolean(onEdit),
    hasDeleteAction: Boolean(onDelete),
    hasAiVerifyAction: Boolean(onAiVerify),
    aiVerifying: Boolean(aiVerifying),
  }
}
