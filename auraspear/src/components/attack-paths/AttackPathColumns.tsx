'use client'

import type { AttackPathSeverity, AttackPathStatus } from '@/enums'
import {
  ATTACK_PATH_SEVERITY_LABEL_KEYS,
  ATTACK_PATH_SEVERITY_CLASSES,
  ATTACK_PATH_STATUS_LABEL_KEYS,
  ATTACK_PATH_STATUS_CLASSES,
} from '@/lib/constants/attack-paths'
import { formatDate, lookup } from '@/lib/utils'
import type { AttackPath, AttackPathColumnTranslations, Column } from '@/types'

export function getAttackPathColumns(t: AttackPathColumnTranslations): Column<AttackPath>[] {
  return [
    {
      key: 'pathNumber',
      label: t.attackPath('colPathId'),
      className: 'w-24',
      render: (value: unknown) => (
        <span className="font-mono text-xs font-medium">{String(value ?? '')}</span>
      ),
    },
    {
      key: 'title',
      label: t.attackPath('colTitle'),
      sortable: true,
      render: (value: unknown) => <span className="font-medium">{String(value ?? '')}</span>,
    },
    {
      key: 'severity',
      label: t.attackPath('colSeverity'),
      className: 'w-24',
      render: (value: unknown) => {
        const severity = value as AttackPathSeverity
        const labelKey = lookup(ATTACK_PATH_SEVERITY_LABEL_KEYS, severity)
        const className = lookup(ATTACK_PATH_SEVERITY_CLASSES, severity)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.attackPath(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: t.attackPath('colStatus'),
      className: 'w-28',
      render: (value: unknown) => {
        const status = value as AttackPathStatus
        const labelKey = lookup(ATTACK_PATH_STATUS_LABEL_KEYS, status)
        const className = lookup(ATTACK_PATH_STATUS_CLASSES, status)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
          >
            {labelKey ? t.attackPath(labelKey) : String(value ?? '')}
          </span>
        )
      },
    },
    {
      key: 'affectedAssets',
      label: t.attackPath('colAffectedAssets'),
      sortable: true,
      className: 'w-28 text-center',
      render: (value: unknown) => <span className="text-sm font-medium">{String(value ?? 0)}</span>,
    },
    {
      key: 'killChainCoverage',
      label: t.attackPath('colKillChain'),
      sortable: true,
      className: 'w-28',
      render: (value: unknown) => {
        const pct = Number(value ?? 0)
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted h-1.5 w-16 rounded-full">
              <div className="bg-status-warning h-1.5 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs">{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'mitreTechniques',
      label: t.attackPath('colMitre'),
      className: 'w-36',
      render: (value: unknown) => {
        const techniques = value as string[]
        if (!Array.isArray(techniques) || techniques.length === 0) {
          return <span className="text-muted-foreground text-xs">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {techniques.slice(0, 2).map(tech => (
              <span key={tech} className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                {tech}
              </span>
            ))}
            {techniques.length > 2 && (
              <span className="text-muted-foreground text-xs">+{techniques.length - 2}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'detectedAt',
      label: t.attackPath('colDetected'),
      sortable: true,
      className: 'w-32',
      render: (value: unknown) => (
        <span className="text-muted-foreground text-xs">
          {value ? formatDate(String(value)) : '-'}
        </span>
      ),
    },
  ]
}
