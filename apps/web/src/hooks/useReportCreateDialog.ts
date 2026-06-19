import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, type Resolver } from 'react-hook-form'
import { ReportType, ReportFormat } from '@/enums'
import { createReportSchema } from '@/lib/validation/reports.schema'
import type { CreateReportFormValues, UseReportCreateDialogParams } from '@/types'

export function useReportCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseReportCreateDialogParams) {
  const t = useTranslations('reports')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateReportFormValues>({
    resolver: zodResolver(createReportSchema) as unknown as Resolver<CreateReportFormValues>,
    defaultValues: {
      name: '',
      description: '',
      type: ReportType.EXECUTIVE,
      format: ReportFormat.PDF,
      parameters: '',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateReportFormValues) => {
    onSubmit(data)
  }

  const onFormSubmit = handleSubmit(handleFormSubmit)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
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
