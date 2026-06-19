'use client'

import { Controller } from 'react-hook-form'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CloudProvider } from '@/enums'
import { useCloudAccountCreateDialog } from '@/hooks'
import { CLOUD_PROVIDER_LABEL_KEYS } from '@/lib/constants/cloud-security'
import { lookup } from '@/lib/utils'
import type { CloudAccountCreateDialogProps } from '@/types'

export function CloudAccountCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CloudAccountCreateDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useCloudAccountCreateDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('addAccount')}</DialogTitle>
          <DialogDescription>{t('addAccountDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t('fieldProvider')}</Label>
            <Controller
              name="provider"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldProviderPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CloudProvider).map(provider => (
                      <SelectItem key={provider} value={provider}>
                        {t(lookup(CLOUD_PROVIDER_LABEL_KEYS, provider))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cloud-account-id">{t('fieldAccountId')}</Label>
            <Input
              id="cloud-account-id"
              {...register('accountId')}
              placeholder={t('fieldAccountIdPlaceholder')}
              aria-invalid={errors.accountId ? true : undefined}
            />
            {errors.accountId && (
              <p className="text-destructive text-xs">{t('validationAccountId')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cloud-account-alias">{t('fieldAlias')}</Label>
            <Input
              id="cloud-account-alias"
              {...register('alias')}
              placeholder={t('fieldAliasPlaceholder')}
              aria-invalid={errors.alias ? true : undefined}
            />
            {errors.alias && <p className="text-destructive text-xs">{t('validationAlias')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cloud-account-region">{t('fieldRegion')}</Label>
            <Input
              id="cloud-account-region"
              {...register('region')}
              placeholder={t('fieldRegionPlaceholder')}
              aria-invalid={errors.region ? true : undefined}
            />
            {errors.region && <p className="text-destructive text-xs">{t('validationRegion')}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('creating') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
