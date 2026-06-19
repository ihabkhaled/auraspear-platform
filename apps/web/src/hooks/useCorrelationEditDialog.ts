import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { RuleSeverity, RuleSource, RuleStatus } from '@/enums'
import { editCorrelationSchema } from '@/lib/validation/correlation.schema'
import type { CorrelationEditFormValues, UseCorrelationEditDialogParams } from '@/types'

export function useCorrelationEditDialog({
  open,
  onOpenChange,
  onSubmit,
  rule,
}: UseCorrelationEditDialogParams) {
  const t = useTranslations('correlation')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CorrelationEditFormValues>({
    resolver: zodResolver(editCorrelationSchema),
    defaultValues: {
      title: '',
      description: '',
      source: RuleSource.CUSTOM,
      severity: RuleSeverity.MEDIUM,
      status: RuleStatus.REVIEW,
      mitreTechniques: '',
      yamlContent: '',
      conditions: '',
    },
  })

  const selectedSource = useWatch({ control, name: 'source' })
  const isSigmaSource = selectedSource === RuleSource.SIGMA

  useEffect(() => {
    if (open && rule) {
      reset({
        title: rule.title,
        description: rule.description ?? '',
        source: rule.source,
        severity: rule.severity,
        status: rule.status,
        mitreTechniques: rule.mitreTechniques.join(', '),
        yamlContent: rule.yamlContent ?? '',
        conditions: rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '',
      })
    }
    if (!open) {
      reset()
    }
  }, [open, rule, reset])

  const handleFormSubmit = (data: CorrelationEditFormValues) => {
    onSubmit(data)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  return {
    t,
    register,
    handleSubmit,
    control,
    errors,
    isSigmaSource,
    handleFormSubmit,
    handleOpenChange,
  }
}
