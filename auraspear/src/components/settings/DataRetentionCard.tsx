'use client'

import { ChevronDown, Database } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useDataRetention } from '@/hooks'
import { RETENTION_FIELDS } from '@/lib/constants/settings'

export default function DataRetentionCard() {
  const {
    t,
    retentionConfig,
    retentionOptions,
    isPending,
    handleRetentionChange,
    getRetentionLabel,
  } = useDataRetention()

  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t('dataRetention')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5">
            {RETENTION_FIELDS.map(({ key, labelKey, descriptionKey }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`retention-${key}`}>{t(labelKey)}</Label>
                <p className="text-muted-foreground text-xs">{t(descriptionKey)}</p>
                <Select
                  value={Reflect.get(retentionConfig, key) as string}
                  onValueChange={(value: string) => handleRetentionChange(key, value)}
                  disabled={isPending}
                >
                  <SelectTrigger id={`retention-${key}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {retentionOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {getRetentionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
