import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { resolveTimelineDescription } from '@/lib/case.utils'

export function useCaseTimeline() {
  const t = useTranslations('cases')
  const tTimeline = useTranslations('cases.timeline')
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => {
    setExpanded(prev => !prev)
  }

  const resolveDescription = useCallback(
    (description: string): string => resolveTimelineDescription(description, tTimeline),
    [tTimeline]
  )

  return { t, expanded, toggleExpanded, resolveDescription }
}
