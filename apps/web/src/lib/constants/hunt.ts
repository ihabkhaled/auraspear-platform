import { CheckCircle2, Loader2, Circle, type LucideIcon } from 'lucide-react'
import { HuntStatus, ReasoningStepStatus } from '@/enums'

export const QUICK_PROMPT_KEYS = [
  'detectBruteForce',
  'findLateralMovement',
  'checkDataExfiltration',
  'suspiciousProcesses',
  'dnsTunneling',
  'privilegeEscalation',
  'unauthorizedRdp',
  'malwareC2',
  'webShellActivity',
  'credentialDumping',
  'unusualOutbound',
  'registryPersistence',
] as const

export const HUNT_STATUS_CONFIG = {
  [HuntStatus.IDLE]: {
    dotClass: 'bg-muted-foreground',
    labelKey: 'statusIdle',
    animate: false,
  },
  [HuntStatus.RUNNING]: {
    dotClass: 'bg-status-success',
    labelKey: 'statusRunning',
    animate: true,
  },
  [HuntStatus.COMPLETED]: {
    dotClass: 'bg-status-info',
    labelKey: 'statusCompleted',
    animate: false,
  },
  [HuntStatus.ERROR]: {
    dotClass: 'bg-status-error',
    labelKey: 'statusError',
    animate: false,
  },
} as const

export const REASONING_STEP_CONFIG_MAP = {
  [ReasoningStepStatus.COMPLETED]: {
    iconClass: 'text-status-success',
    textClass: 'text-foreground',
    animate: false,
  },
  [ReasoningStepStatus.IN_PROGRESS]: {
    iconClass: 'text-status-info',
    textClass: 'text-status-info',
    animate: true,
  },
  [ReasoningStepStatus.PENDING]: {
    iconClass: 'text-muted-foreground/50',
    textClass: 'text-muted-foreground',
    animate: false,
  },
  [ReasoningStepStatus.ERROR]: {
    iconClass: 'text-status-error',
    textClass: 'text-status-error',
    animate: false,
  },
} as const

export const STEP_ICONS: Record<ReasoningStepStatus, LucideIcon> = {
  [ReasoningStepStatus.COMPLETED]: CheckCircle2,
  [ReasoningStepStatus.IN_PROGRESS]: Loader2,
  [ReasoningStepStatus.PENDING]: Circle,
  [ReasoningStepStatus.ERROR]: Circle,
}
