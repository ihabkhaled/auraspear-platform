import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editComplianceFrameworkSchema } from '@/lib/validation/compliance.schema'
import type { EditComplianceFrameworkFormValues, UseComplianceEditDialogParams } from '@/types'

export function useComplianceEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseComplianceEditDialogParams) {
  const t = useTranslations('compliance')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditComplianceFrameworkFormValues>({
    resolver: zodResolver(editComplianceFrameworkSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditComplianceFrameworkFormValues) => {
    onSubmit(data)
  }

  const onFormSubmit = handleSubmit(handleFormSubmit)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(initialValues)
    }
    onOpenChange(nextOpen)
  }

  return {
    t,
    register,
    control,
    errors,
    onFormSubmit,
    handleOpenChange,
  }
}
