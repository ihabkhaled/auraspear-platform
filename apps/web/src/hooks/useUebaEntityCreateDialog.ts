import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { UebaEntityType } from '@/enums'
import { createUebaEntitySchema } from '@/lib/validation/ueba.schema'
import type { CreateUebaEntityFormValues, UseUebaEntityCreateDialogParams } from '@/types'

export function useUebaEntityCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseUebaEntityCreateDialogParams) {
  const t = useTranslations('ueba')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUebaEntityFormValues>({
    resolver: zodResolver(createUebaEntitySchema),
    defaultValues: {
      entityName: '',
      entityType: UebaEntityType.USER,
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateUebaEntityFormValues) => {
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
