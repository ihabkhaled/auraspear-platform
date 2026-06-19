'use client'

import { Shield, KeyRound, Lock } from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useSecurityIndicators } from '@/hooks'
import { SECURITY_POSTURE } from '@/lib/constants/connectors.constants'
import { lookup } from '@/lib/utils'
import type { SecurityIndicatorsProps } from '@/types'

export function SecurityIndicators({ type }: SecurityIndicatorsProps) {
  const { t } = useSecurityIndicators()
  const posture = lookup(SECURITY_POSTURE, type)

  const indicators = [
    { label: t('mTLS'), enabled: posture.mTLS, icon: Shield },
    { label: t('iam'), enabled: posture.iam, icon: KeyRound },
    { label: t('encryption'), enabled: posture.encryption, icon: Lock },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t('securityPosture')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {indicators.map(ind => {
            const Icon = ind.icon
            return (
              <Badge
                key={ind.label}
                variant="outline"
                className={
                  ind.enabled
                    ? 'bg-status-success text-status-success'
                    : 'bg-muted text-muted-foreground'
                }
              >
                <Icon className="mr-1 h-3 w-3" />
                {ind.label}: {ind.enabled ? t('active') : t('notApplicable')}
              </Badge>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
