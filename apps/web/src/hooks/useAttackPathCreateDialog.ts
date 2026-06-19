import { useEffect, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { AttackPathSeverity } from '@/enums'
import { EMPTY_STAGE } from '@/lib/constants/attack-paths'
import { createAttackPathSchema } from '@/lib/validation/attack-paths.schema'
import type { CreateAttackPathFormValues, UseAttackPathCreateDialogParams } from '@/types'

export function useAttackPathCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: UseAttackPathCreateDialogParams) {
  const t = useTranslations('attackPath')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateAttackPathFormValues>({
    resolver: zodResolver(
      createAttackPathSchema
    ) as unknown as Resolver<CreateAttackPathFormValues>,
    defaultValues: {
      title: '',
      description: '',
      severity: AttackPathSeverity.MEDIUM,
      stages: [{ ...EMPTY_STAGE }],
      affectedAssets: 0,
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'stages',
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const handleFormSubmit = useCallback(
    (data: CreateAttackPathFormValues) => {
      onSubmit(data)
    },
    [onSubmit]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        reset()
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, reset]
  )

  const handleAddStage = useCallback(() => {
    append({ ...EMPTY_STAGE })
  }, [append])

  const handleRemoveStage = useCallback(
    (index: number) => {
      if (fields.length > 1) {
        remove(index)
      }
    },
    [fields.length, remove]
  )

  const handleMoveStageUp = useCallback(
    (index: number) => {
      if (index > 0) {
        move(index, index - 1)
      }
    },
    [move]
  )

  const handleMoveStageDown = useCallback(
    (index: number) => {
      if (index < fields.length - 1) {
        move(index, index + 1)
      }
    },
    [fields.length, move]
  )

  const onFormSubmit = handleSubmit(handleFormSubmit)

  return {
    t,
    register,
    control,
    errors,
    fields,
    onFormSubmit,
    handleOpenChange,
    handleAddStage,
    handleRemoveStage,
    handleMoveStageUp,
    handleMoveStageDown,
  }
}
