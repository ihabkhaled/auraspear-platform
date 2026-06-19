'use client'

import { Menu, PanelLeftOpen, Search } from 'lucide-react'
import { Button, Separator } from '@/components/ui'
import { useTopbar } from '@/hooks'
import { LayoutBreadcrumb } from './Breadcrumb'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { TenantSwitcher } from './TenantSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'
import { UserMenu } from './UserMenu'

export function Topbar() {
  const { t, sidebarCollapsed, toggleSidebar, setMobileSidebarOpen, setCommandPaletteOpen } =
    useTopbar()

  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur-md md:gap-4 md:px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label={t('openSidebar')}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop: expand sidebar when collapsed */}
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label={t('expandSidebar')}
          className="hidden md:inline-flex"
        >
          <PanelLeftOpen className="text-muted-foreground h-4 w-4" />
        </Button>
      )}

      {/* Mobile: brand title */}
      <span className="text-sm font-semibold md:hidden">AuraSpear</span>

      {/* Desktop: breadcrumb */}
      <div className="hidden md:block">
        <LayoutBreadcrumb />
      </div>

      {/* Search (desktop: centered w-64, mobile: icon only) */}
      <div className="hidden flex-1 items-center justify-center md:flex">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground w-64 justify-start gap-2"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-start text-xs">{t('searchPlaceholder')}</span>
          <kbd className="border-border bg-muted text-muted-foreground pointer-events-none rounded border px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* Right cluster */}
      <div className="ms-auto flex items-center gap-1">
        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label={t('searchPlaceholder')}
          className="md:hidden"
        >
          <Search className="h-4 w-4" />
        </Button>

        <div className="hidden md:block">
          <LanguageSwitcher />
        </div>
        <div className="hidden md:block">
          <TenantSwitcher />
        </div>
        <div className="hidden md:block">
          <ThemeSwitcher />
        </div>
        <NotificationBell />
        <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
        <UserMenu />
      </div>
    </header>
  )
}
