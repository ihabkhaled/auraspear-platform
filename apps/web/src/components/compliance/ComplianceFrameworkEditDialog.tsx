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
import { ComplianceStandard } from '@/enums'
import { useComplianceEditDialog } from '@/hooks'
import { COMPLIANCE_STANDARD_LABEL_KEYS } from '@/lib/constants/compliance'
import { lookup } from '@/lib/utils'
import type { ComplianceEditDialogProps } from '@/types'

export function ComplianceFrameworkEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  loading = false,
}: ComplianceEditDialogProps) {
  const { t, register, control, errors, onFormSubmit, handleOpenChange } = useComplianceEditDialog({
    open,
    onOpenChange,
    onSubmit,
    initialValues,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>{t('editDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="compliance-edit-name">{t('fieldName')}</Label>
            <Input
              id="compliance-edit-name"
              {...register('name')}
              placeholder={t('fieldNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{t('validationNameMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldStandard')}</Label>
            <Controller
              name="standard"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldStandardPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ComplianceStandard).map(standard => (
                      <SelectItem key={standard} value={standard}>
                        {t(lookup(COMPLIANCE_STANDARD_LABEL_KEYS, standard))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="compliance-edit-version">{t('fieldVersion')}</Label>
            <Input
              id="compliance-edit-version"
              {...register('version')}
              placeholder={t('fieldVersionPlaceholder')}
              aria-invalid={errors.version ? true : undefined}
            />
            {errors.version && (
              <p className="text-destructive text-xs">{t('validationVersionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="compliance-edit-description">{t('fieldDescription')}</Label>
            <Textarea
              id="compliance-edit-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
              rows={4}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

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
