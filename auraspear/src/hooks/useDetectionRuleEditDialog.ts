import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editDetectionRuleSchema } from '@/lib/validation/detection-rules.schema'
import type { EditDetectionRuleFormValues, UseDetectionRuleEditDialogParams } from '@/types'

export function useDetectionRuleEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseDetectionRuleEditDialogParams) {
  const t = useTranslations('detectionRules')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditDetectionRuleFormValues>({
    resolver: zodResolver(editDetectionRuleSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditDetectionRuleFormValues) => {
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
