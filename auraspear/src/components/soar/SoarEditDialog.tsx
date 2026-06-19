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
import { SoarTriggerType } from '@/enums'
import { useSoarEditDialog } from '@/hooks'
import { SOAR_TRIGGER_TYPE_LABEL_KEYS } from '@/lib/constants/soar'
import { lookup } from '@/lib/utils'
import type { SoarEditDialogProps } from '@/types'

export function SoarEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: SoarEditDialogProps) {
  const { t, register, control, errors, triggerType, onFormSubmit, handleOpenChange } =
    useSoarEditDialog({ open, onOpenChange, onSubmit, initialValues })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="soar-edit-name">{t('fieldName')}</Label>
            <Input
              id="soar-edit-name"
              {...register('name')}
              placeholder={t('fieldNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{t('validationNameMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="soar-edit-description">{t('fieldDescription')}</Label>
            <Textarea
              id="soar-edit-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldTriggerType')}</Label>
            <Controller
              name="triggerType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldTriggerTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SoarTriggerType).map(trigger => (
                      <SelectItem key={trigger} value={trigger}>
                        {t(lookup(SOAR_TRIGGER_TYPE_LABEL_KEYS, trigger))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="soar-edit-steps">{t('fieldSteps')}</Label>
            <Textarea
              id="soar-edit-steps"
              {...register('steps')}
              placeholder={t('fieldStepsPlaceholder')}
              aria-invalid={errors.steps ? true : undefined}
              className="resize-none font-mono text-xs"
              rows={6}
            />
            {errors.steps && (
              <p className="text-destructive text-xs">
                {errors.steps.type === 'custom'
                  ? t('validationStepsJson')
                  : t('validationStepsMin')}
              </p>
            )}
          </div>

          {triggerType !== SoarTriggerType.MANUAL && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="soar-edit-trigger-conditions">{t('fieldTriggerConditions')}</Label>
              <Textarea
                id="soar-edit-trigger-conditions"
                {...register('triggerConditions')}
                placeholder={t('fieldTriggerConditionsPlaceholder')}
                className="resize-none font-mono text-xs"
                rows={4}
              />
            </div>
          )}

          {triggerType === SoarTriggerType.SCHEDULED && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="soar-edit-cron">{t('fieldCron')}</Label>
              <Input
                id="soar-edit-cron"
                {...register('cronExpression')}
                placeholder={t('fieldCronPlaceholder')}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('cancelButton')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('saveButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
