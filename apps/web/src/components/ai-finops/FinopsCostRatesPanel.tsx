'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable, LoadingSpinner } from '@/components/common'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useAiFinopsCostRates } from '@/hooks'
import type { AiCostRate, Column } from '@/types'

export function FinopsCostRatesPanel() {
  const {
    t,
    canManage,
    availableConnectors,
    rates,
    isLoading,
    isAdding,
    formProvider,
    formInputCost,
    formOutputCost,
    setFormProvider,
    setFormModel,
    setFormInputCost,
    setFormOutputCost,
    isSaving,
    startAdd,
    startEdit,
    resetForm,
    handleSave,
    handleDelete,
  } = useAiFinopsCostRates()

  const resolveConnectorName = (key: string): string => {
    const connector = availableConnectors.find(c => c.key === key)
    return connector?.label ?? key
  }

  const columns: Column<AiCostRate>[] = [
    {
      key: 'provider',
      label: t('costRates.provider'),
      render: value => <span>{resolveConnectorName(value as string)}</span>,
    },
    {
      key: 'model',
      label: t('costRates.model'),
      render: value => <span>{resolveConnectorName(value as string)}</span>,
    },
    {
      key: 'inputCostPer1k',
      label: t('costRates.inputCostPer1k'),
      render: value => `$${Number(value ?? 0).toFixed(4)}`,
    },
    {
      key: 'outputCostPer1k',
      label: t('costRates.outputCostPer1k'),
      render: value => `$${Number(value ?? 0).toFixed(4)}`,
    },
  ]

  if (canManage) {
    columns.push({
      key: 'id',
      label: '',
      render: (_value, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="text-status-error h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    })
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {canManage && !isAdding && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={startAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('costRates.add')}
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="bg-muted/50 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={formProvider || 'none'} onValueChange={v => {
            setFormProvider(v === 'none' ? '' : v)
            setFormModel(v === 'none' ? '' : v)
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t('costRates.selectProvider')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('costRates.selectProvider')}</SelectItem>
              {availableConnectors.map(c => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.0001"
            placeholder={t('costRates.inputCostPer1k')}
            value={formInputCost}
            onChange={e => setFormInputCost(e.currentTarget.value)}
          />
          <Input
            type="number"
            step="0.0001"
            placeholder={t('costRates.outputCostPer1k')}
            value={formOutputCost}
            onChange={e => setFormOutputCost(e.currentTarget.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || formProvider.trim().length === 0}
            >
              {t('costRates.save')}
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              {t('costRates.cancel')}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rates}
        emptyMessage={t('costRates.empty')}
        loading={false}
      />
    </div>
  )
}
