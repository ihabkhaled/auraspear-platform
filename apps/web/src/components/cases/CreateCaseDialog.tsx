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
import { useCreateCaseDialog } from '@/hooks'
import type { CreateCaseDialogProps } from '@/types'

export function CreateCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  assigneeOptions,
  cycleOptions = [],
  loading = false,
}: CreateCaseDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useCreateCaseDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('createCase')}</DialogTitle>
          <DialogDescription>{t('createCaseDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-title">{t('fieldTitle')}</Label>
            <Input
              id="case-title"
              {...register('title')}
              placeholder={t('fieldTitlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-destructive text-xs">{t('validationTitleMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="case-description">{t('fieldDescription')}</Label>
            <Textarea
              id="case-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none break-words"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-2">
              <Label>{t('fieldAssignee')}</Label>
              <Controller
                name="assignee"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full overflow-hidden *:data-[slot=select-value]:!block *:data-[slot=select-value]:truncate">
                      <SelectValue placeholder={t('fieldAssigneePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assignee && (
                <p className="text-destructive text-xs">{t('validationAssignee')}</p>
              )}
            </div>

            {cycleOptions.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>{t('cycles.cycle')}</Label>
                <Controller
                  name="cycleId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={val => {
                        field.onChange(val || undefined)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('cycles.assignToCycle')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cycleOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
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
              {loading ? t('creating') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
