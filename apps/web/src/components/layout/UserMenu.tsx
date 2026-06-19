'use client'

import { User, Settings, LogOut } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useUserMenu } from '@/hooks'
import { LanguageSwitcher } from './LanguageSwitcher'
import { TenantSwitcher } from './TenantSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

export function UserMenu() {
  const { t, router, displayName, displayEmail, initials, handleLogout } = useUserMenu()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring flex cursor-pointer items-center gap-2 rounded-full outline-none focus-visible:ring-2"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-muted-foreground text-xs">{displayEmail}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Mobile-only: settings hidden from topbar on small screens */}
        <div className="space-y-2 p-2 md:hidden">
          <LanguageSwitcher />
          <TenantSwitcher />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{t('theme')}</span>
            <ThemeSwitcher />
          </div>
        </div>
        <DropdownMenuSeparator className="md:hidden" />

        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile')}>
          <User className="h-4 w-4" />
          {t('profile')}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
          <Settings className="h-4 w-4" />
          {t('settings')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
