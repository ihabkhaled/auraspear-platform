'use client'

import { Network } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'
import {
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui'
import type { EntityGraphPanelProps } from '@/types'

export function EntityGraphPanel({
  open,
  onOpenChange,
  graphData,
  graphLoading,
  t,
}: EntityGraphPanelProps) {
  const graph = graphData?.data

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('graphTitle')}</SheetTitle>
          <SheetDescription>{t('graphDescription')}</SheetDescription>
        </SheetHeader>

        {graphLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!graphLoading && graph && graph.edges.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Network className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">{t('graphNoEdges')}</p>
          </div>
        )}

        {!graphLoading && graph && graph.edges.length > 0 && (
          <div className="space-y-3">
            {graph.edges.map(edge => {
              const fromNode = graph.nodes.find(n => n.id === edge.fromEntityId)
              const toNode = graph.nodes.find(n => n.id === edge.toEntityId)

              return (
                <div
                  key={edge.id}
                  className="border-border bg-muted/50 flex flex-col gap-1.5 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {fromNode?.value ?? edge.fromEntityId}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{edge.relationType}</span>
                    <Badge variant="outline" className="text-xs">
                      {toNode?.value ?? edge.toEntityId}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span>
                      {t('graphConfidence')}: {Math.round(edge.confidence * 100)}%
                    </span>
                    {edge.source && <span>{edge.source}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
