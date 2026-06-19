import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { roleSettingsService } from '@/services'

export function useRoleSettingsPageCrud(state: {
  localMatrix: Record<string, string[]>
  setLocalMatrix: (matrix: Record<string, string[]>) => void
  setIsDirty: (dirty: boolean) => void
  permissions: string[]
}) {
  const t = useTranslations()
  const tErrors = useTranslations('errors')
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (matrix: Record<string, string[]>) => {
      requirePermission(state.permissions, Permission.ROLE_SETTINGS_UPDATE)
      return roleSettingsService.updatePermissionMatrix(matrix)
    },
    onSuccess: response => {
      state.setLocalMatrix({ ...response.data.matrix })
      state.setIsDirty(false)
      void queryClient.invalidateQueries({ queryKey: ['role-settings'] })
      Toast.success(t('roleSettings.saved'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const resetMutation = useMutation({
    mutationFn: () => {
      requirePermission(state.permissions, Permission.ROLE_SETTINGS_UPDATE)
      return roleSettingsService.resetToDefaults()
    },
    onSuccess: response => {
      state.setLocalMatrix({ ...response.data.matrix })
      state.setIsDirty(false)
      void queryClient.invalidateQueries({ queryKey: ['role-settings'] })
      Toast.success(t('roleSettings.resetSuccess'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleSave = useCallback(() => {
    updateMutation.mutate(state.localMatrix)
  }, [state.localMatrix, updateMutation])

  const handleReset = useCallback(() => {
    resetMutation.mutate()
  }, [resetMutation])

  return {
    handleSave,
    handleReset,
    isSaving: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  }
}
