import { mapAlertToOcsfFinding } from '../../../common/ocsf'
import { toIso } from '../../../common/utils/date-time.utility'
import type { OcsfSecurityFinding } from '../../../common/ocsf'

/**
 * Maps Shuffle workflow status to a severity string.
 * Shuffle statuses: FINISHED, EXECUTING, ABORTED, WAITING, FAILED
 */
function getShuffleSeverity(status: string): string {
  const normalized = status.toUpperCase()
  switch (normalized) {
    case 'FAILED':
    case 'ABORTED':
      return 'high'
    case 'EXECUTING':
    case 'WAITING':
      return 'medium'
    case 'FINISHED':
      return 'low'
    default:
      return 'medium'
  }
}

/**
 * Maps a Shuffle SOAR workflow event to OCSF SecurityFinding format.
 *
 * Shuffle emits workflow execution events with fields like:
 * execution_id, workflow_id, workflow_name, status, started_at,
 * completed_at, execution_source, execution_argument, result,
 * action (app/action name), action_result.
 */
export function mapShuffleToOcsf(
  event: Record<string, unknown>,
  tenantId?: string
): OcsfSecurityFinding {
  const status = (event['status'] as string) ?? 'UNKNOWN'
  const workflowName = (event['workflow_name'] as string) ?? ''
  const actionName = (event['action'] as string) ?? ''

  const titleParts = ['Shuffle']
  if (workflowName) {
    titleParts.push(workflowName)
  }
  if (actionName) {
    titleParts.push(actionName)
  }
  const title = titleParts.length > 1 ? titleParts.join(': ') : 'Shuffle Workflow Event'

  const description =
    (event['result'] as string) ?? (event['execution_argument'] as string) ?? undefined

  return mapAlertToOcsfFinding({
    title,
    description,
    severity: getShuffleSeverity(status),
    timestamp: (event['started_at'] as string) ?? (event['completed_at'] as string) ?? toIso(),
    source: { product: 'Shuffle', vendor: 'Shuffle' },
    tenantId,
    eventId: (event['execution_id'] as string) ?? (event['workflow_id'] as string) ?? undefined,
    rawData: JSON.stringify(event),
    affectedAsset: (event['execution_source'] as string) ?? undefined,
  })
}
