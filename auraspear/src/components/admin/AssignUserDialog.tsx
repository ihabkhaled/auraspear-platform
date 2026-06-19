'use client'

import { Check, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { Controller } from 'react-hook-form'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useAssignUserDialog } from '@/hooks'
import type { AssignUserDialogProps } from '@/types'

export function AssignUserDialog(props: AssignUserDialogProps) {
  const { loading } = props
  const {
    t,
    showPassword,
    setShowPassword,
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
  } = useAssignUserDialog(props)

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.assignUser')}</DialogTitle>
          <DialogDescription>{t('users.assignUserDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-email">{t('users.userEmail')}</Label>
            <div className="relative">
              <Input
                id="assign-email"
                type="email"
                {...register('email', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmailInput(e.currentTarget.value),
                })}
                placeholder={t('users.userEmailPlaceholder')}
                className="pe-10"
              />
              {isCheckingEmail && (
                <div className="absolute end-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                </div>
              )}
              {userExists && !alreadyInTenant && (
                <div className="absolute end-3 top-1/2 -translate-y-1/2">
                  <Check className="text-status-success h-4 w-4" />
                </div>
              )}
            </div>
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}

            {userExists && !alreadyInTenant && emailCheck?.user && (
              <div className="bg-status-success border-status-success flex items-center gap-2 rounded-lg border p-2.5">
                <Check className="text-status-success h-3.5 w-3.5 shrink-0" />
                <p className="text-status-success text-xs font-medium">
                  {t('users.existingUserFound', { name: emailCheck.user.name })}
                </p>
              </div>
            )}

            {alreadyInTenant && (
              <div className="bg-status-warning border-status-warning flex items-center gap-2 rounded-lg border p-2.5">
                <AlertCircle className="text-status-warning h-3.5 w-3.5 shrink-0" />
                <p className="text-status-warning text-xs font-medium">
                  {t('users.userAlreadyInTenant')}
                </p>
              </div>
            )}

            {isNewUser && (
              <div className="bg-status-info border-status-info flex items-center gap-2 rounded-lg border p-2.5">
                <AlertCircle className="text-status-info h-3.5 w-3.5 shrink-0" />
                <p className="text-status-info text-xs font-medium">
                  {t('users.newUserWillBeCreated')}
                </p>
              </div>
            )}
          </div>

          {isNewUser && (
            <div className="space-y-2">
              <Label htmlFor="assign-name">{t('users.userName')}</Label>
              <Input
                id="assign-name"
                {...register('name')}
                placeholder={t('users.userNamePlaceholder')}
              />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
          )}

          {isNewUser && (
            <div className="space-y-2">
              <Label htmlFor="assign-password">{t('users.userPassword')}</Label>
              <div className="relative">
                <Input
                  id="assign-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder={t('users.userPasswordPlaceholder')}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="assign-role">{t('users.userRole')}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="assign-role" className="w-full">
                    <SelectValue placeholder={t('users.userRolePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-destructive text-sm">{errors.role.message}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || alreadyInTenant}>
              {loading ? t('users.assigning') : t('users.assignUser')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
