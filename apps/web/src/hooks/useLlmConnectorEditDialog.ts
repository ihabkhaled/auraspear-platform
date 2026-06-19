import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, type Resolver } from 'react-hook-form'
import { updateLlmConnectorSchema } from '@/lib/validation/llm-connector.schema'
import type { EditLlmConnectorFormValues, UseLlmConnectorEditDialogParams } from '@/types'

export function useLlmConnectorEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseLlmConnectorEditDialogParams) {
  const t = useTranslations('llmConnectors')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditLlmConnectorFormValues>({
    resolver: zodResolver(updateLlmConnectorSchema(t)) as Resolver<EditLlmConnectorFormValues>,
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const onFormSubmit = handleSubmit((data: EditLlmConnectorFormValues) => {
    onSubmit(data)
  })

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
