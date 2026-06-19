import { useTranslations } from 'next-intl'
import { formatDate } from '@/lib/utils'
import type { UseCorrelationDetailPanelParams } from '@/types'

export function useCorrelationDetailPanel({
  rule,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: UseCorrelationDetailPanelParams) {
  const t = useTranslations('correlation')

  const formattedCreatedAt = rule?.createdAt ? formatDate(rule.createdAt) : '-'
  const formattedUpdatedAt = rule?.updatedAt ? formatDate(rule.updatedAt) : '-'
  const formattedLastFiredAt = rule?.lastFiredAt ? formatDate(rule.lastFiredAt) : '-'

  const handleEdit = () => {
    if (rule) {
      onEdit?.(rule)
    }
  }

  const handleDelete = () => {
    if (rule) {
      onDelete?.(rule)
    }
  }

  return {
    t,
    open,
    onOpenChange,
    rule,
    formattedCreatedAt,
    formattedUpdatedAt,
    formattedLastFiredAt,
    handleEdit,
    handleDelete,
  }
}
