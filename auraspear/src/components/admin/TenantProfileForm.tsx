'use client'

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { TenantEnvironment } from '@/enums'
import { useTenantProfileForm } from '@/hooks'
import type { TenantProfileFormProps } from '@/types'

export function TenantProfileForm({
  defaultValues,
  onSubmit,
  onCancel,
  loading = false,
}: TenantProfileFormProps) {
  const { t, register, handleSubmit, setValue, errors, currentEnvironment } = useTenantProfileForm({
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="tenant-name">{t('tenant.name')}</Label>
        <Input id="tenant-name" {...register('name')} placeholder={t('tenant.namePlaceholder')} />
        {errors.name && <p className="text-destructive text-sm">{t('tenant.nameRequired')}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t('tenant.environment')}</Label>
        <Select
          value={currentEnvironment}
          onValueChange={val => setValue('environment', val as TenantEnvironment)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('tenant.selectEnvironment')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TenantEnvironment.PRODUCTION}>
              {t('tenant.envProduction')}
            </SelectItem>
            <SelectItem value={TenantEnvironment.STAGING}>{t('tenant.envStaging')}</SelectItem>
            <SelectItem value={TenantEnvironment.DEVELOPMENT}>
              {t('tenant.envDevelopment')}
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.environment && (
          <p className="text-destructive text-sm">{t('tenant.environmentRequired')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tenant-settings">{t('tenant.settings')}</Label>
        <Input
          id="tenant-settings"
          {...register('settings')}
          placeholder={t('tenant.settingsPlaceholder')}
        />
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
