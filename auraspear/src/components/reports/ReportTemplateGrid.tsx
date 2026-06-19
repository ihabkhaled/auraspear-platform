'use client'

import { FilePlus2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import {
  REPORT_FORMAT_LABEL_KEYS,
  REPORT_MODULE_LABEL_KEYS,
  REPORT_TEMPLATE_LABEL_KEYS,
  REPORT_TYPE_LABEL_KEYS,
} from '@/lib/constants/reports'
import { lookup } from '@/lib/utils'
import type { ReportTemplateGridProps } from '@/types'

export function ReportTemplateGrid({
  templates,
  loading,
  generatingTemplateKey,
  onGenerate,
  t,
}: ReportTemplateGridProps) {
  if (loading) {
    return <div className="text-muted-foreground text-sm">{t('templatesLoading')}</div>
  }

  if (templates.length === 0) {
    return <div className="text-muted-foreground text-sm">{t('templatesEmpty')}</div>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {templates.map(template => (
        <Card key={template.id} className="border-border/80">
          <CardHeader className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t(lookup(REPORT_MODULE_LABEL_KEYS, template.module))}
            </div>
            <CardTitle className="text-base">
              {t(lookup(REPORT_TEMPLATE_LABEL_KEYS, template.key))}
            </CardTitle>
            <CardDescription>
              {template.description ?? t('templateDescriptionFallback')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t('fieldType')}</p>
                <p>{t(lookup(REPORT_TYPE_LABEL_KEYS, template.type))}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t('fieldFormat')}</p>
                <p>{t(lookup(REPORT_FORMAT_LABEL_KEYS, template.defaultFormat))}</p>
              </div>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => onGenerate(template)}
              disabled={generatingTemplateKey === template.key}
            >
              <FilePlus2 className="h-4 w-4" />
              {generatingTemplateKey === template.key
                ? t('templateGenerating')
                : t('templateGenerate')}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
