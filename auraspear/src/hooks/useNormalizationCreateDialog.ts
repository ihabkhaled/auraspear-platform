import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { NormalizationSourceType } from '@/enums'
import { createNormalizationSchema } from '@/lib/validation/normalization.schema'
import type { CreateNormalizationFormValues, UseNormalizationCreateDialogParams } from '@/types'

export function useNormalizationCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseNormalizationCreateDialogParams) {
  const t = useTranslations('normalization')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateNormalizationFormValues>({
    resolver: zodResolver(createNormalizationSchema),
    defaultValues: {
      name: '',
      sourceType: NormalizationSourceType.SYSLOG,
      parserConfig: '{}',
      fieldMappings: '{}',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateNormalizationFormValues) => {
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
