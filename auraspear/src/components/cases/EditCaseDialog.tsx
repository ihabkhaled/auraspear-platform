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
  Textarea,
} from '@/components/ui'
import { CaseSeverity } from '@/enums'
import { useEditCaseDialog } from '@/hooks'
import type { EditCaseDialogProps } from '@/types'

export function EditCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: EditCaseDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useEditCaseDialog({ open, onOpenChange, onSubmit, initialValues })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('editCase')}</DialogTitle>
          <DialogDescription>{t('editCaseDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-case-title">{t('fieldTitle')}</Label>
            <Input
              id="edit-case-title"
              {...register('title')}
              placeholder={t('fieldTitlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-destructive text-xs">{t('validationTitleMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-case-description">{t('fieldDescription')}</Label>
            <Textarea
              id="edit-case-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              rows={4}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldSeverity')}</Label>
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldSeverityPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CaseSeverity).map(severity => (
                      <SelectItem key={severity} value={severity} className="capitalize">
                        {severity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.severity && (
              <p className="text-destructive text-xs">{t('validationSeverity')}</p>
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
