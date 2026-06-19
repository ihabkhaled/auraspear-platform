'use client'

import { useCallback, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { createRunbookSchema } from '@/lib/validation/knowledge.schema'
import type { CreateRunbookFormValues, UseRunbookCreateDialogInput } from '@/types'

export function useRunbookCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseRunbookCreateDialogInput) {
  const t = useTranslations('knowledge')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRunbookFormValues>({
    resolver: zodResolver(createRunbookSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'general',
      tags: '',
    },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const onFormSubmit = handleSubmit(onSubmit)

  const handleOpenChange = useCallback(
    (value: boolean) => {
      onOpenChange(value)
    },
    [onOpenChange]
  )

  return { t, register, errors, onFormSubmit, handleOpenChange }
}
