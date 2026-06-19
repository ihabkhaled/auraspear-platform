import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CaseStatus } from '@/enums'
import type { Case } from '@/types'

export function useCaseKanbanBoard(cases: Case[]) {
  const t = useTranslations('cases')
  const groupedCases = useMemo(() => {
    const groups: Record<CaseStatus, Case[]> = {
      [CaseStatus.OPEN]: [],
      [CaseStatus.IN_PROGRESS]: [],
      [CaseStatus.CLOSED]: [],
    }

    for (const c of cases) {
      const group = groups[c.status]
      if (group) {
        group.push(c)
      }
    }

    return groups
  }, [cases])

  return { t, groupedCases }
}
