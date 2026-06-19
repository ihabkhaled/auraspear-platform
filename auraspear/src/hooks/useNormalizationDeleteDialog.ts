import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { UseNormalizationDeleteDialogParams } from '@/types'

export function useNormalizationDeleteDialog({
  pipelineName,
  onConfirm,
}: UseNormalizationDeleteDialogParams) {
  const t = useTranslations('normalization')
  const tCommon = useTranslations('common')

  const handleDelete = async () => {
    const confirmed = await SweetAlertDialog.show({
      text: t('confirmDeletePipeline', { name: pipelineName }),
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
