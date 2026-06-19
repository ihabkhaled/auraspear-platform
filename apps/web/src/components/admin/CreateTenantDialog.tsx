'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui'
import { useCreateTenantDialog } from '@/hooks'
import type { CreateTenantDialogProps } from '@/types'

export function CreateTenantDialog(props: CreateTenantDialogProps) {
  const { loading } = props
  const {
    t,
    register,
    handleSubmit,
    errors,
    handleNameChange,
    handleFormSubmit,
    handleOpenChange,
  } = useCreateTenantDialog(props)

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('tenants.addTenant')}</DialogTitle>
          <DialogDescription>{t('tenants.addTenantDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">{t('tenants.tenantName')}</Label>
            <Input
              id="tenant-name"
              {...register('name')}
              onChange={handleNameChange}
              placeholder={t('tenants.tenantNamePlaceholder')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-slug">{t('tenants.slug')}</Label>
            <Input
              id="tenant-slug"
              {...register('slug')}
              placeholder={t('tenants.slugPlaceholder')}
              className="font-mono"
            />
            {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
            <p className="text-muted-foreground text-xs">{t('tenants.slugHelp')}</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('tenants.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('tenants.creating') : t('tenants.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
