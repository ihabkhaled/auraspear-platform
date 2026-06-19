'use client'

import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { SidebarNavItemProps } from '@/types'

export function SidebarNavItem({
  icon: Icon,
  label,
  href,
  active,
  badge,
  collapsed,
  onClick,
}: SidebarNavItemProps) {
  const content = (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary border-l-2'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-primary text-primary-foreground ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}
