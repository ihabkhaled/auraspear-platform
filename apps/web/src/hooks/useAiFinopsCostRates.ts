'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { AI_CONNECTOR_FALLBACK } from '@/lib/constants/ai-agents'
import { aiUsageService, llmConnectorService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiCostRate, AvailableAiConnector } from '@/types'

export function useAiFinopsCostRates() {
  const t = useTranslations('aiFinops')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const canManage = hasPermission(permissions, Permission.AI_FINOPS_MANAGE)

  const [editingRate, setEditingRate] = useState<AiCostRate | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formProvider, setFormProvider] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formInputCost, setFormInputCost] = useState('0.003')
  const [formOutputCost, setFormOutputCost] = useState('0.015')

  const connectorsQuery = useQuery<AvailableAiConnector[]>({
    queryKey: ['ai-connectors-available', tenantId],
    queryFn: () => llmConnectorService.getAvailable(),
    staleTime: 15_000,
  })
  const availableConnectors = connectorsQuery.data ?? AI_CONNECTOR_FALLBACK

  const ratesQuery = useQuery<AiCostRate[]>({
    queryKey: ['ai-finops-cost-rates', tenantId],
    queryFn: () => aiUsageService.listCostRates(),
    staleTime: 60_000,
  })

  const upsertMutation = useMutation({
    mutationFn: (data: {
      provider: string
      model: string
      inputCostPer1k: number
      outputCostPer1k: number
    }) => aiUsageService.upsertCostRate(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-finops-cost-rates', tenantId] })
      Toast.success(t('costRates.saved'))
      resetForm()
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiUsageService.deleteCostRate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-finops-cost-rates', tenantId] })
      Toast.success(t('costRates.deleted'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  function resetForm() {
    setEditingRate(null)
    setIsAdding(false)
    setFormProvider('')
    setFormModel('')
    setFormInputCost('0.003')
    setFormOutputCost('0.015')
  }

  function startAdd() {
    resetForm()
    setIsAdding(true)
  }

  function startEdit(rate: AiCostRate) {
    setEditingRate(rate)
    setIsAdding(true)
    setFormProvider(rate.provider)
    setFormModel(rate.model)
    setFormInputCost(String(rate.inputCostPer1k))
    setFormOutputCost(String(rate.outputCostPer1k))
  }

  function handleSave() {
    upsertMutation.mutate({
      provider: formProvider.trim(),
      model: formModel.trim(),
      inputCostPer1k: Number(formInputCost),
      outputCostPer1k: Number(formOutputCost),
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id)
  }

  return {
    t,
    canManage,
    availableConnectors,
    rates: Array.isArray(ratesQuery.data) ? ratesQuery.data : [],
    isLoading: ratesQuery.isLoading,
    isAdding,
    editingRate,
    formProvider,
    formModel,
    formInputCost,
    formOutputCost,
    setFormProvider,
    setFormModel,
    setFormInputCost,
    setFormOutputCost,
    isSaving: upsertMutation.isPending,
    startAdd,
    startEdit,
    resetForm,
    handleSave,
    handleDelete,
  }
}
