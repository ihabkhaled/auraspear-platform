import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editCaseSchema } from '@/lib/validation/cases.schema'
import type { EditCaseFormValues, EditCaseHookParams } from '@/types'

export function useEditCaseDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: EditCaseHookParams) {
  const t = useTranslations('cases')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditCaseFormValues>({
    resolver: zodResolver(editCaseSchema),
    defaultValues: initialValues,
  })

  // Reset form when dialog opens (populate) or closes (covers programmatic close on success)
  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditCaseFormValues) => {
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
