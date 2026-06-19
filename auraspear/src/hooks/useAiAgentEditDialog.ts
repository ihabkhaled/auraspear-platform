import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editAiAgentSchema } from '@/lib/validation/ai-agents.schema'
import type { EditAiAgentFormValues, UseAiAgentEditDialogParams } from '@/types'

export function useAiAgentEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseAiAgentEditDialogParams) {
  const t = useTranslations('aiAgents')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditAiAgentFormValues>({
    resolver: zodResolver(editAiAgentSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = (data: EditAiAgentFormValues) => {
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
