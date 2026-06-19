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
import { useCorrelationEditDialog } from '@/hooks'
import type { CorrelationEditDialogProps } from '@/types'

export function CorrelationEditDialog({
  open,
  onOpenChange,
  onSubmit,
  rule,
  loading = false,
}: CorrelationEditDialogProps) {
  const {
    t,
    register,
    handleSubmit,
    control,
    errors,
    isSigmaSource,
    handleFormSubmit,
    handleOpenChange,
  } = useCorrelationEditDialog({ open, onOpenChange, onSubmit, rule })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editRuleTitle')}</DialogTitle>
          <DialogDescription>
            {rule?.ruleNumber
              ? `${t('editRuleDescription')} (${rule.ruleNumber})`
              : t('editRuleDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-rule-title">{t('fieldTitle')}</Label>
            <Input
              id="edit-rule-title"
              {...register('title')}
              placeholder={t('fieldTitlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-destructive text-xs">{t('validationTitleMin')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-rule-description">{t('fieldDescription')}</Label>
            <Textarea
              id="edit-rule-description"
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
            <Label htmlFor="edit-rule-mitre">{t('fieldMitreTechniques')}</Label>
            <Input
              id="edit-rule-mitre"
              {...register('mitreTechniques')}
              placeholder={t('fieldMitrePlaceholder')}
            />
            <p className="text-muted-foreground text-xs">{t('fieldMitreHint')}</p>
          </div>

          {isSigmaSource ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-rule-yaml">{t('fieldYamlContent')}</Label>
              <Textarea
                id="edit-rule-yaml"
                {...register('yamlContent')}
                placeholder={t('fieldYamlPlaceholder')}
                className="min-h-[200px] resize-none font-mono text-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-rule-conditions">{t('fieldConditions')}</Label>
              <Textarea
                id="edit-rule-conditions"
                {...register('conditions')}
                placeholder={t('fieldConditionsPlaceholder')}
                className="min-h-[200px] resize-none font-mono text-sm"
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
              {loading ? t('saving') : t('submitEdit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
