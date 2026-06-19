import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { AiAgentDeleteDialogProps } from '@/types'

export function useAiAgentDeleteDialog({ agentName, onConfirm }: AiAgentDeleteDialogProps) {
  const t = useTranslations('aiAgents')

  const handleDelete = useCallback(async () => {
    const confirmed = await SweetAlertDialog.show({
      text: t('deleteConfirmText', { name: agentName }),
      icon: SweetAlertIcon.WARNING,
    })
    if (confirmed) {
      onConfirm()
    }
  }, [agentName, onConfirm, t])

  return {
    t,
    handleDelete,
  }
}
