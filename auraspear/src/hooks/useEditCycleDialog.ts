import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import type { EditCycleFormValues, EditCycleHookParams } from '@/types'

export function useEditCycleDialog({ open, onOpenChange, onSubmit, cycle }: EditCycleHookParams) {
  const t = useTranslations('cases.cycles')

  const { register, handleSubmit, reset, formState } = useForm<EditCycleFormValues>({
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
    },
  })

  // Reset form when dialog opens (populate) or closes (covers programmatic close on success)
  useEffect(() => {
    if (cycle && open) {
      reset({
        name: cycle.name,
        description: cycle.description ?? '',
        startDate: cycle.startDate.split('T')[0] ?? '',
        endDate: cycle.endDate?.split('T')[0] ?? '',
      })
    } else if (!open) {
      reset()
    }
  }, [cycle, open, reset])

  const handleFormSubmit = (data: EditCycleFormValues) => {
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
    formState,
    handleFormSubmit,
    handleOpenChange,
  }
}
