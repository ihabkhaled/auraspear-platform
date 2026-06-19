import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { ROLE_LABEL_KEYS } from '@/lib/constants/roles'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { lookup } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import { useProfile, useUpdateProfile, useChangePassword } from './useProfile'

export function useProfilePage() {
  const t = useTranslations('profile')
  const tRoles = useTranslations('admin.roles')
  const tErrors = useTranslations('errors')

  const { user } = useAuthStore()
  const permissions = useAuthStore(s => s.permissions)

  const canEditProfile = hasPermission(permissions, Permission.PROFILE_UPDATE)
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const [name, setName] = useState('')
  const [namePassword, setNamePassword] = useState('')
  const [nameFormInitialized, setNameFormInitialized] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showNamePassword, setShowNamePassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const toggleVisibility = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => setter(prev => !prev),
    []
  )

  // Initialize name field once profile loads
  if (profile?.name && !nameFormInitialized) {
    setName(profile.name)
    setNameFormInitialized(true)
  }

  const displayEmail = profile?.email ?? user?.email ?? ''
  const displayRole = profile?.role ?? user?.role
  const displayTenant = profile?.tenantSlug ?? user?.tenantSlug ?? ''
  const roleLabelKey = displayRole ? lookup(ROLE_LABEL_KEYS, displayRole) : undefined

  function handleUpdateName(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    updateProfile.mutate(
      { name: name.trim(), currentPassword: namePassword },
      {
        onSuccess: () => {
          Toast.success(t('nameUpdated'))
          setNamePassword('')
        },
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      Toast.error(t('passwordMismatch'))
      return
    }

    changePassword.mutate(
      {
        currentPassword,
        newPassword,
        confirmPassword,
      },
      {
        onSuccess: () => {
          Toast.success(t('passwordChanged'))
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }

  return {
    t,
    tRoles,
    isLoading,
    name,
    setName,
    namePassword,
    setNamePassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNamePassword,
    setShowNamePassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    toggleVisibility,
    displayEmail,
    displayRole,
    displayTenant,
    roleLabelKey,
    updateProfilePending: updateProfile.isPending,
    changePasswordPending: changePassword.isPending,
    handleUpdateName,
    handleChangePassword,
    canEditProfile,
  }
}
