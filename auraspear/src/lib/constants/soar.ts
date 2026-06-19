import { SoarPlaybookStatus, SoarTriggerType, SoarExecutionStatus } from '@/enums'

export const SOAR_PLAYBOOK_STATUS_LABEL_KEYS: Record<SoarPlaybookStatus, string> = {
  [SoarPlaybookStatus.ACTIVE]: 'statusActive',
  [SoarPlaybookStatus.INACTIVE]: 'statusInactive',
  [SoarPlaybookStatus.DRAFT]: 'statusDraft',
}

export const SOAR_PLAYBOOK_STATUS_CLASSES: Record<SoarPlaybookStatus, string> = {
  [SoarPlaybookStatus.ACTIVE]: 'bg-status-success text-white',
  [SoarPlaybookStatus.INACTIVE]: 'bg-muted text-muted-foreground',
  [SoarPlaybookStatus.DRAFT]: 'bg-status-warning text-white',
}

export const SOAR_TRIGGER_TYPE_LABEL_KEYS: Record<SoarTriggerType, string> = {
  [SoarTriggerType.MANUAL]: 'triggerManual',
  [SoarTriggerType.ALERT]: 'triggerAlert',
  [SoarTriggerType.INCIDENT]: 'triggerIncident',
  [SoarTriggerType.SCHEDULED]: 'triggerScheduled',
}

export const SOAR_TRIGGER_TYPE_CLASSES: Record<SoarTriggerType, string> = {
  [SoarTriggerType.MANUAL]: 'bg-status-info text-white',
  [SoarTriggerType.ALERT]: 'bg-status-warning text-white',
  [SoarTriggerType.INCIDENT]: 'bg-status-error text-white',
  [SoarTriggerType.SCHEDULED]: 'bg-primary text-white',
}

export const SOAR_EXECUTION_STATUS_LABEL_KEYS: Record<SoarExecutionStatus, string> = {
  [SoarExecutionStatus.RUNNING]: 'executionRunning',
  [SoarExecutionStatus.COMPLETED]: 'executionCompleted',
  [SoarExecutionStatus.FAILED]: 'executionFailed',
  [SoarExecutionStatus.CANCELLED]: 'executionCancelled',
}

export const SOAR_EXECUTION_STATUS_CLASSES: Record<SoarExecutionStatus, string> = {
  [SoarExecutionStatus.RUNNING]: 'bg-primary text-white',
  [SoarExecutionStatus.COMPLETED]: 'bg-status-success text-white',
  [SoarExecutionStatus.FAILED]: 'bg-status-error text-white',
  [SoarExecutionStatus.CANCELLED]: 'bg-muted text-muted-foreground',
}
