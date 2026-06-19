import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { RuleSeverity, RuleSource, RuleStatus } from '@/enums'
import { createCorrelationSchema } from '@/lib/validation/correlation.schema'
import type { CorrelationCreateFormValues, UseCorrelationCreateDialogParams } from '@/types'

export function useCorrelationCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseCorrelationCreateDialogParams) {
  const t = useTranslations('correlation')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CorrelationCreateFormValues>({
    resolver: zodResolver(createCorrelationSchema),
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
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CorrelationCreateFormValues) => {
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
