import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { editSoarPlaybookSchema } from '@/lib/validation/soar.schema'
import type { EditSoarPlaybookFormValues, UseSoarEditDialogParams } from '@/types'

export function useSoarEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseSoarEditDialogParams) {
  const t = useTranslations('soar')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditSoarPlaybookFormValues>({
    resolver: zodResolver(
      editSoarPlaybookSchema
    ) as unknown as Resolver<EditSoarPlaybookFormValues>,
    defaultValues: initialValues,
  })

  const triggerType = useWatch({ control, name: 'triggerType' })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditSoarPlaybookFormValues) => {
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
    triggerType,
    onFormSubmit,
    handleOpenChange,
  }
}
