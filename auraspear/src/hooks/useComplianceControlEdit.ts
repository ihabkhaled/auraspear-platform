import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, type Resolver } from 'react-hook-form'
import { editComplianceControlSchema } from '@/lib/validation/compliance.schema'
import type { EditComplianceControlFormValues, UseComplianceControlEditParams } from '@/types'

export function useComplianceControlEdit({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseComplianceControlEditParams) {
  const t = useTranslations('compliance')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditComplianceControlFormValues>({
    resolver: zodResolver(
      editComplianceControlSchema
    ) as unknown as Resolver<EditComplianceControlFormValues>,
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditComplianceControlFormValues) => {
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
