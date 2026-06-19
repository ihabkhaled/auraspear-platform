import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editUebaEntitySchema } from '@/lib/validation/ueba.schema'
import type { EditUebaEntityFormValues, UseUebaEntityEditDialogParams } from '@/types'

export function useUebaEntityEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseUebaEntityEditDialogParams) {
  const t = useTranslations('ueba')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditUebaEntityFormValues>({
    resolver: zodResolver(editUebaEntitySchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditUebaEntityFormValues) => {
    onSubmit(data)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(initialValues)
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
