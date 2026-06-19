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
import { useEditUserDialog } from '@/hooks'
import type { EditUserDialogProps } from '@/types'

export function EditUserDialog(props: EditUserDialogProps) {
  const { loading, user } = props
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
  } = useEditUserDialog(props)

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('users.editUser')}</DialogTitle>
          <DialogDescription>{t('users.editUserDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">{t('users.userName')}</Label>
            <Input
              id="edit-user-name"
              {...register('name')}
              placeholder={t('users.userNamePlaceholder')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('users.email')}</Label>
            <p className="text-muted-foreground text-sm">{user?.email ?? ''}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-password">{t('users.userPassword')}</Label>
            <div className="relative">
              <Input
                id="edit-user-password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder={t('users.passwordPlaceholder')}
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
            <p className="text-muted-foreground text-xs">{t('users.passwordOptional')}</p>
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-role">{t('users.userRole')}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-user-role" className="w-full">
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
              {loading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
