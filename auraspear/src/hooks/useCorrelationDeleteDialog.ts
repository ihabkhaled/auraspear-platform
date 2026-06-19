import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { CorrelationRule } from '@/types'

export function useCorrelationDeleteDialog(
  rule: CorrelationRule | null,
  onConfirm: (id: string) => void
) {
  const t = useTranslations('correlation')
  const previousRuleRef = useRef(rule)

  const confirmDelete = useCallback(
    async (targetRule: CorrelationRule) => {
      const confirmed = await SweetAlertDialog.show({
        title: t('deleteRuleTitle'),
        text: t('deleteConfirmMessage', {
          ruleNumber: targetRule.ruleNumber,
          title: targetRule.title,
        }),
        icon: SweetAlertIcon.WARNING,
      })

      if (confirmed) {
        onConfirm(targetRule.id)
      }
    },
    [onConfirm, t]
  )

  useEffect(() => {
    if (rule && rule !== previousRuleRef.current) {
      previousRuleRef.current = rule
      void confirmDelete(rule)
    }
  }, [rule, confirmDelete])

  return {
    confirmDelete,
  }
}
