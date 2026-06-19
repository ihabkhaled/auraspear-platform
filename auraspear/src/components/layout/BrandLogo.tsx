'use client'

import { Shield } from 'lucide-react'
import { useBrandLogo } from '@/hooks'
import type { BrandLogoProps } from '@/types'

export function BrandLogo({ collapsed }: BrandLogoProps) {
  const { t } = useBrandLogo()

  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
        <Shield className="text-primary-foreground h-4.5 w-4.5" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-bold tracking-tight">AuraSpear</span>
          <span className="text-muted-foreground text-[10px] font-medium">{t('socPlatform')}</span>
        </div>
      )}
    </div>
  )
}
