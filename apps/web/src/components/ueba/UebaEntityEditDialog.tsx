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
import { UebaEntityType } from '@/enums'
import { useUebaEntityEditDialog } from '@/hooks'
import { UEBA_ENTITY_TYPE_LABEL_KEYS } from '@/lib/constants/ueba'
import { lookup } from '@/lib/utils'
import type { UebaEntityEditDialogProps } from '@/types'

export function UebaEntityEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: UebaEntityEditDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useUebaEntityEditDialog({ open, onOpenChange, onSubmit, initialValues })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('editEntity')}</DialogTitle>
          <DialogDescription>{t('editEntityDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-entity-name">{t('fieldEntityName')}</Label>
            <Input
              id="edit-entity-name"
              {...register('entityName')}
              placeholder={t('fieldEntityNamePlaceholder')}
              aria-invalid={errors.entityName ? true : undefined}
            />
            {errors.entityName && (
              <p className="text-destructive text-xs">{t('validationEntityNameMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldEntityType')}</Label>
            <Controller
              name="entityType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldEntityTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UebaEntityType).map(type => (
                      <SelectItem key={type} value={type}>
                        {t(lookup(UEBA_ENTITY_TYPE_LABEL_KEYS, type))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.entityType && (
              <p className="text-destructive text-xs">{t('validationEntityType')}</p>
            )}
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
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
