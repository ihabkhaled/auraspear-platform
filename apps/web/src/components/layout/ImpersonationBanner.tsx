'use client'

import { EyeOff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { useImpersonationBanner } from '@/hooks'

export function ImpersonationBanner() {
  const { t, impersonator, user, ending, handleEndImpersonation } = useImpersonationBanner()

  if (!impersonator) {
    return null
  }

  return (
    <div className="bg-status-warning border-status-warning flex items-center justify-between gap-3 border-b px-3 py-1.5 md:px-4">
      <div className="flex items-center gap-2">
        <EyeOff className="text-status-warning h-4 w-4 shrink-0" />
        <p className="text-status-warning text-xs font-medium">
          {t('banner', { admin: impersonator.email, user: user?.email ?? '' })}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={handleEndImpersonation}
        disabled={ending}
      >
        <LogOut className="h-3 w-3" />
        {t('endSession')}
      </Button>
    </div>
  )
}
