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
import { useEditTenantDialog } from '@/hooks'
import type { EditTenantDialogProps } from '@/types'

export function EditTenantDialog(props: EditTenantDialogProps) {
  const { loading, tenant } = props
  const { t, register, handleSubmit, errors, handleFormSubmit, handleOpenChange } =
    useEditTenantDialog(props)

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('tenants.editTenant')}</DialogTitle>
          <DialogDescription>{t('tenants.editTenantDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-tenant-name">{t('tenants.tenantName')}</Label>
            <Input
              id="edit-tenant-name"
              {...register('name')}
              placeholder={t('tenants.tenantNamePlaceholder')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('tenants.slug')}</Label>
            <p className="text-muted-foreground font-mono text-sm">{tenant?.slug ?? ''}</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
