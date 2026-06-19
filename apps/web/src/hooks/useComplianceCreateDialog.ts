import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { ComplianceStandard } from '@/enums'
import { createComplianceFrameworkSchema } from '@/lib/validation/compliance.schema'
import type { CreateComplianceFrameworkFormValues, UseComplianceCreateDialogParams } from '@/types'

export function useComplianceCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseComplianceCreateDialogParams) {
  const t = useTranslations('compliance')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateComplianceFrameworkFormValues>({
    resolver: zodResolver(createComplianceFrameworkSchema),
    defaultValues: {
      name: '',
      standard: ComplianceStandard.ISO_27001,
      version: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateComplianceFrameworkFormValues) => {
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
