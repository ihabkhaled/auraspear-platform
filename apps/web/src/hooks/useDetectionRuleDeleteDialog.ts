import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { UseDetectionRuleDeleteDialogParams } from '@/types'

export function useDetectionRuleDeleteDialog({
  ruleName,
  onConfirm,
}: UseDetectionRuleDeleteDialogParams) {
  const t = useTranslations('detectionRules')
  const tCommon = useTranslations('common')

  const handleDelete = async () => {
    const confirmed = await SweetAlertDialog.show({
      text: t('confirmDeleteRule', { name: ruleName }),
      icon: SweetAlertIcon.WARNING,
      confirmButtonText: tCommon('delete'),
      cancelButtonText: tCommon('cancel'),
    })
    if (confirmed) {
      onConfirm()
    }
  }

  return { t, handleDelete }
}
