import { Bot, Loader2, Sparkles } from 'lucide-react'
import { AiConnectorSelect } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import type { AiDashboardInsightComponentProps } from '@/types'

export function AiDashboardInsight({
  t,
  dailySummary,
  isDailySummaryLoading,
  onGenerateSummary,
  tCommon,
}: AiDashboardInsightComponentProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <Bot className="h-4 w-4" />
            {t('aiInsight')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{tCommon('aiConnector')}</span>
            <AiConnectorSelect />
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateSummary}
              disabled={isDailySummaryLoading}
            >
              {isDailySummaryLoading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3.5 w-3.5" />
              )}
              {isDailySummaryLoading ? t('aiLoading') : t('aiGenerateSummary')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dailySummary ? (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {dailySummary.result}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-xs">
                {t('aiConfidence')}: {Math.round(dailySummary.confidence * 100)}%
              </span>
              {dailySummary.provider ? (
                <span className="text-muted-foreground text-xs">
                  {t('aiProvider')}: {dailySummary.provider}
                </span>
              ) : null}
              <span className="text-muted-foreground text-xs">{dailySummary.model}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t('aiDailySummaryHint')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
