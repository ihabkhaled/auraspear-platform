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
import { ReportFormat, ReportType } from '@/enums'
import { useReportCreateDialog } from '@/hooks'
import { REPORT_FORMAT_LABEL_KEYS, REPORT_TYPE_LABEL_KEYS } from '@/lib/constants/reports'
import { lookup } from '@/lib/utils'
import type { ReportCreateDialogProps } from '@/types'

export function ReportCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: ReportCreateDialogProps) {
  const { t, register, control, errors, onFormSubmit, handleOpenChange } = useReportCreateDialog({
    open,
    onOpenChange,
    onSubmit,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-name">{t('fieldName')}</Label>
            <Input
              id="report-name"
              {...register('name')}
              placeholder={t('fieldNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{t('validationNameMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-description">{t('fieldDescription')}</Label>
            <Textarea
              id="report-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
              rows={3}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldType')}</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ReportType).map(reportType => (
                      <SelectItem key={reportType} value={reportType}>
                        {t(lookup(REPORT_TYPE_LABEL_KEYS, reportType))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldFormat')}</Label>
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldFormatPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ReportFormat).map(fmt => (
                      <SelectItem key={fmt} value={fmt}>
                        {t(lookup(REPORT_FORMAT_LABEL_KEYS, fmt))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-parameters">{t('fieldParameters')}</Label>
            <Textarea
              id="report-parameters"
              {...register('parameters')}
              placeholder={t('fieldParametersPlaceholder')}
              aria-invalid={errors.parameters ? true : undefined}
              className="resize-none font-mono text-xs"
              rows={4}
            />
            {errors.parameters && (
              <p className="text-destructive text-xs">{t('validationParametersJson')}</p>
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
              {loading ? t('creating') : t('submitButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
