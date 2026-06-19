import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { UserRole } from '@/enums'
import { useCheckEmail, useDebounce } from '@/hooks'
import { ROLE_OPTIONS } from '@/lib/roles'
import { assignUserSchema } from '@/lib/validation/admin.schema'
import type { AssignUserDialogProps, AssignUserFormValues, AssignUserInput } from '@/types'

export function useAssignUserDialog({
  open: _open,
  onOpenChange,
  onSubmit,
  tenantId,
  callerRole,
}: AssignUserDialogProps) {
  const t = useTranslations('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const debouncedEmail = useDebounce(emailInput, 400)

  const { data: checkResult, isFetching: isCheckingEmail } = useCheckEmail(tenantId, debouncedEmail)

  const emailCheck = checkResult?.data ?? null
  const userExists = emailCheck?.exists === true
  const alreadyInTenant = emailCheck?.alreadyInTenant === true
  const isNewUser = emailCheck !== null && !userExists

  const availableRoles =
    callerRole === UserRole.GLOBAL_ADMIN
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter(option => option.value !== UserRole.GLOBAL_ADMIN)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<AssignUserFormValues>({
    resolver: zodResolver(assignUserSchema),
    defaultValues: {
      email: '',
      role: '',
      name: '',
      password: '',
    },
  })

  // Pre-fill name when existing user is found
  useEffect(() => {
    if (userExists && emailCheck?.user) {
      setValue('name', emailCheck.user.name)
    } else if (isNewUser) {
      setValue('name', '')
    }
  }, [userExists, isNewUser, emailCheck?.user, setValue])

  function handleFormSubmit(values: AssignUserFormValues) {
    const data: AssignUserInput = {
      email: values.email,
      role: values.role,
    }

    if (isNewUser && values.name) {
      data.name = values.name
    }
    if (isNewUser && values.password) {
      data.password = values.password
    }

    setEmailInput('')
    setShowPassword(false)
    reset()
    onSubmit(data)
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      reset()
      setEmailInput('')
      setShowPassword(false)
    }
    onOpenChange(value)
  }

  return {
    t,
    showPassword,
    setShowPassword,
    emailInput,
    setEmailInput,
    isCheckingEmail,
    emailCheck,
    userExists,
    alreadyInTenant,
    isNewUser,
    availableRoles,
    register,
    handleSubmit,
    control,
    errors,
    handleFormSubmit,
    handleOpenChange,
  }
}
