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
import { DetectionRuleSeverity, DetectionRuleType } from '@/enums'
import { useDetectionRuleCreateDialog } from '@/hooks'
import {
  DETECTION_RULE_SEVERITY_LABEL_KEYS,
  DETECTION_RULE_TYPE_LABEL_KEYS,
} from '@/lib/constants/detection-rules'
import { lookup } from '@/lib/utils'
import type { DetectionRuleCreateDialogProps } from '@/types'

export function DetectionRuleCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: DetectionRuleCreateDialogProps) {
  const { t, register, handleSubmit, control, errors, handleFormSubmit, handleOpenChange } =
    useDetectionRuleCreateDialog({ open, onOpenChange, onSubmit })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[95vw] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('createRule')}</DialogTitle>
          <DialogDescription>{t('createRuleDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-name">{t('fieldRuleName')}</Label>
            <Input
              id="rule-name"
              {...register('name')}
              placeholder={t('fieldRuleNamePlaceholder')}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-destructive text-xs">{t('validationName')}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t('fieldRuleType')}</Label>
              <Controller
                name="ruleType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fieldRuleTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(DetectionRuleType).map(rt => (
                        <SelectItem key={rt} value={rt}>
                          {t(lookup(DETECTION_RULE_TYPE_LABEL_KEYS, rt))}
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
                      {Object.values(DetectionRuleSeverity).map(sev => (
                        <SelectItem key={sev} value={sev}>
                          {t(lookup(DETECTION_RULE_SEVERITY_LABEL_KEYS, sev))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-conditions">{t('fieldConditions')}</Label>
            <Textarea
              id="rule-conditions"
              {...register('conditions')}
              placeholder={t('fieldConditionsPlaceholder')}
              aria-invalid={errors.conditions ? true : undefined}
              className="resize-none font-mono text-sm"
              rows={4}
            />
            {errors.conditions && (
              <p className="text-destructive text-xs">{t('validationConditions')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-actions">{t('fieldActions')}</Label>
            <Textarea
              id="rule-actions"
              {...register('actions')}
              placeholder={t('fieldActionsPlaceholder')}
              aria-invalid={errors.actions ? true : undefined}
              className="resize-none font-mono text-sm"
              rows={4}
            />
            {errors.actions && <p className="text-destructive text-xs">{t('validationActions')}</p>}
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
