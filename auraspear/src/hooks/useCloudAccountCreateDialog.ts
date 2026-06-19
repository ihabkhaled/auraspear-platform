import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { CloudProvider } from '@/enums'
import { createCloudAccountSchema } from '@/lib/validation/cloud-security.schema'
import type { CreateCloudAccountFormValues, UseCloudAccountCreateDialogParams } from '@/types'

export function useCloudAccountCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseCloudAccountCreateDialogParams) {
  const t = useTranslations('cloudSecurity')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateCloudAccountFormValues>({
    resolver: zodResolver(createCloudAccountSchema),
    defaultValues: {
      provider: CloudProvider.AWS,
      accountId: '',
      alias: '',
      region: '',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateCloudAccountFormValues) => {
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
