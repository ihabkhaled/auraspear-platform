'use client'

import { User, Eye, EyeOff, ChevronDown } from 'lucide-react'
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
import type { ProfileUpdateNameFormProps } from '@/types'

export function ProfileUpdateNameForm({
  name,
  namePassword,
  showNamePassword,
  canEditProfile,
  updateProfilePending,
  onNameChange,
  onNamePasswordChange,
  onToggleVisibility,
  onSubmit,
  t,
}: ProfileUpdateNameFormProps) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('updateName')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">{t('name')}</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={e => onNameChange(e.currentTarget.value)}
                  placeholder={t('namePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-name-password">{t('confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="profile-name-password"
                    type={showNamePassword ? 'text' : 'password'}
                    value={namePassword}
                    onChange={e => onNamePasswordChange(e.currentTarget.value)}
                    placeholder={t('confirmPasswordPlaceholder')}
                    className="pe-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={onToggleVisibility}
                    className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showNamePassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={!canEditProfile || updateProfilePending || !name.trim() || !namePassword}
              >
                {updateProfilePending ? t('updating') : t('updateName')}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
