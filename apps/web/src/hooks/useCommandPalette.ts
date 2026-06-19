'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BookOpen,
  Briefcase,
  Crosshair,
  Globe,
  LayoutDashboard,
  Search,
  Server,
  Settings,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { canAccessRouteByPermission, filterAccessibleItemsByRoute } from '@/lib/permissions'
import { useAuthStore, useUIStore } from '@/stores'
import type { CommandPaletteRouteItem } from '@/types'

export function useCommandPalette() {
  const t = useTranslations()
  const router = useRouter()
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const permissions = useAuthStore(s => s.permissions)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  function handleSelect(href: string) {
    setCommandPaletteOpen(false)
    if (!canAccessRouteByPermission(permissions, href)) {
      return
    }
    router.push(href)
  }

  const pages = filterAccessibleItemsByRoute<CommandPaletteRouteItem>(
    permissions,
    [
      { label: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
      { label: t('nav.alerts'), href: '/alerts', icon: Bell },
      { label: t('nav.hunt'), href: '/hunt', icon: Crosshair },
      { label: t('nav.cases'), href: '/cases', icon: Briefcase },
      { label: t('nav.intel'), href: '/intel', icon: Globe },
      { label: t('nav.tenantConfig'), href: '/admin/tenant', icon: Settings },
      { label: t('nav.systemAdmin'), href: '/admin/system', icon: Server },
      { label: t('nav.knowledge'), href: '/knowledge', icon: BookOpen },
    ],
    page => page.href
  )

  const actions = filterAccessibleItemsByRoute<CommandPaletteRouteItem>(
    permissions,
    [{ label: t('layout.searchAlerts'), href: '/alerts', icon: Search }],
    action => action.href
  )

  return {
    t,
    commandPaletteOpen,
    setCommandPaletteOpen,
    handleSelect,
    pages,
    actions,
  }
}
