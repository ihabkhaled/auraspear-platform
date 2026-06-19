import {
  MAX_MESSAGE_LENGTH,
  MAX_STACK_TRACE_LENGTH,
  MAX_METADATA_SIZE,
} from './app-logger.constants'
import { redactSensitiveFields } from '../utils/redaction.utility'
import type { AppLogContext } from './app-logger.types'
import type { Prisma } from '@prisma/client'

export function formatLogMessage(message: string, context: AppLogContext): string {
  const parts = [`${context.feature} => ${message}`]

  appendContextParts(parts, context)

  if (context.metadata && Object.keys(context.metadata).length > 0) {
    parts.push(`metadata=${JSON.stringify(context.metadata)}`)
  }
  return parts.join(' ')
}

function appendContextParts(parts: string[], context: AppLogContext): void {
  if (context.action) {
    parts.push(`action=${context.action}`)
  }
  if (context.outcome) {
    parts.push(`outcome=${context.outcome}`)
  }
  if (context.className) {
    parts.push(`class=${context.className}`)
  }
  if (context.functionName) {
    parts.push(`fn=${context.functionName}`)
  }
  if (context.actorEmail) {
    parts.push(`actorEmail=${context.actorEmail}`)
  }
  if (context.tenantId) {
    parts.push(`tenantId=${context.tenantId}`)
  }
  if (context.targetResource) {
    parts.push(`resource=${context.targetResource}`)
  }
  if (context.targetResourceId) {
    parts.push(`resourceId=${context.targetResourceId}`)
  }
  if (context.sourceType) {
    parts.push(`source=${context.sourceType}`)
  }
  if (context.requestId) {
    parts.push(`reqId=${context.requestId}`)
  }
  if (context.httpMethod && context.httpRoute) {
    parts.push(`${context.httpMethod} ${context.httpRoute}`)
  }
  if (context.httpStatusCode) {
    parts.push(`httpStatus=${context.httpStatusCode}`)
  }
  if (context.ipAddress) {
    parts.push(`ip=${context.ipAddress}`)
  }
}

export function buildPersistData(
  level: string,
  message: string,
  context: AppLogContext
): Prisma.ApplicationLogCreateInput {
  const finalMetadata = sanitizeMetadata(context.metadata)

  return {
    level,
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    feature: context.feature,
    action: context.action,
    ...buildPersistIdentityFields(context),
    ...buildPersistTargetFields(context),
    outcome: context.outcome ?? null,
    metadata: (finalMetadata as Prisma.InputJsonValue) ?? undefined,
    stackTrace: context.stackTrace
      ? context.stackTrace.slice(0, MAX_STACK_TRACE_LENGTH)
      : null,
    ...buildPersistHttpFields(context),
  }
}

function buildPersistIdentityFields(context: AppLogContext): Record<string, unknown> {
  return {
    functionName: context.functionName ?? null,
    className: context.className ?? null,
    tenantId: context.tenantId ?? null,
    actorUserId: context.actorUserId ?? null,
    actorEmail: context.actorEmail ?? null,
    requestId: context.requestId ?? null,
  }
}

function buildPersistTargetFields(context: AppLogContext): Record<string, unknown> {
  return {
    targetResource: context.targetResource ?? null,
    targetResourceId: context.targetResourceId ?? null,
  }
}

function buildPersistHttpFields(context: AppLogContext): Record<string, unknown> {
  return {
    httpMethod: context.httpMethod ?? null,
    httpRoute: context.httpRoute ?? null,
    httpStatusCode: context.httpStatusCode ?? null,
    sourceType: context.sourceType ?? null,
    ipAddress: context.ipAddress ?? null,
  }
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined
  }

  const sanitized = redactSensitiveFields(metadata)
  const serialized = JSON.stringify(sanitized)

  if (serialized.length > MAX_METADATA_SIZE) {
    return { _truncated: true, _reason: 'metadata exceeded size limit' }
  }

  return sanitized
}
