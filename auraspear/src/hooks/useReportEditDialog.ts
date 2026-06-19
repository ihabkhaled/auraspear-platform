import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, type Resolver } from 'react-hook-form'
import { editReportSchema } from '@/lib/validation/reports.schema'
import type { EditReportFormValues, UseReportEditDialogParams } from '@/types'

export function useReportEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseReportEditDialogParams) {
  const t = useTranslations('reports')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditReportFormValues>({
    resolver: zodResolver(editReportSchema) as unknown as Resolver<EditReportFormValues>,
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditReportFormValues) => {
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
