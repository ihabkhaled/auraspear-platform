'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { useCaseOwnerFilter } from '@/hooks'
import { getAvatarColor, getInitials } from '@/lib/case.utils'
import { cn } from '@/lib/utils'
import type { CaseOwnerFilterProps } from '@/types'

export function CaseOwnerFilter({
  members,
  selectedUserId,
  onUserSelect,
  currentUserId,
}: CaseOwnerFilterProps) {
  const { t } = useCaseOwnerFilter()

  const handleClick = (memberId: string) => {
    if (selectedUserId === memberId) {
      onUserSelect()
    } else {
      onUserSelect(memberId)
    }
  }

  if (members.length === 0) {
    return null
  }

  // Sort: current user first, then alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1
    if (b.id === currentUserId) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">{t('filterByOwner')}:</span>
        <div className="flex -space-x-1.5">
          {sortedMembers.map((member, index) => {
            const isSelected = selectedUserId === member.id
            const isCurrentUser = member.id === currentUserId
            const initials = getInitials(member.name)
            const colorClass = getAvatarColor(index)

            return (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleClick(member.id)}
                    className={cn(
                      'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-semibold text-white transition-all',
                      colorClass,
                      isSelected
                        ? 'border-foreground ring-foreground/30 z-10 scale-110 ring-2'
                        : 'border-background hover:z-10 hover:scale-110',
                      isCurrentUser && !isSelected && 'ring-foreground/20 ring-1'
                    )}
                  >
                    {initials}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-muted-foreground">{member.email}</p>
                  {isCurrentUser && <p className="text-muted-foreground italic">({t('you')})</p>}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        {selectedUserId && (
          <button
            type="button"
            onClick={() => onUserSelect()}
            className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>
    </TooltipProvider>
  )
}
