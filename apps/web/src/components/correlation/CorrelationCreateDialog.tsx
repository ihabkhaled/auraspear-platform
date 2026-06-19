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
import { RuleSeverity, RuleSource, RuleStatus } from '@/enums'
import { useCorrelationCreateDialog } from '@/hooks'
import type { CorrelationCreateDialogProps } from '@/types'

export function CorrelationCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CorrelationCreateDialogProps) {
  const {
    t,
    register,
    handleSubmit,
    control,
    errors,
    isSigmaSource,
    handleFormSubmit,
    handleOpenChange,
  } = useCorrelationCreateDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('createRuleTitle')}</DialogTitle>
          <DialogDescription>{t('createRuleDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-title">{t('fieldTitle')}</Label>
            <Input
              id="rule-title"
              {...register('title')}
              placeholder={t('fieldTitlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-destructive text-xs">{t('validationTitleMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-description">{t('fieldDescription')}</Label>
            <Textarea
              id="rule-description"
              {...register('description')}
              placeholder={t('fieldDescriptionPlaceholder')}
              aria-invalid={errors.description ? true : undefined}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-destructive text-xs">{t('validationDescriptionMin')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>{t('fieldSource')}</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fieldSourcePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RuleSource).map(src => (
                        <SelectItem key={src} value={src}>
                          {t(
                            `source${src.charAt(0).toUpperCase()}${src.slice(1).replace('_generated', 'Generated').replace('_', '')}` as 'sourceSigma'
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
                      {Object.values(RuleSeverity).map(sev => (
                        <SelectItem key={sev} value={sev}>
                          {t(
                            `severity${sev.charAt(0).toUpperCase()}${sev.slice(1)}` as 'severityCritical'
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('fieldStatus')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fieldStatusPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RuleStatus).map(st => (
                        <SelectItem key={st} value={st}>
                          {t(`status${st.charAt(0).toUpperCase()}${st.slice(1)}` as 'statusActive')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-mitre">{t('fieldMitreTechniques')}</Label>
            <Input
              id="rule-mitre"
              {...register('mitreTechniques')}
              placeholder={t('fieldMitrePlaceholder')}
            />
            <p className="text-muted-foreground text-xs">{t('fieldMitreHint')}</p>
          </div>

          {isSigmaSource ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-yaml">{t('fieldYamlContent')}</Label>
              <Textarea
                id="rule-yaml"
                {...register('yamlContent')}
                placeholder={t('fieldYamlPlaceholder')}
                className="min-h-[200px] resize-none font-mono text-sm"
                aria-invalid={errors.yamlContent ? true : undefined}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-conditions">{t('fieldConditions')}</Label>
              <Textarea
                id="rule-conditions"
                {...register('conditions')}
                placeholder={t('fieldConditionsPlaceholder')}
                className="min-h-[200px] resize-none font-mono text-sm"
                aria-invalid={errors.conditions ? true : undefined}
              />
              <p className="text-muted-foreground text-xs">{t('fieldConditionsHint')}</p>
            </div>
          )}

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
              {loading ? t('creating') : t('submitCreate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
