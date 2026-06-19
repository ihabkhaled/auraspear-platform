'use client'

import { ChevronDown } from 'lucide-react'
import { AiFindingsPanel } from '@/components/common'
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import { useCloudAccountDetailPanel } from '@/hooks'
import {
  CLOUD_ACCOUNT_STATUS_CLASSES,
  CLOUD_ACCOUNT_STATUS_LABEL_KEYS,
  CLOUD_FINDING_SEVERITY_CLASSES,
  CLOUD_FINDING_SEVERITY_LABEL_KEYS,
  CLOUD_FINDING_STATUS_CLASSES,
  CLOUD_FINDING_STATUS_LABEL_KEYS,
  CLOUD_PROVIDER_LABEL_KEYS,
} from '@/lib/constants/cloud-security'
import { cn, formatTimestamp, lookup } from '@/lib/utils'
import type { CloudAccountDetailPanelProps } from '@/types'

export function CloudAccountDetailPanel({
  account,
  findings,
  open,
  onOpenChange,
}: CloudAccountDetailPanelProps) {
  const { t, tCommon, hasData, findingsOpen, setFindingsOpen, complianceScoreClass } =
    useCloudAccountDetailPanel({ account })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('accountDetailTitle')}</SheetTitle>
          <SheetDescription>{t('accountDetailDescription')}</SheetDescription>
        </SheetHeader>

        {hasData && account && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldAlias')}</span>
                <span className="text-foreground text-sm font-medium">{account.alias ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldProvider')}</span>
                <Badge variant="secondary">
                  {t(lookup(CLOUD_PROVIDER_LABEL_KEYS, account.provider))}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('fieldAccountId')}</span>
                <span className="text-foreground font-mono text-sm">{account.accountId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{tCommon('status')}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    lookup(CLOUD_ACCOUNT_STATUS_CLASSES, account.status)
                  )}
                >
                  {t(lookup(CLOUD_ACCOUNT_STATUS_LABEL_KEYS, account.status))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnFindings')}</span>
                <span className="text-foreground text-sm font-medium">{account.findingsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('columnComplianceScore')}</span>
                <span className={cn('text-sm font-medium', complianceScoreClass)}>
                  {`${account.complianceScore}%`}
                </span>
              </div>
              {account.region && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('fieldRegion')}</span>
                  <Badge variant="outline">{account.region}</Badge>
                </div>
              )}
              {account.lastScanAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">{t('columnLastScan')}</span>
                  <span className="text-foreground text-sm">
                    {formatTimestamp(account.lastScanAt)}
                  </span>
                </div>
              )}
            </div>

            {findings.length > 0 && (
              <Collapsible open={findingsOpen} onOpenChange={setFindingsOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t('findingsTitle')} ({findings.length})
                  </h3>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground h-4 w-4 transition-transform',
                      findingsOpen && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2">
                    {findings.map(finding => (
                      <div key={finding.id} className="bg-muted space-y-2 rounded-md p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-foreground text-sm font-medium">
                            {finding.title}
                          </span>
                          <span
                            className={cn(
                              'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                              lookup(CLOUD_FINDING_SEVERITY_CLASSES, finding.severity)
                            )}
                          >
                            {t(lookup(CLOUD_FINDING_SEVERITY_LABEL_KEYS, finding.severity))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">
                            {finding.resourceType}: {finding.resourceId}
                          </span>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              lookup(CLOUD_FINDING_STATUS_CLASSES, finding.status)
                            )}
                          >
                            {t(lookup(CLOUD_FINDING_STATUS_LABEL_KEYS, finding.status))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Separator />
            <AiFindingsPanel
              sourceModule="cloud_security"
              sourceEntityId={account.id}
              t={tCommon}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
