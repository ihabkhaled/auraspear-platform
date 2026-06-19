import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { UserRole } from '@/enums'
import { ROLE_OPTIONS } from '@/lib/roles'
import type { AddUserFormValues, UseAddUserDialogParams } from '@/types'

export function useAddUserDialog({ onSubmit, onOpenChange, callerRole }: UseAddUserDialogParams) {
  const t = useTranslations('admin')
  const tValidation = useTranslations('errors.validation')
  const [showPassword, setShowPassword] = useState(false)

  const availableRoles =
    callerRole === UserRole.GLOBAL_ADMIN
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter(option => option.value !== UserRole.GLOBAL_ADMIN)

  const schema = z.object({
    name: z.string().min(1, tValidation('name.required')).max(255),
    email: z
      .string()
      .min(1, tValidation('email.required'))
      .email(tValidation('email.invalidEmail')),
    password: z.string().min(8, tValidation('newPassword.tooShort')).max(128),
    role: z.string().min(1, tValidation('role.required')),
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AddUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: '',
    },
  })

  function handleFormSubmit(values: AddUserFormValues) {
    setShowPassword(false)
    reset()
    onSubmit(values)
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
