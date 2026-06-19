import { mapAlertToOcsfFinding } from '../../../common/ocsf'
import { toIso } from '../../../common/utils/date-time.utility'
import type { OcsfSecurityFinding } from '../../../common/ocsf'

/**
 * Determines severity from Bedrock error code.
 * Returns undefined if no error code is present.
 */
function getSeverityFromErrorCode(errorCode: string | undefined): string | undefined {
  if (!errorCode) return undefined
  return errorCode === 'AccessDeniedException' ? 'high' : 'medium'
}

/**
 * Determines severity from Bedrock event name keywords.
 */
function getSeverityFromEventName(eventName: string): string {
  const lowered = eventName.toLowerCase()
  if (lowered.includes('delete') || lowered.includes('deregister')) return 'high'
  if (lowered.includes('create') || lowered.includes('update')) return 'medium'
  if (lowered.includes('invoke')) return 'low'
  return 'info'
}

/**
 * Determines severity from Bedrock event type and error status.
 * Bedrock audit events don't have a native severity — derive from context.
 */
function getBedrockSeverity(event: Record<string, unknown>): string {
  const errorSeverity = getSeverityFromErrorCode(event['errorCode'] as string | undefined)
  if (errorSeverity) return errorSeverity

  const eventName = (event['eventName'] as string) ?? ''
  return getSeverityFromEventName(eventName)
}

/**
 * Extracts the affected asset ARN from a Bedrock CloudTrail event.
 * Prefers the user ARN, falls back to the first resource ARN.
 */
function extractAffectedAsset(event: Record<string, unknown>): string | undefined {
  const userIdentity = (event['userIdentity'] as Record<string, unknown>) ?? {}
  const userArn = userIdentity['arn'] as string | undefined

  const resources = (event['resources'] as Array<Record<string, unknown>>) ?? []
  const firstResourceArn =
    resources.length > 0 ? (resources[0]?.['ARN'] as string | undefined) : undefined

  return userArn ?? firstResourceArn
}

/**
 * Maps an AWS Bedrock AI agent audit event to OCSF SecurityFinding format.
 */
export function mapBedrockToOcsf(
  event: Record<string, unknown>,
  tenantId?: string
): OcsfSecurityFinding {
  const eventName = (event['eventName'] as string) ?? ''
  const title = eventName ? `Bedrock: ${eventName}` : 'AWS Bedrock Audit Event'

  const errorMessage = event['errorMessage'] as string | undefined
  const errorCode = event['errorCode'] as string | undefined
  const description = errorMessage ? `${errorCode ?? 'Error'}: ${errorMessage}` : undefined

  return mapAlertToOcsfFinding({
    title,
    description,
    severity: getBedrockSeverity(event),
    timestamp: (event['eventTime'] as string) ?? toIso(),
    source: { product: 'Amazon Bedrock', vendor: 'Amazon Web Services' },
    tenantId,
    eventId: (event['requestID'] as string) ?? (event['eventID'] as string) ?? undefined,
    rawData: JSON.stringify(event),
    affectedAsset: extractAffectedAsset(event),
  })
}
