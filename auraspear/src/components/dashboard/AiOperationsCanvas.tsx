'use client'

import type { AiOperationsCanvasProps } from '@/types'

export function AiOperationsCanvas({ automation, t }: AiOperationsCanvasProps) {
  const nodes = [
    {
      id: 'signal',
      x: 32,
      y: 32,
      title: t('canvasSignalIngest'),
      value: automation.healthyConnectors,
    },
    {
      id: 'agents',
      x: 252,
      y: 32,
      title: t('canvasAiAgents'),
      value: automation.onlineAgents,
    },
    {
      id: 'jobs',
      x: 32,
      y: 178,
      title: t('canvasJobs'),
      value: automation.runningJobs,
    },
    {
      id: 'backlog',
      x: 252,
      y: 178,
      title: t('canvasQueueBacklog'),
      value: automation.pendingJobs,
    },
  ]

  return (
    <div className="bg-muted/30 border-border overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{t('aiOrchestrationCanvas')}</p>
          <p className="text-muted-foreground text-xs">{t('aiOrchestrationCanvasDescription')}</p>
        </div>
        <div className="text-end">
          <p className="text-xs font-medium">{t('failedJobs')}</p>
          <p className="text-lg font-semibold">{automation.failedJobs}</p>
        </div>
      </div>

      <svg viewBox="0 0 480 300" className="h-[300px] w-full">
        <defs>
          <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--status-info)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <path
          d="M 170 72 C 210 72, 210 72, 252 72"
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 170 218 C 210 218, 210 218, 252 218"
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 110 118 C 110 148, 110 164, 110 178"
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 330 118 C 330 148, 330 164, 330 178"
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {nodes.map(node => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width="148"
              height="86"
              rx="18"
              fill="color-mix(in srgb, var(--card) 82%, transparent)"
              stroke="color-mix(in srgb, var(--border) 76%, transparent)"
            />
            <text x={node.x + 16} y={node.y + 26} fill="var(--muted-foreground)" fontSize="12">
              {node.title}
            </text>
            <text x={node.x + 16} y={node.y + 58} fill="var(--foreground)" fontSize="28">
              {node.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
