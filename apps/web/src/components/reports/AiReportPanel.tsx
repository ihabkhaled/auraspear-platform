import { Bot, Loader2, Sparkles } from 'lucide-react'
import { AiConnectorSelect } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { AI_TIME_RANGE_LABEL_KEYS, AI_TIME_RANGE_OPTIONS } from '@/lib/constants/reports'
import type { AiReportPanelComponentProps } from '@/types'

export function AiReportPanel({
  t,
  report,
  selectedTimeRange,
  onTimeRangeChange,
  onGenerate,
  isLoading,
  tCommon,
}: AiReportPanelComponentProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <Bot className="h-4 w-4" />
            {t('aiExecutiveReport')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{tCommon('aiConnector')}</span>
            <AiConnectorSelect />
            <Select value={selectedTimeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_TIME_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>
                    {t(Reflect.get(AI_TIME_RANGE_LABEL_KEYS, option) as string)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onGenerate} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3.5 w-3.5" />
              )}
              {isLoading ? t('aiLoading') : t('aiGenerateReport')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {report ? (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {report.result}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-xs">
                {t('aiConfidence')}: {Math.round(report.confidence * 100)}%
              </span>
              {report.provider ? (
                <span className="text-muted-foreground text-xs">
                  {t('aiProvider')}: {report.provider}
                </span>
              ) : null}
              <span className="text-muted-foreground text-xs">{report.model}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">{t('aiReportHint')}</p>
        )}
      </CardContent>
    </Card>
  )
}
