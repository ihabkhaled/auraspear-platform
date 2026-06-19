'use client'

import { formatRelativeTime } from '@/lib/utils'
import type { LlmConnectorRecord, LlmConnectorColumnTranslations, Column } from '@/types'

export function getLlmConnectorColumns(
  t: LlmConnectorColumnTranslations
): Column<LlmConnectorRecord>[] {
  return [
    {
      key: 'name',
      label: t.llmConnectors('colName'),
      render: (value: unknown, row: LlmConnectorRecord) => (
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${row.enabled ? 'bg-status-success' : 'bg-muted-foreground'}`}
          />
          <span className="font-medium">{String(value ?? '')}</span>
        </div>
      ),
    },
    {
      key: 'description',
      label: t.llmConnectors('colDescription'),
      className: 'max-w-[200px]',
      render: (value: unknown) => {
        const text = String(value ?? '')
        if (text.length === 0) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        const truncated = text.length > 50 ? `${text.slice(0, 50)}...` : text
        return (
          <span className="text-muted-foreground text-xs" title={text}>
            {truncated}
          </span>
        )
      },
    },
    {
      key: 'baseUrl',
      label: t.llmConnectors('colBaseUrl'),
      className: 'max-w-[200px]',
      render: (value: unknown) => {
        const url = String(value ?? '')
        const truncated = url.length > 40 ? `${url.slice(0, 40)}...` : url
        return (
          <span className="font-mono text-xs" title={url}>
            {truncated}
          </span>
        )
      },
    },
    {
      key: 'defaultModel',
      label: t.llmConnectors('colModel'),
      className: 'w-36',
      render: (value: unknown) => {
        const model = String(value ?? '')
        if (model.length === 0) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        return <span className="font-mono text-xs">{model}</span>
      },
    },
    {
      key: 'enabled',
      label: t.llmConnectors('colEnabled'),
      className: 'w-24',
      render: (value: unknown) => {
        const enabled = Boolean(value)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              enabled ? 'bg-status-success text-status-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            {enabled ? t.llmConnectors('statusEnabled') : t.llmConnectors('statusDisabled')}
          </span>
        )
      },
    },
    {
      key: 'lastTestOk',
      label: t.llmConnectors('colLastTest'),
      className: 'w-36',
      render: (value: unknown, row: LlmConnectorRecord) => {
        if (row.lastTestAt === null) {
          return (
            <span className="text-muted-foreground text-xs">
              {t.llmConnectors('testNotTested')}
            </span>
          )
        }
        const passed = Boolean(value)
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                passed
                  ? 'bg-status-success text-status-success'
                  : 'bg-status-error text-status-error'
              }`}
            >
              {passed ? t.llmConnectors('testPassed') : t.llmConnectors('testFailed')}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatRelativeTime(row.lastTestAt)}
            </span>
          </div>
        )
      },
    },
  ]
}
