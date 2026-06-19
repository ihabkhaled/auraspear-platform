import { useEffect, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { EMPTY_STAGE } from '@/lib/constants/attack-paths'
import { editAttackPathSchema } from '@/lib/validation/attack-paths.schema'
import type { EditAttackPathFormValues, UseAttackPathEditDialogParams } from '@/types'

export function useAttackPathEditDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: UseAttackPathEditDialogParams) {
  const t = useTranslations('attackPath')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditAttackPathFormValues>({
    resolver: zodResolver(editAttackPathSchema) as unknown as Resolver<EditAttackPathFormValues>,
    defaultValues: {
      ...initialValues,
      affectedAssets: initialValues.affectedAssets ?? 0,
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'stages',
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    } else {
      reset()
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = useCallback(
    (data: EditAttackPathFormValues) => {
      onSubmit(data)
    },
    [onSubmit]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        reset(initialValues)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, reset, initialValues]
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
