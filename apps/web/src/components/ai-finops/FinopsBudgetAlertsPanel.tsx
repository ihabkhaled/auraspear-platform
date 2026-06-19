'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable, LoadingSpinner } from '@/components/common'
import { Badge, Button, Input, Switch } from '@/components/ui'
import { useAiFinopsBudgetAlerts } from '@/hooks'
import type { AiBudgetAlert, Column } from '@/types'

export function FinopsBudgetAlertsPanel() {
  const {
    t,
    canManage,
    alerts,
    isLoading,
    isAdding,
    formScope,
    formScopeKey,
    formBudget,
    formThresholds,
    setFormScope,
    setFormScopeKey,
    setFormBudget,
    setFormThresholds,
    isSaving,
    startAdd,
    startEdit,
    resetForm,
    handleSave,
    handleDelete,
    handleToggle,
  } = useAiFinopsBudgetAlerts()

  const columns: Column<AiBudgetAlert>[] = [
    { key: 'scope', label: t('budgetAlerts.scope') },
    {
      key: 'scopeKey',
      label: t('budgetAlerts.scopeKey'),
      render: value => (value as string | null) ?? '-',
    },
    {
      key: 'monthlyBudget',
      label: t('budgetAlerts.monthlyBudget'),
      render: value => `$${Number(value ?? 0).toFixed(2)}`,
    },
    { key: 'alertThresholds', label: t('budgetAlerts.thresholds') },
    {
      key: 'lastAlertPct',
      label: t('budgetAlerts.lastTriggered'),
      render: value => {
        const pct = Number(value ?? 0)
        if (pct === 0) return '-'
        return <Badge variant="warning">{`${String(pct)}%`}</Badge>
      },
    },
    {
      key: 'enabled',
      label: t('budgetAlerts.enabled'),
      render: (_value, row) => (
        <Switch
          checked={row.enabled}
          disabled={!canManage}
          onCheckedChange={checked => handleToggle(row.id, checked)}
        />
      ),
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
            {t('budgetAlerts.add')}
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="bg-muted/50 grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder={t('budgetAlerts.scope')}
            value={formScope}
            onChange={e => setFormScope(e.currentTarget.value)}
          />
          <Input
            placeholder={t('budgetAlerts.scopeKey')}
            value={formScopeKey}
            onChange={e => setFormScopeKey(e.currentTarget.value)}
          />
          <Input
            type="number"
            step="1"
            placeholder={t('budgetAlerts.monthlyBudget')}
            value={formBudget}
            onChange={e => setFormBudget(e.currentTarget.value)}
          />
          <Input
            placeholder={t('budgetAlerts.thresholds')}
            value={formThresholds}
            onChange={e => setFormThresholds(e.currentTarget.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || formScope.trim().length === 0}
            >
              {t('budgetAlerts.save')}
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              {t('budgetAlerts.cancel')}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={alerts}
        emptyMessage={t('budgetAlerts.empty')}
        loading={false}
      />
    </div>
  )
}
