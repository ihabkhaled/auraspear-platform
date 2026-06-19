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
import { NormalizationSourceType } from '@/enums'
import { useNormalizationCreateDialog } from '@/hooks'
import { NORMALIZATION_SOURCE_TYPE_LABEL_KEYS } from '@/lib/constants/normalization'
import { lookup } from '@/lib/utils'
import type { NormalizationCreateDialogProps } from '@/types'

export function NormalizationCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: NormalizationCreateDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useNormalizationCreateDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('createPipeline')}</DialogTitle>
          <DialogDescription>{t('createPipelineDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pipeline-name">{t('fieldPipelineName')}</Label>
            <Input
              id="pipeline-name"
              {...register('name')}
              placeholder={t('fieldPipelineNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{t('validationName')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('fieldSourceType')}</Label>
            <Controller
              name="sourceType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fieldSourceTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(NormalizationSourceType).map(src => (
                      <SelectItem key={src} value={src}>
                        {t(lookup(NORMALIZATION_SOURCE_TYPE_LABEL_KEYS, src))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="parser-config">{t('fieldParserConfig')}</Label>
            <Textarea
              id="parser-config"
              {...register('parserConfig')}
              placeholder={t('fieldParserConfigPlaceholder')}
              aria-invalid={errors.parserConfig ? true : undefined}
              className="resize-none font-mono text-sm"
              rows={4}
            />
            {errors.parserConfig && (
              <p className="text-destructive text-xs">{t('validationParserConfigJson')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="field-mappings">{t('fieldFieldMappings')}</Label>
            <Textarea
              id="field-mappings"
              {...register('fieldMappings')}
              placeholder={t('fieldFieldMappingsPlaceholder')}
              aria-invalid={errors.fieldMappings ? true : undefined}
              className="resize-none font-mono text-sm"
              rows={4}
            />
            {errors.fieldMappings && (
              <p className="text-destructive text-xs">{t('validationFieldMappingsJson')}</p>
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
