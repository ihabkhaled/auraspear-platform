'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, Toast } from '@/components/common'
import { SweetAlertIcon } from '@/enums'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { useTenantStore } from '@/stores'
import type { UseDeleteWithConfirmationOptions } from '@/types'

export function useDeleteWithConfirmation<TId = string>({
  mutationFn,
  queryKeysToInvalidate,
  confirmText,
  successMessage,
}: UseDeleteWithConfirmationOptions<TId>) {
  const tErrors = useTranslations('errors')
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      Toast.success(successMessage)
      for (const key of queryKeysToInvalidate) {
        void queryClient.invalidateQueries({ queryKey: [...key, tenantId] })
      }
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleDelete = async (id: TId) => {
    const confirmed = await SweetAlertDialog.show({
      text: confirmText,
      icon: SweetAlertIcon.QUESTION,
    })
    if (confirmed) {
      mutation.mutate(id)
    }
  }

  return {
    handleDelete,
    isDeleting: mutation.isPending,
  }
}
