import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import type { UseCloudAccountDeleteDialogParams } from '@/types'

export function useCloudAccountDeleteDialog({
  accountName,
  onConfirm,
}: UseCloudAccountDeleteDialogParams) {
  const t = useTranslations('cloudSecurity')
  const tCommon = useTranslations('common')

  const handleDelete = async () => {
    const confirmed = await SweetAlertDialog.show({
      text: t('confirmDeleteAccount', { name: accountName }),
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
