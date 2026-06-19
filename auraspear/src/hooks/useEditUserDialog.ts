import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { UserRole } from '@/enums'
import { ROLE_OPTIONS } from '@/lib/roles'
import { editUserSchema } from '@/lib/validation/admin.schema'
import type { EditUserDialogProps, EditUserFormValues } from '@/types'

export function useEditUserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  callerRole,
}: EditUserDialogProps) {
  const t = useTranslations('admin')
  const [showPassword, setShowPassword] = useState(false)

  const availableRoles =
    callerRole === UserRole.GLOBAL_ADMIN
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter(option => option.value !== UserRole.GLOBAL_ADMIN)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      role: '',
      password: '',
    },
  })

  // Populate form when dialog opens with user data
  useEffect(() => {
    if (open && user) {
      reset({ name: user.name, role: user.role, password: '' })
    }
  }, [open, user, reset])

  function handleFormSubmit(values: EditUserFormValues) {
    const payload: { name: string; role: string; password?: string } = {
      name: values.name,
      role: values.role,
    }
    if (values.password && values.password.length > 0) {
      payload.password = values.password
    }
    setShowPassword(false)
    reset()
    onSubmit(payload)
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      reset()
      setShowPassword(false)
    }
    onOpenChange(value)
  }

  return {
    t,
    showPassword,
    setShowPassword,
    availableRoles,
    register,
    handleSubmit,
    control,
    errors,
    handleFormSubmit,
    handleOpenChange,
  }
}
