'use client'

import { Controller } from 'react-hook-form'
import {
  Button,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { UserRole } from '@/enums'
import { useUserRoleForm } from '@/hooks'
import type { UserRoleFormProps } from '@/types'

export function UserRoleForm({
  defaultValues,
  availablePermissions,
  onSubmit,
  onCancel,
  loading = false,
}: UserRoleFormProps) {
  const { t, control, handleSubmit, errors } = useUserRoleForm({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label>{t('roles.role')}</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('roles.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.GLOBAL_ADMIN}>{t('roles.globalAdmin')}</SelectItem>
                <SelectItem value={UserRole.TENANT_ADMIN}>{t('roles.tenantAdmin')}</SelectItem>
                <SelectItem value={UserRole.SOC_ANALYST_L2}>{t('roles.socAnalystL2')}</SelectItem>
                <SelectItem value={UserRole.SOC_ANALYST_L1}>{t('roles.socAnalystL1')}</SelectItem>
                <SelectItem value={UserRole.THREAT_HUNTER}>{t('roles.threatHunter')}</SelectItem>
                <SelectItem value={UserRole.EXECUTIVE_READONLY}>
                  {t('roles.executiveReadonly')}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.role && <p className="text-destructive text-sm">{t('roles.roleRequired')}</p>}
      </div>

      <div className="space-y-3">
        <Label>{t('roles.permissions')}</Label>
        <Controller
          name="permissions"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {availablePermissions.map(permission => {
                const isChecked = field.value.includes(permission)
                return (
                  <label
                    key={permission}
                    className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={checked => {
                        if (checked === true) {
                          field.onChange([...field.value, permission])
                        } else {
                          field.onChange(field.value.filter(p => p !== permission))
                        }
                      }}
                    />
                    <span>{permission}</span>
                  </label>
                )
              })}
            </div>
          )}
        />
        {errors.permissions && (
          <p className="text-destructive text-sm">{t('roles.permissionsRequired')}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
