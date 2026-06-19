import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'
import { generateSlug } from '@/lib/admin.utils'
import { createTenantSchema } from '@/lib/validation/admin.schema'
import type { CreateTenantDialogProps, CreateTenantFormValues } from '@/types'

export function useCreateTenantDialog({ open, onOpenChange, onSubmit }: CreateTenantDialogProps) {
  const t = useTranslations('admin')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  // Reset form when dialog closes (covers programmatic close on success)
  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const currentSlug = useWatch({ control, name: 'slug' })
  const currentName = useWatch({ control, name: 'name' })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nameVal = e.currentTarget.value
    setValue('name', nameVal)
    if (!currentSlug || currentSlug === generateSlug(currentName)) {
      setValue('slug', generateSlug(nameVal))
    }
  }

  function handleFormSubmit(values: CreateTenantFormValues) {
    onSubmit(values)
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      reset()
    }
    onOpenChange(value)
  }

  return {
    t,
    register,
    handleSubmit,
    errors,
    handleNameChange,
    handleFormSubmit,
    handleOpenChange,
  }
}
