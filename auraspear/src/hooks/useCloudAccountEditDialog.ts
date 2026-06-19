import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editCloudAccountSchema } from '@/lib/validation/cloud-security.schema'
import type { EditCloudAccountFormValues, UseCloudAccountEditDialogParams } from '@/types'

export function useCloudAccountEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseCloudAccountEditDialogParams) {
  const t = useTranslations('cloudSecurity')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditCloudAccountFormValues>({
    resolver: zodResolver(editCloudAccountSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditCloudAccountFormValues) => {
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
