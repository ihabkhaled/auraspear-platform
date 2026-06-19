import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { SoarTriggerType } from '@/enums'
import { createSoarPlaybookSchema } from '@/lib/validation/soar.schema'
import type { CreateSoarPlaybookFormValues, UseSoarCreateDialogParams } from '@/types'

export function useSoarCreateDialog({ open, onOpenChange, onSubmit }: UseSoarCreateDialogParams) {
  const t = useTranslations('soar')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSoarPlaybookFormValues>({
    resolver: zodResolver(
      createSoarPlaybookSchema
    ) as unknown as Resolver<CreateSoarPlaybookFormValues>,
    defaultValues: {
      name: '',
      description: '',
      triggerType: SoarTriggerType.MANUAL,
      steps: '',
      triggerConditions: '',
      cronExpression: '',
    },
  })

  const triggerType = useWatch({ control, name: 'triggerType' })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = (data: CreateSoarPlaybookFormValues) => {
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
    triggerType,
    onFormSubmit,
    handleOpenChange,
  }
}
