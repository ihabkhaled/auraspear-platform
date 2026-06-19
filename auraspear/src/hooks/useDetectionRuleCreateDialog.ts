import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { DetectionRuleSeverity, DetectionRuleType } from '@/enums'
import { createDetectionRuleSchema } from '@/lib/validation/detection-rules.schema'
import type { CreateDetectionRuleFormValues, UseDetectionRuleCreateDialogParams } from '@/types'

export function useDetectionRuleCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseDetectionRuleCreateDialogParams) {
  const t = useTranslations('detectionRules')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateDetectionRuleFormValues>({
    resolver: zodResolver(createDetectionRuleSchema),
    defaultValues: {
      name: '',
      ruleType: DetectionRuleType.THRESHOLD,
      severity: DetectionRuleSeverity.MEDIUM,
      conditions: '{}',
      actions: '{}',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateDetectionRuleFormValues) => {
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
    handleFormSubmit,
    handleOpenChange,
  }
}
