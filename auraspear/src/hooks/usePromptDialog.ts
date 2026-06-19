'use client'

import { useCallback, useMemo, useState } from 'react'
import { derivePromptState } from '@/lib/ai-config.utils'
import type { AiPromptTemplate, CreateAiPromptInput, UpdateAiPromptInput } from '@/types'

export function usePromptDialog(
  prompt: AiPromptTemplate | null,
  onSubmit: (data: CreateAiPromptInput | UpdateAiPromptInput) => void
) {
  const isEdit = Boolean(prompt)
  const derived = useMemo(() => derivePromptState(prompt), [prompt])

  const [taskType, setTaskType] = useState(derived.taskType)
  const [name, setName] = useState(derived.name)
  const [content, setContent] = useState(derived.content)

  const handleSubmit = useCallback(() => {
    if (isEdit) {
      const data: UpdateAiPromptInput = { name, content }
      onSubmit(data)
    } else {
      const data: CreateAiPromptInput = { taskType, name, content }
      onSubmit(data)
    }
  }, [isEdit, taskType, name, content, onSubmit])

  const canSubmit = name.trim().length > 0 && content.trim().length > 0

  return {
    isEdit,
    taskType,
    setTaskType,
    name,
    setName,
    content,
    setContent,
    handleSubmit,
    canSubmit,
  }
}
