'use client'

import { RoleSettingsMatrix, RoleSettingsToolbar } from '@/components/admin'
import { PageHeader, LoadingSpinner } from '@/components/common'
import { Card, CardContent } from '@/components/ui'
import { useRoleSettingsPage } from '@/hooks'

export default function RoleSettingsPage() {
  const {
    t,
    isLoading,
    isDirty,
    isSaving,
    isResetting,
    permissionGroups,
    permissionLabelMap,
    configurableRoles,
    handleToggle,
    handleSave,
    handleReset,
    isChecked,
    isToggleDisabled,
    canEditRoles,
    canResetDefaults,
  } = useRoleSettingsPage()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('roleSettings.title')} description={t('roleSettings.description')} />

      <Card>
        <CardContent className="space-y-4 pt-6">
          {canEditRoles && (
            <RoleSettingsToolbar
              isDirty={isDirty}
              isSaving={isSaving}
              isResetting={isResetting}
              showReset={canResetDefaults}
              onSave={handleSave}
              onReset={handleReset}
              t={t}
            />
          )}

          <RoleSettingsMatrix
            permissionGroups={permissionGroups}
            configurableRoles={configurableRoles}
            isChecked={isChecked}
            onToggle={handleToggle}
            isToggleDisabled={isToggleDisabled}
            disabled={!canEditRoles || isSaving || isResetting}
            permissionLabelMap={permissionLabelMap}
            t={t}
          />
        </CardContent>
      </Card>
    </div>
  )
}
