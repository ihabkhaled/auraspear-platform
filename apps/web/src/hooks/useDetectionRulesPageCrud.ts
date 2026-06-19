'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon, Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { safeJsonParse } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type {
  CreateDetectionRuleFormValues,
  DetectionRule,
  EditDetectionRuleFormValues,
} from '@/types'
import {
  useCreateDetectionRule,
  useUpdateDetectionRule,
  useDeleteDetectionRule,
  useToggleDetectionRule,
} from './useDetectionRules'

export function useDetectionRulesPageCrud(dialogs: {
  setCreateOpen: (open: boolean) => void
  setEditOpen: (open: boolean) => void
  setDetailOpen: (open: boolean) => void
  selectedRule: DetectionRule | null
  setSelectedRule: (rule: DetectionRule | null) => void
}) {
  const t = useTranslations('detectionRules')
  const permissions = useAuthStore(s => s.permissions)

  const canManageRules = hasPermission(permissions, Permission.DETECTION_RULES_CREATE)
  const canEditRule = hasPermission(permissions, Permission.DETECTION_RULES_UPDATE)
  const canDeleteRule = hasPermission(permissions, Permission.DETECTION_RULES_DELETE)
  const canToggleRule = hasPermission(permissions, Permission.DETECTION_RULES_TOGGLE)

  const createMutation = useCreateDetectionRule()
  const updateMutation = useUpdateDetectionRule()
  const deleteMutation = useDeleteDetectionRule()
  const toggleMutation = useToggleDetectionRule()

  const handleCreate = useCallback(
    (formData: CreateDetectionRuleFormValues) => {
      const payload: Record<string, unknown> = {
        name: formData.name,
        ruleType: formData.ruleType,
        severity: formData.severity,
        conditions: safeJsonParse(formData.conditions, {}),
        actions: safeJsonParse(formData.actions, {}),
      }
      createMutation.mutate(payload, {
        onSuccess: () => {
          Toast.success(t('createSuccess'))
          dialogs.setCreateOpen(false)
        },
        onError: () => {
          Toast.error(t('createError'))
        },
      })
    },
    [createMutation, t, dialogs]
  )

  const handleEdit = useCallback(
    (formData: EditDetectionRuleFormValues) => {
      if (!dialogs.selectedRule) {
        return
      }
      const payload: Record<string, unknown> = {
        name: formData.name,
        ruleType: formData.ruleType,
        severity: formData.severity,
        status: formData.status,
        conditions: safeJsonParse(formData.conditions, {}),
        actions: safeJsonParse(formData.actions, {}),
      }
      updateMutation.mutate(
        { id: dialogs.selectedRule.id, data: payload },
        {
          onSuccess: () => {
            Toast.success(t('editSuccess'))
            dialogs.setEditOpen(false)
            dialogs.setSelectedRule(null)
          },
          onError: () => {
            Toast.error(t('editError'))
          },
        }
      )
    },
    [updateMutation, dialogs, t]
  )

  const handleDelete = useCallback(
    async (rule: DetectionRule) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('confirmDeleteRule', { name: rule.name }),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) {
        return
      }
      deleteMutation.mutate(rule.id, {
        onSuccess: () => {
          Toast.success(t('deleteSuccess'))
          dialogs.setDetailOpen(false)
          dialogs.setSelectedRule(null)
        },
        onError: () => {
          Toast.error(t('deleteError'))
        },
      })
    },
    [deleteMutation, t, dialogs]
  )

  const handleToggle = useCallback(
    (rule: DetectionRule) => {
      const isCurrentlyEnabled = rule.status !== 'disabled'
      toggleMutation.mutate(
        { id: rule.id, enabled: !isCurrentlyEnabled },
        {
          onSuccess: () => {
            Toast.success(t('toggleSuccess'))
          },
          onError: () => {
            Toast.error(t('toggleError'))
          },
        }
      )
    },
    [toggleMutation, t]
  )

  return {
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggle,
    createLoading: createMutation.isPending,
    editLoading: updateMutation.isPending,
    deleteLoading: deleteMutation.isPending,
    toggleLoading: toggleMutation.isPending,
    canManageRules,
    canEditRule,
    canDeleteRule,
    canToggleRule,
  }
}
