'use client'

import { Brain, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Progress,
  ScrollArea,
  Separator,
} from '@/components/ui'
import { useAiInvestigationModal } from '@/hooks'
import { getConfidenceColor } from '@/lib/alert.utils'
import { cn } from '@/lib/utils'
import type { AIInvestigationModalProps } from '@/types'

export function AiInvestigationModal({
  investigation,
  open,
  onOpenChange,
}: AIInvestigationModalProps) {
  const { t } = useAiInvestigationModal()

  if (!investigation) {
    return null
  }

  const confidencePct = Math.round(investigation.confidence * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] border-primary/20 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="text-primary h-4 w-4" />
            {t('aiInvestigation')}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {t('confidence')}: {confidencePct}%
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pe-4">
            {/* Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('confidence')}
                </span>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    getConfidenceColor(investigation.confidence)
                  )}
                >
                  {confidencePct}%
                </span>
              </div>
              <Progress value={confidencePct} className="h-2" />
            </div>

            <Separator />

            {/* Reasoning steps */}
            {investigation.reasoning.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  {t('reasoning')}
                </h4>
                <ol className="space-y-1.5">
                  {investigation.reasoning.map((step, index) => (
                    <li
                      key={`step-${String(index)}`}
                      className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                      <CheckCircle className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <Separator />

            {/* Full investigation result */}
            <div className="space-y-2">
              <h4 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                {t('aiInvestigation')}
              </h4>
              <pre className="bg-muted/50 text-foreground rounded-lg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {investigation.result}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
