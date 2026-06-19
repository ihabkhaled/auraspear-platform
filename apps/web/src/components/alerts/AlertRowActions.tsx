'use client'

import { MoreHorizontal, Eye, Brain, Briefcase, Copy } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useAlertRowActions } from '@/hooks'
import type { AlertRowActionsProps } from '@/types'

export function AlertRowActions({
  alert,
  onView,
  onInvestigate,
  onCreateCase,
  onCopyId,
}: AlertRowActionsProps) {
  const { t, tCommon } = useAlertRowActions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{tCommon('actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(alert)}>
          <Eye className="h-4 w-4" />
          {tCommon('view')}
        </DropdownMenuItem>
        {onInvestigate && (
          <DropdownMenuItem className="cursor-pointer" onClick={() => onInvestigate(alert)}>
            <Brain className="h-4 w-4" />
            {t('investigate')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer" onClick={() => onCreateCase?.(alert)}>
          <Briefcase className="h-4 w-4" />
          {t('createCase')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => onCopyId?.(alert.id)}>
          <Copy className="h-4 w-4" />
          {tCommon('copyId')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
