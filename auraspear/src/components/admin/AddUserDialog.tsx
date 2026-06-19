'use client'

import { Eye, EyeOff } from 'lucide-react'
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
import { useAddUserDialog } from '@/hooks'
import type { AddUserDialogProps } from '@/types'

export function AddUserDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
  callerRole,
}: AddUserDialogProps) {
  const {
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
  } = useAddUserDialog({ onSubmit, onOpenChange, callerRole })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.addUser')}</DialogTitle>
          <DialogDescription>{t('users.addUserDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">{t('users.userName')}</Label>
            <Input
              id="user-name"
              {...register('name')}
              placeholder={t('users.userNamePlaceholder')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">{t('users.userEmail')}</Label>
            <Input
              id="user-email"
              type="email"
              {...register('email')}
              placeholder={t('users.userEmailPlaceholder')}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">{t('users.userPassword')}</Label>
            <div className="relative">
              <Input
                id="user-password"
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

          <div className="space-y-2">
            <Label htmlFor="user-role">{t('users.userRole')}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="user-role" className="w-full">
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
            <Button type="submit" disabled={loading}>
              {loading ? t('users.creating') : t('users.addUser')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
