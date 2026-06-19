import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { editTenantSchema } from '@/lib/validation/admin.schema'
import type { EditTenantDialogProps, EditTenantFormValues } from '@/types'

export function useEditTenantDialog({
  open,
  onOpenChange,
  tenant,
  onSubmit,
}: EditTenantDialogProps) {
  const t = useTranslations('admin')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditTenantFormValues>({
    resolver: zodResolver(editTenantSchema),
    defaultValues: {
      name: '',
    },
  })

  // Reset form when dialog opens (populate) or closes (covers programmatic close on success)
  useEffect(() => {
    if (open && tenant) {
      reset({ name: tenant.name })
    } else if (!open) {
      reset()
    }
  }, [open, tenant, reset])

  function handleFormSubmit(values: EditTenantFormValues) {
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
    handleFormSubmit,
    handleOpenChange,
  }
}
