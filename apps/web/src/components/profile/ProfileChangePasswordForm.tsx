'use client'

import { Lock, Eye, EyeOff, ChevronDown } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
} from '@/components/ui'
import type { ProfileChangePasswordFormProps } from '@/types'

export function ProfileChangePasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  canEditProfile,
  changePasswordPending,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleCurrentVisibility,
  onToggleNewVisibility,
  onToggleConfirmVisibility,
  onSubmit,
  t,
}: ProfileChangePasswordFormProps) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('changePassword')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('currentPassword')}</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => onCurrentPasswordChange(e.currentTarget.value)}
                    placeholder={t('currentPasswordPlaceholder')}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={onToggleCurrentVisibility}
                    className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => onNewPasswordChange(e.currentTarget.value)}
                    placeholder={t('newPasswordPlaceholder')}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={onToggleNewVisibility}
                    className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">{t('confirmNewPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => onConfirmPasswordChange(e.currentTarget.value)}
                    placeholder={t('confirmNewPasswordPlaceholder')}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={onToggleConfirmVisibility}
                    className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={
                  !canEditProfile ||
                  changePasswordPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {changePasswordPending ? t('changingPassword') : t('changePassword')}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
