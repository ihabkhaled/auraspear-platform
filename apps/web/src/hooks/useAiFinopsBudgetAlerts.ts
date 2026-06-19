'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { aiUsageService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiBudgetAlert } from '@/types'

export function useAiFinopsBudgetAlerts() {
  const t = useTranslations('aiFinops')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const canManage = hasPermission(permissions, Permission.AI_FINOPS_MANAGE)

  const [isAdding, setIsAdding] = useState(false)
  const [editingAlert, setEditingAlert] = useState<AiBudgetAlert | null>(null)
  const [formScope, setFormScope] = useState('tenant')
  const [formScopeKey, setFormScopeKey] = useState('')
  const [formBudget, setFormBudget] = useState('1000')
  const [formThresholds, setFormThresholds] = useState('50,75,90,100')

  const alertsQuery = useQuery<AiBudgetAlert[]>({
    queryKey: ['ai-finops-budget-alerts', tenantId],
    queryFn: () => aiUsageService.listBudgetAlerts(),
    staleTime: 60_000,
  })

  const invalidateAlerts = () => {
    void queryClient.invalidateQueries({ queryKey: ['ai-finops-budget-alerts', tenantId] })
    void queryClient.invalidateQueries({ queryKey: ['ai-finops-dashboard', tenantId] })
  }

  const createMutation = useMutation({
    mutationFn: (data: {
      scope: string
      scopeKey?: string
      monthlyBudget: number
      alertThresholds: string
    }) => aiUsageService.upsertBudgetAlert(data),
    onSuccess: () => {
      invalidateAlerts()
      Toast.success(t('budgetAlerts.saved'))
      resetForm()
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        scope?: string
        scopeKey?: string | null
        monthlyBudget?: number
        alertThresholds?: string
      }
    }) => aiUsageService.updateBudgetAlert(id, data),
    onSuccess: () => {
      invalidateAlerts()
      Toast.success(t('budgetAlerts.saved'))
      resetForm()
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiUsageService.deleteBudgetAlert(id),
    onSuccess: () => {
      invalidateAlerts()
      Toast.success(t('budgetAlerts.deleted'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      aiUsageService.toggleBudgetAlert(id, enabled),
    onSuccess: () => {
      invalidateAlerts()
    },
    onError: buildErrorToastHandler(tErrors),
  })

  function resetForm() {
    setEditingAlert(null)
    setIsAdding(false)
    setFormScope('tenant')
    setFormScopeKey('')
    setFormBudget('1000')
    setFormThresholds('50,75,90,100')
  }

  function startAdd() {
    resetForm()
    setIsAdding(true)
  }

  function startEdit(alert: AiBudgetAlert) {
    setEditingAlert(alert)
    setIsAdding(true)
    setFormScope(alert.scope)
    setFormScopeKey(alert.scopeKey ?? '')
    setFormBudget(String(alert.monthlyBudget))
    setFormThresholds(alert.alertThresholds)
  }

  function handleSave() {
    const scopeKey = formScopeKey.trim()

    if (editingAlert) {
      updateMutation.mutate({
        id: editingAlert.id,
        data: {
          scope: formScope,
          scopeKey: scopeKey.length > 0 ? scopeKey : null,
          monthlyBudget: Number(formBudget),
          alertThresholds: formThresholds.trim(),
        },
      })
    } else {
      const payload: {
        scope: string
        scopeKey?: string
        monthlyBudget: number
        alertThresholds: string
      } = {
        scope: formScope,
        monthlyBudget: Number(formBudget),
        alertThresholds: formThresholds.trim(),
      }
      if (scopeKey.length > 0) {
        payload.scopeKey = scopeKey
      }
      createMutation.mutate(payload)
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id)
  }

  function handleToggle(id: string, enabled: boolean) {
    toggleMutation.mutate({ id, enabled })
  }

  return {
    t,
    canManage,
    alerts: Array.isArray(alertsQuery.data) ? alertsQuery.data : [],
    isLoading: alertsQuery.isLoading,
    isAdding,
    editingAlert,
    formScope,
    formScopeKey,
    formBudget,
    formThresholds,
    setFormScope,
    setFormScopeKey,
    setFormBudget,
    setFormThresholds,
    isSaving: createMutation.isPending || updateMutation.isPending,
    startAdd,
    startEdit,
    resetForm,
    handleSave,
    handleDelete,
    handleToggle,
  }
}
