import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editNormalizationSchema } from '@/lib/validation/normalization.schema'
import type { EditNormalizationFormValues, UseNormalizationEditDialogParams } from '@/types'

export function useNormalizationEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseNormalizationEditDialogParams) {
  const t = useTranslations('normalization')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditNormalizationFormValues>({
    resolver: zodResolver(editNormalizationSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditNormalizationFormValues) => {
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
