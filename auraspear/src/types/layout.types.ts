import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
}

export interface CommandPaletteRouteItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export interface SidebarHealthFooterProps {
  collapsed?: boolean
  healthPercent: number
  servicesOnline: number
  totalServices: number
  maxLatencyMs: number
}
