'use client'

import { PageHeader, LoadingSpinner } from '@/components/common'
import {
  ProfileChangePasswordForm,
  ProfilePersonalInfo,
  ProfileUpdateNameForm,
} from '@/components/profile'
import { useProfilePage } from '@/hooks'

export default function ProfilePage() {
  const {
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
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    toggleVisibility,
    displayEmail,
    displayTenant,
    roleLabelKey,
    updateProfilePending,
    changePasswordPending,
    handleUpdateName,
    handleChangePassword,
    canEditProfile,
    setShowNamePassword,
    setShowCurrentPassword,
    setShowNewPassword,
    setShowConfirmPassword,
  } = useProfilePage()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('title')} description={t('description')} />

      <ProfilePersonalInfo
        displayEmail={displayEmail}
        roleLabelKey={roleLabelKey}
        displayTenant={displayTenant}
        t={t}
        tRoles={tRoles}
      />

      <ProfileUpdateNameForm
        name={name}
        namePassword={namePassword}
        showNamePassword={showNamePassword}
        canEditProfile={canEditProfile}
        updateProfilePending={updateProfilePending}
        onNameChange={setName}
        onNamePasswordChange={setNamePassword}
        onToggleVisibility={toggleVisibility(setShowNamePassword)}
        onSubmit={handleUpdateName}
        t={t}
      />

      <ProfileChangePasswordForm
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        showCurrentPassword={showCurrentPassword}
        showNewPassword={showNewPassword}
        showConfirmPassword={showConfirmPassword}
        canEditProfile={canEditProfile}
        changePasswordPending={changePasswordPending}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onToggleCurrentVisibility={toggleVisibility(setShowCurrentPassword)}
        onToggleNewVisibility={toggleVisibility(setShowNewPassword)}
        onToggleConfirmVisibility={toggleVisibility(setShowConfirmPassword)}
        onSubmit={handleChangePassword}
        t={t}
      />
    </div>
  )
}
