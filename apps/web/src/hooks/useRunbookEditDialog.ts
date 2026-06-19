'use client'

import { useCallback, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editRunbookSchema } from '@/lib/validation/knowledge.schema'
import type { EditRunbookFormValues, UseRunbookEditDialogInput } from '@/types'

export function useRunbookEditDialog({
  open,
  onOpenChange,
  onSubmit,
  runbook,
}: UseRunbookEditDialogInput) {
  const t = useTranslations('knowledge')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditRunbookFormValues>({
    resolver: zodResolver(editRunbookSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      tags: '',
    },
  })

  useEffect(() => {
    if (open && runbook) {
      reset({
        title: runbook.title,
        content: runbook.content,
        category: runbook.category,
        tags: runbook.tags.join(', '),
      })
    }
  }, [open, runbook, reset])

  const onFormSubmit = handleSubmit(onSubmit)

  const handleOpenChange = useCallback(
    (value: boolean) => {
      onOpenChange(value)
    },
    [onOpenChange]
  )

  return { t, register, errors, onFormSubmit, handleOpenChange }
}
