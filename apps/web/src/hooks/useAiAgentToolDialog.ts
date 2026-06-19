import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { AI_AGENT_TOOL_DEFAULT_VALUES } from '@/lib/constants/ai-agents'
import { aiAgentToolSchema } from '@/lib/validation/ai-agents.schema'
import type { AiAgentToolFormValues, UseAiAgentToolDialogParams } from '@/types'

export function useAiAgentToolDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseAiAgentToolDialogParams) {
  const t = useTranslations('aiAgents')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AiAgentToolFormValues>({
    resolver: zodResolver(aiAgentToolSchema),
    defaultValues: initialValues ?? AI_AGENT_TOOL_DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      reset(initialValues ?? AI_AGENT_TOOL_DEFAULT_VALUES)
    } else {
      reset(AI_AGENT_TOOL_DEFAULT_VALUES)
    }
  }, [open, initialValues, reset])

  const isEditing = initialValues !== undefined

  const handleFormSubmit = (data: AiAgentToolFormValues) => {
    onSubmit(data)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(AI_AGENT_TOOL_DEFAULT_VALUES)
    }
    onOpenChange(nextOpen)
  }

  return {
    t,
    register,
    handleSubmit,
    errors,
    isEditing,
    handleFormSubmit,
    handleOpenChange,
  }
}
