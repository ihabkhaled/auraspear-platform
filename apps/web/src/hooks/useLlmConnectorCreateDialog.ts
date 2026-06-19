import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, type Resolver } from 'react-hook-form'
import { createLlmConnectorSchema } from '@/lib/validation/llm-connector.schema'
import type { CreateLlmConnectorFormValues, UseLlmConnectorCreateDialogParams } from '@/types'

export function useLlmConnectorCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseLlmConnectorCreateDialogParams) {
  const t = useTranslations('llmConnectors')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateLlmConnectorFormValues>({
    resolver: zodResolver(createLlmConnectorSchema(t)) as Resolver<CreateLlmConnectorFormValues>,
    defaultValues: {
      name: '',
      description: '',
      baseUrl: '',
      apiKey: '',
      defaultModel: '',
      organizationId: '',
      maxTokensParam: 'max_tokens',
      timeout: 30000,
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const onFormSubmit = handleSubmit((data: CreateLlmConnectorFormValues) => {
    onSubmit(data)
  })

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
    onFormSubmit,
    handleOpenChange,
  }
}
