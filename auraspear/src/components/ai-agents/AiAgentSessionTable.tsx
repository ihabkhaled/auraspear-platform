'use client'

import { Zap } from 'lucide-react'
import { DataTable, Pagination } from '@/components/common'
import { useAiAgentSessionTable } from '@/hooks'
import type { AiAgentSessionTableProps } from '@/types'
import { AiAgentSessionDetailDialog } from './AiAgentSessionDetailDialog'

export function AiAgentSessionTable(props: AiAgentSessionTableProps) {
  const { t, data, isFetching, columns, pagination, sessionDetail } = useAiAgentSessionTable(props)

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={data}
        loading={isFetching}
        emptyMessage={t('noSessions')}
        emptyIcon={<Zap className="h-5 w-5" />}
        emptyDescription={t('noSessionsDescription')}
        onRowClick={sessionDetail.handleSessionClick}
      />
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        total={pagination.total}
      />
      <AiAgentSessionDetailDialog
        session={sessionDetail.selectedSession}
        open={sessionDetail.open}
        onClose={sessionDetail.handleClose}
        t={sessionDetail.t}
        formattedDuration={sessionDetail.formattedDuration}
        formattedCost={sessionDetail.formattedCost}
        formattedTokens={sessionDetail.formattedTokens}
        formattedStartedAt={sessionDetail.formattedStartedAt}
        formattedCompletedAt={sessionDetail.formattedCompletedAt}
      />
    </div>
  )
}
