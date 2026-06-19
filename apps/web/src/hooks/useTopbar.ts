import { useTranslations } from 'next-intl'
import { useUIStore } from '@/stores'

export function useTopbar() {
  const t = useTranslations('layout')
  const { sidebarCollapsed, toggleSidebar, setMobileSidebarOpen, setCommandPaletteOpen } =
    useUIStore()

  return { t, sidebarCollapsed, toggleSidebar, setMobileSidebarOpen, setCommandPaletteOpen }
}
